// Session to Skill: build a reusable skill from two sessions that did the same job.
// Everything here is plain code. No model is called.

import type { Check } from "./verify.ts";

// ---- 1. Did the user do the same thing twice, and what changed between the two? ----

export type Segment = { kind: "text"; text: string } | { kind: "input"; name: string; a: string; b: string };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

// Longest common subsequence lengths, for aligning two word lists.
function lcs(a: string[], b: string[]): number[][] {
  const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  return t;
}

// Share of words the two prompts have in common, in order. 1 = word for word the same.
export function similarity(a: string, b: string): number {
  const x = words(a.toLowerCase());
  const y = words(b.toLowerCase());
  if (x.length + y.length === 0) return 0;
  return (2 * lcs(x, y)[0][0]) / (x.length + y.length);
}

const TRAIL = /[,.;:!?)]+$/;

// The shared words stay as fixed text. Each stretch that differs becomes an input,
// with the two sessions' values kept as examples.
export function template(a: string, b: string): Segment[] {
  const x = words(a);
  const y = words(b);
  const t = lcs(x, y);
  type Raw = { same: boolean; a: string[]; b: string[] };
  const raw: Raw[] = [];
  const push = (same: boolean, wa?: string, wb?: string) => {
    const last = raw[raw.length - 1];
    const r = last && last.same === same ? last : (raw.push({ same, a: [], b: [] }), raw[raw.length - 1]);
    if (wa !== undefined) r.a.push(wa);
    if (wb !== undefined) r.b.push(wb);
  };
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) push(true, x[i++], y[j++]);
    else if (j < y.length && (i === x.length || t[i][j + 1] >= t[i + 1][j])) push(false, undefined, y[j++]);
    else push(false, x[i++], undefined);
  }
  // Two inputs split by a single shared word ("X, Y and Z" against "P, Q and R") read better as one.
  for (let k = 1; k < raw.length - 1; k++) {
    if (raw[k].same && raw[k].a.length === 1 && !raw[k - 1].same && !raw[k + 1].same) {
      raw[k - 1].a.push(...raw[k].a, ...raw[k + 1].a);
      raw[k - 1].b.push(...raw[k].b, ...raw[k + 1].b);
      raw.splice(k, 2);
      k--;
    }
  }
  const out: Segment[] = [];
  let n = 0;
  for (const r of raw) {
    if (r.same) {
      out.push({ kind: "text", text: r.a.join(" ") });
      continue;
    }
    let va = r.a.join(" ");
    let vb = r.b.join(" ");
    // Punctuation both values end with belongs to the sentence, not to the input.
    const pa = va.match(TRAIL)?.[0] ?? "";
    const pb = vb.match(TRAIL)?.[0] ?? "";
    const shared = pa && pa === pb ? pa : "";
    if (shared) {
      va = va.slice(0, -shared.length);
      vb = vb.slice(0, -shared.length);
    }
    out.push({ kind: "input", name: `input_${++n}`, a: va, b: vb });
    if (shared) out.push({ kind: "text", text: shared });
  }
  return out;
}

export function renderTemplate(segments: Segment[], names: Record<string, string> = {}): string {
  let s = "";
  for (const seg of segments) {
    const piece = seg.kind === "text" ? seg.text : `{{${names[seg.name] ?? seg.name}}}`;
    s += s && !/^[,.;:!?)]/.test(piece) ? ` ${piece}` : piece;
  }
  return s;
}

// ---- 2. Where did the recorded runs of the same prompt disagree? ----

export type PlanPrice = { plan: string; monthly: number | null; annual: number | null };

const plain = (cell: string) => cell.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*/g, "").trim();

function amount(cell: string): number | null {
  const c = plain(cell);
  const m = c.match(/\$\s?([\d,]+(?:\.\d+)?)/);
  if (m) return Number(m[1].replace(/,/g, ""));
  return /^free\b/i.test(c) ? 0 : null;
}

// Reads the first markdown table: plan name, month-to-month price, annual price per month.
export function parsePrices(md: string): PlanPrice[] {
  const rows = md.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  return rows
    .slice(2)
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|"))
    .filter((c) => c.length >= 3)
    .map((c) => ({ plan: plain(c[0]), monthly: amount(c[1]), annual: amount(c[2]) }));
}

export type Disagreement = { plan: string; field: "monthly" | "annual"; values: { runId: string; value: number }[] };

