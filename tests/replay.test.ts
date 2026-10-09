import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "../lib/verify.ts";
import { buildReplay, parseJsonl, type BudgetRecordings, type Recordings } from "../lib/replay.ts";
import { cloudGap, estimate, undercount, type Run } from "../lib/estimate.ts";
import { groupRuns, headline } from "../lib/summary.ts";

const read = (name: string) => readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8");
const runs = (JSON.parse(read("runs.json")) as { runs: Run[] }).runs;
const rec = JSON.parse(read("recordings.json")) as Recordings;
const budget = JSON.parse(read("recordings-budget.json")) as BudgetRecordings;
const data = buildReplay(parseCsv(read("september_2026_transactions.csv")), runs, rec, parseJsonl(read(rec.router.file)), budget);

test("ranges are the min and max of measured runs", () => {
  const cloud = estimate(runs, "file_report", "cloud");
  const hybrid = estimate(runs, "file_report", "hybrid");
  assert.deepEqual(cloud?.credits, { min: 15.02, max: 15.55, n: 2 });
  assert.deepEqual(hybrid?.credits, { min: 11.77, max: 11.87, n: 2 });
  assert.equal(estimate(runs, "no_such_task", "cloud"), null);
});

test("the panel never read above the final charge, and read below it in 23 of 25 readings", () => {
  const lows = runs.map(undercount).filter((x) => x !== null);
  assert.equal(lows.length, 25);
  assert.ok(lows.every((x) => x >= 0));
  assert.equal(lows.filter((x) => x > 0).length, 23);
});

test("cloud gap over Hybrid comes from the measured finals", () => {
  assert.deepEqual(cloudGap(runs, "file_report"), { min: 3.15, max: 3.78, n: 2 });
});

test("recorded cloud run: all 8 totals right, duplicate flagged", () => {
  assert.equal(data.cloud.totalsRight, 8);
  assert.ok(data.cloud.checks.every((c) => c.passed));
});

test("recorded Hybrid run: 0 of 8 totals right, Housing withheld, $647 uncategorized", () => {
  assert.equal(data.hybrid.totalsRight, 0);
  assert.deepEqual(data.hybrid.withheld, [{ category: "Housing", value: 1850 }]);
  assert.equal(data.hybrid.checks[0].passed, false);
});

test("router run passes the structural checks but the labels are not all right", () => {
  assert.ok(data.router.checks.every((c) => c.passed));
  const { mislabels } = data.router.labels;
  assert.deepEqual(mislabels.map((m) => [m.description, m.got, m.judgementCall]), [
    ["Equinox Gym", "Health", true],
    ["T-Mobile", "Subscriptions", false],
  ]);
  assert.equal(data.router.totalsRight, 5); // strict key: Utilities, Subscriptions and Health are off
});

test("every run lands in exactly one group", () => {
  const ids = groupRuns(runs).flatMap((g) => g.runIds);
  assert.equal(ids.length, runs.length);
  assert.equal(new Set(ids).size, runs.length);
});

test("web runs and effort levels are never pooled with Mac runs", () => {
  const noteApps = groupRuns(runs).filter((g) => g.task === "note_apps");
  assert.deepEqual(noteApps.map((g) => [g.setting, g.credits.min, g.credits.max]), [
    ["Mac app, cloud", 32.25, 32.25],
    ["Mac app, Hybrid on, nothing ran locally", 42.06, 42.06],
    ["Web, Standard effort", 56.56, 56.56],
    ["Web, High effort", 220.98, 220.98],
  ]);
});

test("headline counts come from the data", () => {
  const h = headline(runs);
  assert.equal(h.runs, 27);
  assert.equal(h.hybridOn, 8);
  assert.equal(h.hybridRanLocal, 3);
  assert.deepEqual(h.widestRepeat, { label: "Price comparison, 3 apps", credits: { min: 12.14, max: 21.96, n: 3 }, spreadPct: 81 });
  assert.deepEqual(h.effort, { standard: 56.56, high: 220.98, times: 3.9 });
});

test("recorded cloud spreadsheet (run 11): every row complete, net matches the file", () => {
  const b = data.budget.cloud;
  assert.equal(b.completeRows, 40);
  assert.ok(b.checks.every((c) => c.passed));
  assert.deepEqual(b.shown, { moneyIn: 4229.99, moneyOut: 3356.25, net: 873.74 });
  assert.deepEqual(b.gaps, []);
});

test("recorded Hybrid spreadsheet (run 22): dates, rent, salary and gym amounts are blank", () => {
  const b = data.budget.hybrid;
  assert.equal(b.missingDates, 40);
  assert.equal(b.completeRows, 0);
  assert.deepEqual(b.gaps.filter((g) => g.field === "amount").map((g) => g.fileValue), [
    "Rent - Oakland Apartments: $1,850.00",
    "Salary - Acme Corp: +$4,200.00",
    "Equinox Gym: $185.00",
  ]);
  assert.deepEqual(b.gaps.filter((g) => g.field === "description").map((g) => g.shown), ["Rent", "Salary"]);
  const failed = b.checks.filter((c) => !c.passed).map((c) => c.name);
  assert.deepEqual(failed, ["Every row has its date", "Every row has its amount", "Descriptions match the file", "Net on the summary matches the file"]);
});

test("filling the blanks from the file repairs the Hybrid summary", () => {
  const b = data.budget.hybrid;
  assert.deepEqual(b.shown, { moneyIn: 29.99, moneyOut: 1321.25, net: -1291.26 });
  assert.deepEqual(b.repaired, { moneyIn: 4229.99, moneyOut: 3356.25, net: 873.74 });
  const t = Object.fromEntries(b.totals.map((x) => [x.category, [x.shown, x.repaired]]));
  assert.deepEqual(t["Housing"], [0, -1850]);
  assert.deepEqual(t["Income"], [0, 4200]);
  assert.deepEqual(t["Health & Wellness"], [-72.9, -257.9]);
  assert.deepEqual(t["Groceries"], [-425.34, -425.34]);
});
