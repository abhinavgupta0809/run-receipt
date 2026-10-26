import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { about, scenario, type Case } from "../lib/skillcase.ts";

const c = JSON.parse(readFileSync(new URL("../data/skill/case.json", import.meta.url), "utf8")) as Case;

test("base case per 10,000 paying users on a $20 plan, by hand", () => {
  // 10,000 × 25% × 30% = 750 skill users; 750 × 1% × 12 = 90 months; 90 × $20 = $1,800; writing 750 skills at $0.05 = $37.50.
  const s = scenario(c, "base", 20, 0.05, 10_000);
  assert.equal(s.skillUsers, 750);
  assert.equal(Math.round(s.retainedMonths * 1000) / 1000, 90);
  assert.equal(Math.round(s.valueUsd), 1800);
  assert.equal(s.writeCostUsd, 37.5);
  assert.equal(Math.round(s.netUsd * 100) / 100, 1762.5);
  // $10,000 ÷ $1,762.50 × 10,000 users ≈ 56,738.
  assert.equal(Math.round(s.breakEvenUsers), 56738);
});

test("low and high cases bracket the base", () => {
  const low = scenario(c, "low", 20, 0.05, 10_000);
  const high = scenario(c, "high", 20, 0.05, 10_000);
  assert.equal(Math.round(low.skillUsers), 150);
  assert.equal(Math.round(low.valueUsd), 180);
  assert.equal(Math.round(high.skillUsers), 1800);
  assert.equal(Math.round(high.valueUsd), 8640);
  assert.ok(low.breakEvenUsers > high.breakEvenUsers);
});

test("about rounds to two significant figures", () => {
  assert.equal(about(56738), 57000);
  assert.equal(about(573770), 570000);
  assert.equal(about(11641), 12000);
  assert.equal(about(90), 90);
});
