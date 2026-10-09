import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkSummary, checkOutput, coverage, disagreements, parsePrices, renderTemplate, similarity, template, type App } from "../lib/skill.ts";

const read = (name: string) => readFileSync(new URL(`../data/skill/${name}`, import.meta.url), "utf8");
const s = JSON.parse(read("sessions.json")) as { prompt: string; variation: string; apps: App[]; sessions: { runId: string; file: string }[] };
const runs = s.sessions.map((x) => ({ runId: x.runId, md: read(x.file), prices: parsePrices(read(x.file)) }));

test("the same prompt twice is a full match with no inputs", () => {
  assert.equal(similarity(s.prompt, s.prompt), 1);
  const t = template(s.prompt, s.prompt);
  assert.equal(t.filter((x) => x.kind === "input").length, 0);
  assert.equal(renderTemplate(t), s.prompt);
});

test("a variation of the prompt yields one input holding what changed", () => {
  assert.ok(similarity(s.prompt, s.variation) > 0.6);
  const inputs = template(s.prompt, s.variation).filter((x) => x.kind === "input");
  assert.deepEqual(inputs, [{ kind: "input", name: "input_1", a: "Notion, Obsidian Sync, and Evernote personal", b: "Figma, Canva, and Sketch individual" }]);
  assert.equal(
    renderTemplate(template(s.prompt, s.variation), { input_1: "apps_and_plan" }),
    "Make a one-page comparison of the current US monthly prices for {{apps_and_plan}} plans, with source links.",
  );
});

test("unrelated prompts are not offered as a skill", () => {
  assert.ok(similarity(s.prompt, "Write three short emails to my landlord, a professor and a recruiter.") < 0.3);
});

test("the three recorded runs disagree on exactly one price: Notion Plus, billed monthly", () => {
  assert.deepEqual(disagreements(runs), [
    { plan: "Notion Plus", field: "monthly", values: [{ runId: "7", value: 10 }, { runId: "15", value: 12 }, { runId: "16", value: 12 }] },
  ]);
});

test("the runs did not list the same plans", () => {
  const c = coverage(runs);
  assert.deepEqual(c.inAll, ["Notion Plus", "Evernote Starter", "Evernote Advanced"]);
  assert.ok(c.inSome.some((p) => p.plan === "Obsidian Sync Plus" && p.runIds.join() === "16"));
});

test("every recorded run cites a site that is not a vendor", () => {
  for (const r of runs) {
    const c = checkOutput(r.md, s.apps).find((x) => x.name === "Uses only vendor sites as sources")!;
    assert.equal(c.passed, false, `run ${r.runId}`);
  }
});


test("the dashboard counts recorded check cells, not failure rates", () => {
  assert.deepEqual(checkSummary(runs.map((r) => ({ checks: checkOutput(r.md, s.apps) }))), { sessions: 3, total: 15, failed: 4 });
  assert.deepEqual(checkSummary([]), { sessions: 0, total: 0, failed: 0 });
  assert.deepEqual(checkSummary([{ checks: [{ name: "sample", passed: true, detail: "ok" }] }]), { sessions: 1, total: 1, failed: 0 });
});
