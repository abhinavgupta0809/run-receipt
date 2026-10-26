import { client, skillName } from "./perplexity.ts";

// Turns browser recordings from the extension into one general Perplexity skill.
// compact() and renderSkillMd() are plain code; writeSkill() is the one model call.

export const RECORDING_FORMAT = "session-to-skill/recording@1";

export type Target = { tag: string; role?: string; text?: string; label?: string; href?: string };
export type RecEvent = {
  t: number;
  kind: "page" | "tab" | "click" | "input" | "submit" | "copy";
  url?: string;
  title?: string;
  target?: Target;
  field?: string;
  value?: string;
  text?: string;
};
export type Recording = { format: string; goal: string; recordedOn?: string; startedAt: number; endedAt: number | null; events: RecEvent[]; shots: { t: number; afterEvent: number; image: string }[] };

export type SkillPlan = {
  name: string;
  description: string;
  intent: string;
  recorded_steps: string[];
  variations: { what: string; values: string[] }[];
  inputs: { name: string; description: string; example: string; required: boolean }[];
  steps: string[];
  checks: string[];
  output: string;
};

const MAX_LINES = 200;
const MAX_SHOTS = 8;

export function parseRecording(json: string): Recording {
  const r = JSON.parse(json) as Recording;
  if (r.format !== RECORDING_FORMAT) throw new Error(`Not a Session to Skill recording (format ${String(r.format)})`);
  if (!Array.isArray(r.events) || r.events.length === 0) throw new Error("The recording has no steps");
  return { ...r, shots: r.shots ?? [] };
}

const q = (s: string | undefined) => `"${(s ?? "").replace(/"/g, "'")}"`;
const clock = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function line(e: RecEvent): string {
  switch (e.kind) {
    case "page":
      return `open page ${q(e.title)} ${e.url}`;
    case "tab":
      return `switch to tab ${q(e.title)} ${e.url}`;
    case "click": {
      const t = e.target ?? { tag: "element" };
      const what = t.text || t.label;
      return `click ${t.role ?? t.tag}${what ? ` ${q(what)}` : ""}${t.href ? ` -> ${t.href}` : ""}`;
    }
    case "input":
      return `set field ${q(e.field)} to ${q(e.value)}`;
    case "submit":
      return `submit field ${q(e.field)} with ${q(e.value)}`;
    case "copy":
      return `copy text ${q(e.text)}`;
  }
}

// Drops the echoes a browser produces for one action: a label click followed by its input's click,
// a field change that just repeats the submit beside it, and a reload of the page already open.
export function dedupe(events: RecEvent[]): { event: RecEvent; index: number }[] {
  const kept: { event: RecEvent; index: number }[] = [];
  events.forEach((e, index) => {
    const prev = kept[kept.length - 1]?.event;
    if (prev?.kind === "click" && e.kind === "click" && e.t - prev.t < 300) return;
    if (prev?.kind === "submit" && e.kind === "input" && prev.field === e.field && prev.value === e.value) return;
    if (prev && (e.kind === "page" || e.kind === "tab") && (prev.kind === "page" || prev.kind === "tab") && prev.url === e.url && prev.title === e.title) return;
    kept.push({ event: e, index });
  });
  return kept;
}

// Spreads the screenshots across the session, always keeping the first and last.
export function pickShots<T>(shots: T[], max = MAX_SHOTS): T[] {
  if (shots.length <= max) return shots;
  return Array.from({ length: max }, (_, i) => shots[Math.round((i * (shots.length - 1)) / (max - 1))]);
}

export function compact(r: Recording, maxShots = MAX_SHOTS): { timeline: string; shots: { label: string; image: string }[] } {
  const kept = dedupe(r.events).slice(0, MAX_LINES);
  const start = r.startedAt || r.events[0].t;
  const stepOf = (eventIndex: number) => {
    const k = kept.findLastIndex((x) => x.index <= eventIndex);
    return k < 0 ? 1 : k + 1;
  };
  const timeline = kept.map((x, i) => `${i + 1}. [${clock(Math.max(0, x.event.t - start))}] ${line(x.event)}`).join("\n");
  const shots = pickShots(r.shots, maxShots).map((s) => ({ label: `Screenshot after step ${stepOf(s.afterEvent)}`, image: s.image }));
  return { timeline, shots };
}

