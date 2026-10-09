// Checks a spreadsheet a run produced against the file it was built from. No answer key is
// needed: every check compares the sheet's own rows with the user's file, row by row.

import { estimate, type Estimate, type Run } from "./estimate.ts";
import type { Check, Txn } from "./verify.ts";

export type SheetRow = { id: number; date: string | null; description: string; amount: number | null; category: string };

export type SheetRecording = {
  runId: string;
  finalReadNote: string;
  summaryFormulas: number;
  charts: number;
  disclosed: boolean; // did the chat reply say cells were left blank
  duplicateFlagged: boolean;
  rows: SheetRow[];
};

export type PanelRun = Run & { panelAtFinish: number };

// Signed totals, as a SUMIF over the amount column gives them: moneyOut is negative.
export type SheetTotal = { category: string; shown: number; repaired: number };
export type Gap = { id: number; field: "amount" | "description"; shown: string; fileValue: string };
export type Money = { moneyIn: number; moneyOut: number; net: number };

export type SheetLane = {
  mode: Run["mode"];
  run: PanelRun;
  estimate: Estimate | null;
  finalReadNote: string;
  rowCount: number;
  completeRows: number;
  missingDates: number;
  disclosed: boolean;
  checks: Check[];
  totals: SheetTotal[];
  shown: Money;
  repaired: Money;
  gaps: Gap[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const same = (a: number, b: number) => Math.abs(a - b) < 0.005;
const usd = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function money(amounts: number[]): Money {
  const moneyIn = round2(amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0));
  const moneyOut = round2(-amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0));
  return { moneyIn, moneyOut, net: round2(moneyIn - moneyOut) };
}

export function checkSheet(mode: Run["mode"], rec: SheetRecording, runs: Run[], txns: Txn[]): SheetLane {
  const run = runs.find((r) => r.id === rec.runId);
  if (!run) throw new Error(`run ${rec.runId} is not in runs.json`);
  if (run.panelAtFinish === null) throw new Error(`run ${rec.runId} has no panel reading`);

  const byId = new Map(rec.rows.map((r) => [r.id, r]));
  const gaps: Gap[] = [];
  let missingDates = 0;
  let wrongDates = 0;
  let wrongAmounts = 0;
  let completeRows = 0;
  for (const t of txns) {
    const r = byId.get(t.id);
    if (!r) continue;
    if (r.date === null) missingDates++;
    else if (r.date !== t.date) wrongDates++;
    if (r.amount === null) gaps.push({ id: t.id, field: "amount", shown: `${r.description}: blank`, fileValue: `${t.description}: ${t.amount > 0 ? "+" : ""}${usd(t.amount)}` });
    else if (!same(r.amount, t.amount)) wrongAmounts++;
    if (r.description !== t.description) gaps.push({ id: t.id, field: "description", shown: r.description, fileValue: t.description });
    if (r.date === t.date && r.amount !== null && same(r.amount, t.amount) && r.description === t.description) completeRows++;
  }
  const missingAmounts = gaps.filter((g) => g.field === "amount").length;
  const shortened = gaps.filter((g) => g.field === "description").length;

  // What the sheet shows on opening (blank amounts count as zero) and what it shows once
  // the blanks are filled from the file. Categories are the run's own labels.
  const categories = [...new Set(rec.rows.map((r) => r.category))];
  const fileAmount = new Map(txns.map((t) => [t.id, t.amount]));
  const totals = categories.map((category) => {
    const rs = rec.rows.filter((r) => r.category === category);
    return {
      category,
      shown: round2(rs.reduce((s, r) => s + (r.amount ?? 0), 0)),
      repaired: round2(rs.reduce((s, r) => s + (fileAmount.get(r.id) ?? 0), 0)),
    };
  });
  const shown = money(rec.rows.map((r) => r.amount ?? 0));
  const repaired = money(txns.map((t) => t.amount));

  const checks: Check[] = [
    { name: "Every row of the file is in the sheet", passed: rec.rows.length === txns.length, detail: `${rec.rows.length} of ${txns.length} rows` },
    {
      name: "Every row has its date",
      passed: missingDates === 0 && wrongDates === 0,
      detail: missingDates || wrongDates ? `${missingDates} blank, ${wrongDates} different from the file` : "all match the file",
    },
    {
      name: "Every row has its amount",
      passed: missingAmounts === 0 && wrongAmounts === 0,
      detail: missingAmounts || wrongAmounts ? `${missingAmounts} blank, ${wrongAmounts} different from the file` : "all match the file",
    },
    { name: "Descriptions match the file", passed: shortened === 0, detail: shortened ? `${shortened} shortened` : "all match the file" },
    {
      name: "Net on the summary matches the file",
      passed: same(shown.net, repaired.net),
      detail: `sheet ${shown.net < 0 ? "-" : "+"}${usd(shown.net)} vs file ${repaired.net < 0 ? "-" : "+"}${usd(repaired.net)}`,
    },
    { name: "Summary uses formulas", passed: rec.summaryFormulas > 0, detail: `${rec.summaryFormulas} formulas` },
    { name: "Chart included", passed: rec.charts > 0, detail: `${rec.charts} chart` },
    { name: "Same-day, same-amount charges flagged", passed: rec.duplicateFlagged, detail: rec.duplicateFlagged ? "flagged in the reply" : "not flagged" },
  ];

  return {
    mode,
    run: run as PanelRun,
    estimate: estimate(runs, run.task, mode),
    finalReadNote: rec.finalReadNote,
    rowCount: txns.length,
    completeRows,
    missingDates,
    disclosed: rec.disclosed,
    checks,
    totals,
    shown,
    repaired,
    gaps,
  };
}
