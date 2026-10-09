// Deterministic checks for a model's transaction categorization.
// The model only assigns categories; every number here is computed in code.

export const CATEGORIES = [
  "Housing", "Groceries", "Dining", "Transport", "Utilities",
  "Subscriptions", "Shopping", "Health", "Income",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Txn = { id: number; date: string; description: string; amount: number };
export type Assignment = { id: number; category: string };

export type Check = { name: string; passed: boolean; detail: string };
export type VerifyResult = {
  totals: Record<string, number>; // spending per category (positive numbers)
  totalSpend: number;
  income: number;
  checks: Check[];
  passed: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseCsv(text: string): Txn[] {
  const lines = text.trim().split(/\r?\n/).slice(1);
  return lines.map((line, i) => {
    // description never contains commas in our fixtures; amount is the last field
    const first = line.indexOf(",");
    const last = line.lastIndexOf(",");
    return {
      id: i + 1,
      date: line.slice(0, first),
      description: line.slice(first + 1, last),
      amount: Number(line.slice(last + 1)),
    };
  });
}

export function verify(txns: Txn[], assignments: Assignment[]): VerifyResult {
  const checks: Check[] = [];
  const byId = new Map<number, string[]>();
  for (const a of assignments) byId.set(a.id, [...(byId.get(a.id) ?? []), a.category]);

  const missing = txns.filter((t) => !byId.has(t.id));
  const multiple = [...byId.entries()].filter(([, cats]) => cats.length > 1);
  checks.push({
    name: "Every transaction has exactly one category",
    passed: missing.length === 0 && multiple.length === 0,
    detail: `${missing.length} missing, ${multiple.length} assigned more than once`,
  });

  const valid = new Set<string>(CATEGORIES);
  const invalid = assignments.filter((a) => !valid.has(a.category));
  checks.push({
    name: "Only allowed categories used",
    passed: invalid.length === 0,
    detail: invalid.length ? `invalid: ${[...new Set(invalid.map((a) => a.category))].join(", ")}` : "all valid",
  });

  const misIncome = txns.filter((t) => {
    const c = byId.get(t.id)?.[0];
    return (c === "Income") !== (t.amount > 0 && !/refund/i.test(t.description));
  });
  checks.push({
    name: "Income is only positive non-refund amounts",
    passed: misIncome.length === 0,
    detail: misIncome.length ? misIncome.map((t) => t.description).join("; ") : "ok",
  });

  // Totals are computed here, never taken from the model.
  const totals: Record<string, number> = {};
  let income = 0;
  for (const t of txns) {
    const c = byId.get(t.id)?.[0];
    if (!c) continue;
    if (c === "Income") { income += t.amount; continue; }
    totals[c] = round2((totals[c] ?? 0) - t.amount); // spend positive; refunds reduce
  }
  const totalSpend = round2(Object.values(totals).reduce((s, v) => s + v, 0));
  const fileSpend = round2(-txns.filter((t) => !(byId.get(t.id)?.[0] === "Income")).reduce((s, t) => s + t.amount, 0));
  checks.push({
    name: "Category totals add up to the file",
    passed: Math.abs(totalSpend - fileSpend) < 0.005,
    detail: `categories ${totalSpend.toFixed(2)} vs file ${fileSpend.toFixed(2)}`,
  });

  return { totals, totalSpend, income: round2(income), checks, passed: checks.every((c) => c.passed) };
}

// Model-reported totals vs code-computed totals: catches arithmetic the model got wrong.
export function compareReported(computed: Record<string, number>, reported: Record<string, number>): Check[] {
  return Object.entries(reported).map(([cat, val]) => {
    const truth = computed[cat];
    const ok = truth !== undefined && Math.abs(truth - val) < 0.005;
    return {
      name: `${cat} total matches recomputation`,
      passed: ok,
      detail: truth === undefined ? "category not in recomputation" : `reported ${val.toFixed(2)}, recomputed ${truth.toFixed(2)}`,
    };
  });
}

export function findDuplicates(txns: Txn[]): Txn[][] {
  const groups = new Map<string, Txn[]>();
  for (const t of txns) {
    const k = `${t.date}|${t.description}|${t.amount}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
