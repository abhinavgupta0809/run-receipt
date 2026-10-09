import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv, verify, compareReported, findDuplicates, type Assignment } from "../lib/verify.ts";
import { keyCategory } from "../lib/answerKey.ts";

const txns = parseCsv(readFileSync(new URL("../data/september_2026_transactions.csv", import.meta.url), "utf8"));

// The answer-key categorization (Equinox as a subscription).
const rule = keyCategory;
const good: Assignment[] = txns.map((t) => ({ id: t.id, category: rule(t.description) }));

test("parses 40 transactions", () => assert.equal(txns.length, 40));

test("correct categorization passes and matches the answer key", () => {
  const r = verify(txns, good);
  assert.equal(r.passed, true);
  assert.equal(r.totalSpend, 3326.26);
  assert.equal(r.income, 4200);
  assert.deepEqual(
    { Housing: r.totals.Housing, Groceries: r.totals.Groceries, Subscriptions: r.totals.Subscriptions, Shopping: r.totals.Shopping, Health: r.totals.Health },
    { Housing: 1850, Groceries: 425.34, Subscriptions: 307.46, Shopping: 153.18, Health: 72.9 },
  );
});

test("a dropped transaction fails the coverage check", () => {
  const r = verify(txns, good.slice(1));
  assert.equal(r.passed, false);
  assert.equal(r.checks[0].passed, false);
});

test("a refund labelled Income fails", () => {
  const bad = good.map((a) => (/Refund/.test(txns[a.id - 1].description) ? { ...a, category: "Income" } : a));
  assert.equal(verify(txns, bad).passed, false);
});

test("the real Hybrid run's reported totals are caught", () => {
  const computed = verify(txns, good).totals;
  // Totals Perplexity Hybrid reported on 2026-10-02 (run 0c).
  const reported = { Groceries: 483.24, Dining: 134.3, Transport: 135.95, Utilities: 227.18, Subscriptions: 297.46, Shopping: 147.77 };
  const checks = compareReported(computed, reported);
  assert.equal(checks.filter((c) => c.passed).length, 1); // only Utilities is right
});

test("finds the Target duplicate but not the BART reloads", () => {
  const dups = findDuplicates(txns);
  assert.equal(dups.length, 1);
  assert.match(dups[0][0].description, /Target/);
});
