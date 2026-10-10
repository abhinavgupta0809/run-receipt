import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Run } from "../lib/estimate.ts";
import { fullMarks, medianGapCredits, medianLowPct, pairs, panelReadings, rangeBacktest, settingsFor, tally, widestRepeatRuns, type Gate } from "../lib/study.ts";

const read = (name: string) => readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8");
const runs = (JSON.parse(read("runs.json")) as { runs: Run[] }).runs;
const gate = (JSON.parse(read("gate.json")) as { gate: Gate }).gate;

test("every run has a Privacy Gate status, and a local step only ran when the gate appeared", () => {
  assert.deepEqual(Object.keys(gate).sort(), runs.map((r) => r.id).sort());
  assert.ok(runs.filter((r) => r.ranLocal).every((r) => gate[r.id] === "appeared"));
});

test("seven tasks were run both ways; the local model ran in two of them", () => {
  const ps = pairs(runs, gate);
  assert.deepEqual(ps.map((p) => [p.task, p.ranLocal, p.hybridCost]), [
    ["file_report", true, "lower"],
    ["budget_spreadsheet", true, "higher"],
    ["invoice_summary", false, "lower"],
    ["lab_flags", false, "higher"],
    ["website", false, "lower"],
    ["slides", false, "higher"],
    ["note_apps", false, "higher"],
  ]);
  const bank = ps[0];
  assert.deepEqual(bank.hybridVsCloudPct, { min: -24, max: -21, n: 2 });
  assert.equal(bank.cloud.fullMarks, true);
  assert.equal(bank.hybrid.fullMarks, false);
  assert.equal(ps.find((p) => p.task === "lab_flags")?.hybridVsCloudPct.max, 110);
});

test("every run where the local model ran fell short of full marks; every graded run where it did not got full marks", () => {
  const t = tally(runs, gate);
  assert.deepEqual([t.localRuns, t.localRunsNotFullMarks], [3, 3]);
  assert.deepEqual([t.hybridNotLocal, t.hybridNotLocalGraded, t.hybridNotLocalFullMarks], [5, 4, 4]);
  assert.ok(runs.filter((r) => r.mode === "cloud").every((r) => fullMarks(r) !== false));
});

test("study totals", () => {
  const t = tally(runs, gate);
  assert.deepEqual([t.planned, t.earlyTests, t.taskLabels.length], [24, 3, 11]);
  assert.equal(t.totalCredits, 694.46);
  assert.deepEqual([t.pairs, t.pairsLocal, t.pairsHybridLower, t.pairsHybridHigher], [7, 2, 3, 4]);
  assert.deepEqual(t.fileTasksGated, ["Bank report from a CSV", "Excel budget from a CSV"]);
  assert.deepEqual(t.fileTasksNotGated, ["Invoice summary from a CSV", "Lab results flags from a CSV"]);
  assert.deepEqual(t.gateWithHybridOff, ["0b", "1", "24"]);
});

test("panel readings, the repeated prompt and the effort settings are per run or per setting", () => {
  const p = panelReadings(runs);
  assert.equal(p.length, 25);
  assert.deepEqual(p.find((x) => x.id === "5"), { id: "5", label: "Lab results flags from a CSV", setting: "Mac app, cloud", panel: 0.02, final: 3.92, shownPct: 0.51, lowPct: 99.49 });
  assert.deepEqual(widestRepeatRuns(runs).runs.map((r) => r.final), [12.14, 14.29, 21.96]);
  assert.deepEqual(settingsFor(runs, "note_apps").map((g) => g.credits.min), [32.25, 42.06, 56.56, 220.98]);
});

test("the median panel gap is the middle reading, and is 0 for no readings", () => {
  const r = (lowPct: number) => ({ id: "x", label: "", setting: "", panel: 0, final: 0, shownPct: 100 - lowPct, lowPct });
  assert.equal(medianLowPct([]), 0);
  assert.equal(medianLowPct([r(30), r(10), r(20)]), 20);
  assert.equal(medianLowPct([r(10), r(20), r(30), r(40)]), 25);
  const real = panelReadings(runs);
  const sorted = real.map((x) => x.lowPct).sort((a, b) => a - b);
  assert.equal(medianLowPct(real), sorted[Math.floor(sorted.length / 2)]);
});

test("the research file synced from the reviews dashboard is internally consistent and every quote names its source", () => {
  const r = JSON.parse(read("research.json"));
  const c = r.corpus;
  assert.equal(c.android + c.ios, c.reviews);
  assert.ok(c.substantive <= c.reviews && r.money.reviews <= c.substantive && r.money.lowStar <= r.money.reviews);
  for (const k of [r.creditsRunOut, r.computerCredits, ...r.larger]) assert.ok(k.title && k.lowStar <= k.reviews && k.android + k.ios === k.reviews);
  assert.ok(r.labelCheck.matches <= r.labelCheck.n);
  assert.ok(r.quotes.length > 0 && r.quotes.every((q: { text: string; source: string; when: string; stars: number; tone: string; reviewId: string }) => q.text && q.source && q.when && q.reviewId && q.stars >= 1 && q.stars <= 5 && ["cost", "meter", "hybrid"].includes(q.tone)));
});

test("a range from the other runs rarely holds the next run until it is widened", () => {
  // Five prompts were run more than once on one setting: 12 runs in all.
  assert.deepEqual(rangeBacktest(runs), { hits: 2, n: 12, medianWidthPct: 7 });
  assert.deepEqual(rangeBacktest(runs, 20), { hits: 11, n: 12, medianWidthPct: 49 });
});

test("the median gap between the panel at Finished and the final charge, in credits", () => {
  assert.equal(medianGapCredits(panelReadings(runs)), 2.64);
});