const INSTRUCTIONS = `You turn recorded browser sessions into one reusable skill for Perplexity's agent.

You get one or more sessions of the same kind of task, often done on different products or sites. Write the general skill for that kind of task, not a skill for the products in the recordings.
- What changed between sessions (products, plans, sites, search words, dates) becomes an input. What repeated is the procedure.
- With one session, still generalize: treat everything specific to that run as an input.
- Name the skill after the kind of task, e.g. "software-pricing-analysis", never after a product or site.
- Keep product, company and site names out of name, description, intent, steps, checks and output. They may appear only in input examples.
- Write for a list of any length, not the count that was recorded.

The agent that runs the skill can search the web, fetch pages and run code in a sandbox. It cannot click or type in a browser. So:
- Rebuild the work as search, page fetches and reading, not UI clicks. Where the person used a kind of page (an official pricing page, a monthly/yearly toggle), describe that kind of page.
- Keep only steps that served the goal. Drop wandering, retries and navigation noise.
- Add checks the agent must pass before it answers, based on what could go wrong in this kind of task (for prices: exact plan, billing period, currency, unit, date checked).

Fields:
- name: lowercase words joined by single hyphens, at most 64 characters.
- description: one or two sentences that say when to load this skill, phrased as triggers. Under 300 characters.
- recorded_steps: a plain, ordered account of what the person did across all sessions, one short sentence each, prefixed with the session number.
- variations: what changed between sessions and the values seen, one entry per thing that changed. Empty with one session.
- inputs: required is true only if the agent can't work the input out itself.
- steps: the general procedure, imperative, one action each.
- output: what the final answer should look like.
Use the screenshots to read values the timeline doesn't capture.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "intent", "recorded_steps", "variations", "inputs", "steps", "checks", "output"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    intent: { type: "string" },
    recorded_steps: { type: "array", items: { type: "string" } },
    variations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["what", "values"],
        properties: { what: { type: "string" }, values: { type: "array", items: { type: "string" } } },
      },
    },
    inputs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "example", "required"],
        properties: { name: { type: "string" }, description: { type: "string" }, example: { type: "string" }, required: { type: "boolean" } },
      },
    },
    steps: { type: "array", items: { type: "string" } },
    checks: { type: "array", items: { type: "string" } },
    output: { type: "string" },
  },
};

export const WRITER_MODEL = "anthropic/claude-sonnet-5-5";

// Brand words from the sites the person visited: www.notion.com -> notion, obsidian.md -> obsidian.
export function siteWords(recs: Recording[]): string[] {
  const words = new Set<string>();
  for (const r of recs) {
    for (const e of r.events) {
      try {
        const labels = new URL(e.url ?? "").hostname.split(".");
        const w = labels.length >= 2 ? labels[labels.length - 2] : "";
        if (w.length >= 3) words.add(w.toLowerCase());
      } catch {
        // Events without a usable URL carry no site name.
      }
    }
  }
  return [...words];
}

// Site names that slipped into the parts of the skill that should stay general.
export function leaks(plan: SkillPlan, words: string[]): string[] {
  const general = [plan.name.replace(/-/g, " "), plan.description, plan.intent, ...plan.steps, ...plan.checks, plan.output].join("\n");
  return words.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(general));
}

export function prompt(recs: Recording[]): { type: "input_text" | "input_image"; text?: string; image_url?: string }[] {
  const perSession = Math.max(2, Math.floor(MAX_SHOTS / recs.length));
  return recs.flatMap((r, i) => {
    const { timeline, shots } = compact(r, perSession);
    const head = `Session ${i + 1} of ${recs.length}, recorded ${r.recordedOn ?? new Date(r.startedAt).toISOString().slice(0, 10)}. Goal the person typed: ${q(r.goal || "not given")}`;
    return [
      { type: "input_text" as const, text: `${head}\n\nTimeline (${timeline.split("\n").length} steps):\n${timeline}` },
      ...shots.flatMap((s) => [
        { type: "input_text" as const, text: `Session ${i + 1}, ${s.label.toLowerCase()}` },
        { type: "input_image" as const, image_url: s.image },
      ]),
    ];
  });
}

export async function writeSkill(recs: Recording[], model = WRITER_MODEL): Promise<{ plan: SkillPlan; leaks: string[]; costUsd: number; model: string }> {
  const words = siteWords(recs);
  const content: ReturnType<typeof prompt> = prompt(recs);
  let cost = 0;
  let used = model;
  for (let attempt = 0; ; attempt++) {
    const res = await client().responses.create({
      model,
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content }],
      max_output_tokens: 4000,
      response_format: { type: "json_schema", json_schema: { name: "skill_plan", schema: SCHEMA } },
    } as Parameters<ReturnType<typeof client>["responses"]["create"]>[0]);
    const out = res as unknown as { output_text: string; model: string; usage?: { cost?: { total_cost?: number } } };
    cost += out.usage?.cost?.total_cost ?? 0;
    used = out.model;
    const plan = JSON.parse(out.output_text) as SkillPlan;
    const found = leaks(plan, words);
    if (found.length === 0 || attempt === 1) return { plan, leaks: found, costUsd: cost, model: used };
    // One retry: point at the names that leaked and ask for the general version.
    content.push({ type: "input_text", text: `Your draft named ${found.join(", ")} outside the input examples. Rewrite it so those names appear only as input examples.` });
  }
}

const byteSlice = (s: string, max: number) => {
  const b = Buffer.from(s, "utf8");
  return b.length <= max ? s : b.subarray(0, max).toString("utf8").replace(/\uFFFD$/, "");
};

const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export type SessionMeta = { recordedOn: string; goal: string; steps: number };

export function renderSkillMd(plan: SkillPlan, sessions: SessionMeta[]): string {
  const name = skillName(plan.name) || "recorded-task";
  const description = byteSlice(plan.description.replace(/\s+/g, " ").trim(), 1024).replace(/"/g, "'");
  const title = name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  const input = (i: SkillPlan["inputs"][number]) => `- **${i.name}**${i.required ? "" : " (optional)"}: ${sentence(i.description)} Example: ${i.example}`;
  const inputs = plan.inputs.length
    ? plan.inputs.map(input).join("\n") + "\n\nAsk for a required input the request doesn't give. Work out optional ones yourself."
    : "None. The task is the same every time.";
  const n = sessions.length;
  const origin =
    n === 1
      ? `Written from one recorded browser session on ${sessions[0].recordedOn} (${sessions[0].steps} steps).`
      : `Written from ${n} recorded browser sessions, ${sessions.map((s) => s.recordedOn).filter((d, i, a) => a.indexOf(d) === i).join(", ")} (${sessions.reduce((t, s) => t + s.steps, 0)} steps in all).`;
  const changed = plan.variations.length
    ? `\n\nWhat changed between sessions became inputs:\n${plan.variations.map((v) => `- ${v.what}: ${v.values.join(", ")}`).join("\n")}`
    : "";
  return `---
name: ${name}
description: "${description}"
---

# ${title}

${plan.intent}

## Inputs

${inputs}

## Steps

${plan.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Checks before you answer

${plan.checks.map((c) => `- ${c}`).join("\n")}

- Recompute every number you derive (differences, totals, rankings, cheapest or largest) from the figures in your answer before you state it.

If a check fails, say which one in the answer instead of hiding it.

## Answer format

${plan.output}

Put each source as a full https link next to the figure it supports. Don't use numbered markers like [web:1].

## Where this skill came from

${origin}${changed}
`;
}
