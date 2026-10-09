// Builds the replay shown on the hosted page from recorded runs. Every figure is either
// copied from a recording or computed here by the same checker the tests use.

import { CATEGORIES, compareReported, findDuplicates, verify, type Assignment, type Check, type Txn } from "./verify.ts";
import { keyCategory, labelAccuracy, type Mislabel } from "./answerKey.ts";
import { cloudGap, estimate, type Estimate, type Range, type Run, type TimedRun } from "./estimate.ts";
import { groupRuns, headline, type Group, type Headline } from "./summary.ts";
import { checkSheet, type SheetLane, type SheetRecording } from "./sheet.ts";

export type Recording = {
  runId: string;
  reported: Record<string, number>;
  withheld: string[];
  uncategorized: number;
  duplicateFlagged: boolean;
  finalReadNote: string;
};
export type Recordings = {
  cloud: Recording;
  hybrid: Recording;
  router: { date: string; worker: string; seconds: number; file: string };
};

export type TotalRow = { category: string; reported: number | null; truth: number; ok: boolean };

export type Lane = {
  mode: Run["mode"];
  run: TimedRun;
  estimate: Estimate | null;
  finalReadNote: string;
  rows: TotalRow[];
  totalsRight: number;
  checks: Check[];
  withheld: { category: string; value: number }[];
};

export type ReplayData = {
  fileSpend: number;
  income: number;
  txnCount: number;
  cloud: Lane;
  hybrid: Lane;
  budget: { cloud: SheetLane; hybrid: SheetLane };
  rerunGap: Range | null;
  groups: Group[];
  headline: Headline;
  router: {
    date: string;
    worker: string;
    seconds: number;
    checks: Check[];
    rows: TotalRow[];
    totalsRight: number;
    labels: { correct: number; total: number; mislabels: Mislabel[] };
  };
};

const SPEND = CATEGORIES.filter((c) => c !== "Income");

function rows(reported: Record<string, number>, truth: Record<string, number>): TotalRow[] {
  return SPEND.map((category) => {
    const r = reported[category] ?? null;
    return { category, reported: r, truth: truth[category], ok: r !== null && Math.abs(r - truth[category]) < 0.005 };
  });
}

function lane(mode: Run["mode"], rec: Recording, runs: Run[], txns: Txn[], truth: Record<string, number>): Lane {
  const run = runs.find((r) => r.id === rec.runId);
  if (!run) throw new Error(`run ${rec.runId} is not in runs.json`);
  if (run.panelAtFinish === null || run.seconds === null) throw new Error(`run ${rec.runId} has no panel or time reading`);
  const table = rows(rec.reported, truth);
  const dups = findDuplicates(txns);
  const checks: Check[] = [
    {
      name: "Every transaction has a category",
      passed: rec.uncategorized === 0,
      detail: rec.uncategorized === 0 ? "nothing left over" : `$${rec.uncategorized.toFixed(2)} left uncategorized in the report`,
    },
    ...compareReported(truth, rec.reported),
    {
      name: "Same-day, same-amount charges flagged",
      passed: rec.duplicateFlagged || dups.length === 0,
      detail: dups.length ? `file has ${dups.length}: ${dups[0][0].description} $${Math.abs(dups[0][0].amount).toFixed(2)} twice on ${dups[0][0].date}` : "none in the file",
    },
  ];
  return {
    mode,
    run: run as TimedRun,
    estimate: estimate(runs, run.task, mode),
    finalReadNote: rec.finalReadNote,
    rows: table,
    totalsRight: table.filter((r) => r.ok).length,
    checks,
    withheld: rec.withheld.map((category) => ({ category, value: truth[category] })),
  };
}

export type BudgetRecordings = { cloud: SheetRecording; hybrid: SheetRecording };

export function buildReplay(csv: Txn[], runs: Run[], rec: Recordings, routerAssignments: Assignment[], budget: BudgetRecordings): ReplayData {
  // Ground truth for grading: the answer key's labels, totals computed in code.
  const key = verify(csv, csv.map((t) => ({ id: t.id, category: keyCategory(t.description) })));
  const routed = verify(csv, routerAssignments);
  const routerRows = rows(routed.totals, key.totals);
  return {
    fileSpend: key.totalSpend,
    income: key.income,
    txnCount: csv.length,
    cloud: lane("cloud", rec.cloud, runs, csv, key.totals),
    hybrid: lane("hybrid", rec.hybrid, runs, csv, key.totals),
    budget: { cloud: checkSheet("cloud", budget.cloud, runs, csv), hybrid: checkSheet("hybrid", budget.hybrid, runs, csv) },
    rerunGap: cloudGap(runs, "file_report"),
    groups: groupRuns(runs),
    headline: headline(runs),
    router: {
      date: rec.router.date,
      worker: rec.router.worker,
      seconds: rec.router.seconds,
      checks: routed.checks,
      rows: routerRows,
      totalsRight: routerRows.filter((r) => r.ok).length,
      labels: labelAccuracy(csv, routerAssignments),
    },
  };
}

export function parseJsonl(text: string): Assignment[] {
  return text.trim().split(/\r?\n/).map((line) => JSON.parse(line) as Assignment);
}