export function disagreements(runs: { runId: string; prices: PlanPrice[] }[]): Disagreement[] {
  const out: Disagreement[] = [];
  const plans = [...new Set(runs.flatMap((r) => r.prices.map((p) => p.plan)))];
  for (const plan of plans) {
    for (const field of ["monthly", "annual"] as const) {
      const values = runs.flatMap((r) => {
        const v = r.prices.find((p) => p.plan === plan)?.[field];
        return v === null || v === undefined ? [] : [{ runId: r.runId, value: v }];
      });
      if (new Set(values.map((v) => v.value)).size > 1) out.push({ plan, field, values });
    }
  }
  return out;
}

// Plans every run listed, and plans only some runs listed.
export function coverage(runs: { runId: string; prices: PlanPrice[] }[]): { inAll: string[]; inSome: { plan: string; runIds: string[] }[] } {
  const plans = [...new Set(runs.flatMap((r) => r.prices.map((p) => p.plan)))];
  const has = (plan: string) => runs.filter((r) => r.prices.some((p) => p.plan === plan)).map((r) => r.runId);
  return {
    inAll: plans.filter((p) => has(p).length === runs.length),
    inSome: plans.filter((p) => has(p).length < runs.length).map((plan) => ({ plan, runIds: has(plan) })),
  };
}

// ---- 3. The skill's test: checks any run of it must pass ----

export type App = { name: string; domain: string };
export const ONE_PAGE_WORDS = 450; // stand-in for "one page"; the outputs are markdown, so pages cannot be counted

export function linkDomains(md: string): string[] {
  const urls = md.match(/https?:\/\/[^\s)\]]+/g) ?? [];
  return [...new Set(urls.map((u) => new URL(u).hostname.replace(/^www\./, "")))];
}

export function checkOutput(md: string, apps: App[]): Check[] {
  const plans = parsePrices(md).map((p) => p.plan.toLowerCase());
  const domains = linkDomains(md);
  const isVendor = (d: string) => apps.some((a) => d === a.domain || d.endsWith(`.${a.domain}`));
  const missingApps = apps.filter((a) => !plans.some((p) => p.includes(a.name.toLowerCase())));
  const unlinked = apps.filter((a) => !domains.some((d) => d === a.domain || d.endsWith(`.${a.domain}`)));
  const outside = domains.filter((d) => !isVendor(d));
  const count = md.split(/\s+/).filter(Boolean).length;
  return [
    {
      name: "Covers every app asked for",
      passed: missingApps.length === 0,
      detail: missingApps.length ? `missing: ${missingApps.map((a) => a.name).join(", ")}` : `${apps.length} of ${apps.length}`,
    },
    {
      name: "Links to each vendor's own site",
      passed: unlinked.length === 0,
      detail: unlinked.length ? `no link for: ${unlinked.map((a) => a.name).join(", ")}` : "all linked",
    },
    { name: "Uses only vendor sites as sources", passed: outside.length === 0, detail: outside.length ? `also cites: ${outside.join(", ")}` : "vendor sites only" },
    { name: "Fits on one page", passed: count <= ONE_PAGE_WORDS, detail: `${count} words (limit ${ONE_PAGE_WORDS})` },
    { name: "Says when prices were checked", passed: /checked[^.\n]*20\d\d/i.test(md), detail: /checked[^.\n]*20\d\d/i.test(md) ? "date stated" : "no check date" },
  ];
}

// ---- 4. The skill file ----

export function skillFile(o: { name: string; template: string; inputs: { name: string; examples: string[] }[]; rules: string[]; checks: string[]; cost: string }): string {
  const lines = [`# Skill: ${o.name}`, "", "## Prompt", o.template, ""];
  lines.push("## Inputs");
  if (o.inputs.length === 0) lines.push("None. The sessions used the same words.");
  for (const i of o.inputs) lines.push(`- ${i.name} (examples: ${i.examples.filter(Boolean).map((e) => `"${e}"`).join(", ")})`);
  lines.push("", "## Rules");
  if (o.rules.length === 0) lines.push("None yet.");
  for (const r of o.rules) lines.push(`- ${r}`);
  lines.push("", "## Test", "A run of this skill must pass every check before its result is shown as final:");
  for (const c of o.checks) lines.push(`- ${c}`);
  lines.push("", "## Expected cost", o.cost);
  return lines.join("\n");
}

// Counts for the recorded-output test grid. Each cell is one check on one run.
export function checkSummary(sessions: { checks: Check[] }[]) {
  const cells = sessions.flatMap((session) => session.checks);
  return { sessions: sessions.length, total: cells.length, failed: cells.filter((check) => !check.passed).length };
}
