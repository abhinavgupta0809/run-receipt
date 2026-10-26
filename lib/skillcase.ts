// The Session to Skill business case: per-unit value from three assumed rates and measured costs.
// Retained subscriber-months count only the month each cancellation is prevented, so they undercount.

export type CaseInput = { key: "repeatShare" | "acceptRate" | "churnCutPts"; label: string; evidence: string; low: number; base: number; high: number };
export type Case = { unitUsers: number; plan: string; inputs: CaseInput[]; holdoutShare: number; holdoutDays: number; rolloutGapPts: number };
export type Level = "low" | "base" | "high";
export type Scenario = { level: Level; skillUsers: number; retainedMonths: number; valueUsd: number; writeCostUsd: number; netUsd: number; breakEvenUsers: number };

export const LEVELS: Level[] = ["low", "base", "high"];

const rate = (c: Case, key: CaseInput["key"], level: Level) => {
  const input = c.inputs.find((i) => i.key === key);
  if (!input) throw new Error(`case.json is missing ${key}`);
  return input[level];
};

// skill users = paying users × share who repeat a task × offer acceptance
// retained subscriber-months a year = skill users × monthly churn cut × 12
// value a year = retained months × plan price; net = value − cost of writing each skill once
// break-even users = paying users needed for one year of net value to repay costUnitUsd
export function scenario(c: Case, level: Level, priceUsd: number, writeCostUsd: number, costUnitUsd: number): Scenario {
  const skillUsers = c.unitUsers * rate(c, "repeatShare", level) * rate(c, "acceptRate", level);
  const retainedMonths = skillUsers * (rate(c, "churnCutPts", level) / 100) * 12;
  const valueUsd = retainedMonths * priceUsd;
  const writeCost = skillUsers * writeCostUsd;
  const netUsd = valueUsd - writeCost;
  return { level, skillUsers, retainedMonths, valueUsd, writeCostUsd: writeCost, netUsd, breakEvenUsers: netUsd > 0 ? (costUnitUsd / netUsd) * c.unitUsers : Infinity };
}

// Round a large count to two significant figures for prose ("about 56,000").
export function about(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return x;
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1));
  return Math.round(x / p) * p;
}

// People who must trigger the offer for the holdout to detect a retention gap of gapPts, two-sided 5% test
// at 80% power, assuming `retained` of them are still subscribed at the end. Normal approximation.
export function holdoutSize(gapPts: number, holdoutShare: number, retained = 0.9): number {
  const z = 1.96 + 0.84;
  const variance = retained * (1 - retained) * (1 / holdoutShare + 1 / (1 - holdoutShare));
  return Math.ceil((z * z * variance) / Math.pow(gapPts / 100, 2));
}
