// Figures for the case study page. Nothing here is modelled: every value is a count,
// a min and max, or a ratio of measured runs. Runs are grouped only through groupRuns,
// so Mac and web, effort levels, and local and non-local Hybrid runs are never pooled.

import { undercount, type Range, type Run } from "./estimate.ts";
import { groupRuns, type Group } from "./summary.ts";

// How the measurement was set up. These are protocol facts, not measurements.
// Sources: the "source" line of data/runs.json and Run Test Kit/MEASUREMENT PLAN.md.
export const PROTOCOL = {
  period: "Oct 2 to Oct 8, 2026",
  account: "Perplexity Education Pro",
  localModel: "Gemma 4 E4B",
  usdPerCredit: 0.01,
  stopRuleCredits: 300,
};

export type GateStatus = "appeared" | "did not appear" | "no file" | "not captured";
export type Gate = Record<string, GateStatus>;

const round2 = (n: number) => Math.round(n * 100) / 100;

// A run's `correct` field is a list of "right/total" scores. True when every score is full,
// null when the run was not graded.
export function fullMarks(r: Run): boolean | null {
  const scores = [...(r.correct ?? "").matchAll(/(\d+)\/(\d+)/g)];
  if (scores.length === 0) return null;
  return scores.every((m) => m[1] === m[2]);
}

export type Side = {
  runIds: string[];
  credits: Range;
  seconds: Range | null;
  untimed: number; // runs in this group with no time reading
  fromScreenshots: boolean; // at least one time came from screenshot timestamps, not the app
  results: string[];
  fullMarks: boolean | null;
};

export type Pair = {
  task: string;
  label: string;
  gate: GateStatus;
  ranLocal: boolean;
  cloud: Side;
  hybrid: Side;
  hybridCost: "lower" | "higher" | "overlaps";
  hybridVsCloudPct: Range; // signed: negative means Hybrid cost less
};

function side(g: Group, runs: Run[]): Side {
  const rs = runs.filter((r) => g.runIds.includes(r.id));
  const marks = rs.map(fullMarks).filter((m) => m !== null);
  return {
    runIds: g.runIds,
    credits: g.credits,
    seconds: g.seconds,
    untimed: rs.filter((r) => r.seconds === null).length,
    fromScreenshots: rs.some((r) => r.seconds !== null && r.secondsNote !== undefined),
    results: [...new Set(rs.map((r) => r.correct).filter((c): c is string => c !== null))],
    fullMarks: marks.length === 0 ? null : marks.every(Boolean),
  };
}

// Mac-app tasks that were run both with Hybrid off and with Hybrid on.
export function pairs(runs: Run[], gate: Gate): Pair[] {
  const groups = groupRuns(runs);
  const out: Pair[] = [];
  for (const task of [...new Set(groups.map((g) => g.task))]) {
    const cloud = groups.find((g) => g.task === task && g.setting === "Mac app, cloud");
    const hybrid = groups.find((g) => g.task === task && g.setting.startsWith("Mac app, Hybrid"));
    if (!cloud || !hybrid) continue;
    const c = cloud.credits;
    const h = hybrid.credits;
    out.push({
      task,
      label: cloud.label,
      gate: gate[hybrid.runIds[0]],
      ranLocal: hybrid.setting === "Mac app, Hybrid, ran locally",
      cloud: side(cloud, runs),
      hybrid: side(hybrid, runs),
      hybridCost: h.max < c.min ? "lower" : h.min > c.max ? "higher" : "overlaps",
      hybridVsCloudPct: { min: Math.round(((h.min - c.max) / c.max) * 100), max: Math.round(((h.max - c.min) / c.min) * 100), n: Math.min(c.n, h.n) },
    });
  }
  return out;
}

export type PanelReading = { id: string; label: string; setting: string; panel: number; final: number; shownPct: number; lowPct: number };

// One row per run that has a panel reading at "Finished": how much of the final charge it showed.
export function panelReadings(runs: Run[]): PanelReading[] {
  const out: PanelReading[] = [];
  for (const g of groupRuns(runs)) {
    for (const id of g.runIds) {
      const r = runs.find((x) => x.id === id)!;
      const low = undercount(r);
      if (r.panelAtFinish === null || low === null) continue;
      out.push({ id, label: g.label, setting: g.setting, panel: r.panelAtFinish, final: r.final, shownPct: round2(100 - low), lowPct: low });
    }
  }
  return out;
}

// The repeated prompt whose cost landed furthest apart, run by run, cheapest first.
export function widestRepeatRuns(runs: Run[]): { label: string; setting: string; runs: { id: string; final: number }[] } {
  const spread = (g: Group) => (g.credits.max - g.credits.min) / g.credits.min;
  const g = groupRuns(runs).filter((x) => x.credits.n > 1).reduce((a, b) => (spread(b) > spread(a) ? b : a));
  const rs = runs.filter((r) => g.runIds.includes(r.id)).map((r) => ({ id: r.id, final: r.final }));
  return { label: g.label, setting: g.setting, runs: rs.sort((a, b) => a.final - b.final) };
}

// Every setting one prompt was run under, each kept as its own row.
export function settingsFor(runs: Run[], task: string): Group[] {
  return groupRuns(runs).filter((g) => g.task === task);
}

export type Tally = {
  planned: number;
  earlyTests: number;
  taskLabels: string[];
  totalCredits: number;
  totalUsd: number;
  localRuns: number;
  localRunsNotFullMarks: number;
  hybridNotLocal: number;
  hybridNotLocalGraded: number;
  hybridNotLocalFullMarks: number;
  pairs: number;
  pairsLocal: number;
  pairsHybridLower: number;
  pairsHybridHigher: number;
  fileTasksGated: string[];
  fileTasksNotGated: string[];
  gateWithHybridOff: string[]; // run ids where the dialog appeared on a cloud run
  gateNotCaptured: string[];
  screenshotTimed: string[]; // run ids whose time is from screenshot timestamps
  untimed: string[]; // run ids with no time reading
  webRuns: number;
  highestFinal: number;
  pairsWithRepeats: string[]; // paired tasks with more than one run on each side
};

export function tally(runs: Run[], gate: Gate): Tally {
  const groups = groupRuns(runs);
  const labelOf = (task: string) => groups.find((g) => g.task === task)!.label;
  const hybrid = runs.filter((r) => r.mode === "hybrid");
  const local = hybrid.filter((r) => r.ranLocal);
  const notLocal = hybrid.filter((r) => !r.ranLocal);
  const ps = pairs(runs, gate);
  const total = round2(runs.reduce((s, r) => s + r.final, 0));
  const tasksWhere = (status: GateStatus) => [...new Set(runs.filter((r) => gate[r.id] === status).map((r) => r.task))];
  const gated = tasksWhere("appeared");
  return {
    planned: runs.filter((r) => !r.id.startsWith("0")).length,
    earlyTests: runs.filter((r) => r.id.startsWith("0")).length,
    taskLabels: [...new Set(groups.map((g) => g.label))],
    totalCredits: total,
    totalUsd: round2(total * PROTOCOL.usdPerCredit),
    localRuns: local.length,
    localRunsNotFullMarks: local.filter((r) => fullMarks(r) === false).length,
    hybridNotLocal: notLocal.length,
    hybridNotLocalGraded: notLocal.filter((r) => fullMarks(r) !== null).length,
    hybridNotLocalFullMarks: notLocal.filter((r) => fullMarks(r) === true).length,
    pairs: ps.length,
    pairsLocal: ps.filter((p) => p.ranLocal).length,
    pairsHybridLower: ps.filter((p) => p.hybridCost === "lower").length,
    pairsHybridHigher: ps.filter((p) => p.hybridCost === "higher").length,
    fileTasksGated: gated.map(labelOf),
    fileTasksNotGated: tasksWhere("did not appear").filter((t) => !gated.includes(t)).map(labelOf),
    gateWithHybridOff: runs.filter((r) => r.mode === "cloud" && gate[r.id] === "appeared").map((r) => r.id),
    gateNotCaptured: runs.filter((r) => gate[r.id] === "not captured").map((r) => r.id),
    screenshotTimed: runs.filter((r) => r.seconds !== null && r.secondsNote !== undefined).map((r) => r.id),
    untimed: runs.filter((r) => r.seconds === null).map((r) => r.id),
    webRuns: runs.filter((r) => r.surface === "web").length,
    highestFinal: Math.max(...runs.map((r) => r.final)),
    pairsWithRepeats: ps.filter((p) => p.hybridVsCloudPct.n > 1).map((p) => p.label),
  };
}

// The middle panel reading: how far below the final charge the panel typically sat at "Finished", in percent.
export function medianLowPct(readings: PanelReading[]): number {
  const xs = readings.map((r) => r.lowPct).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const mid = Math.floor(xs.length / 2);
  return round2(xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2);
}

// Starting bars for the proposed metrics. These are proposals, not measurements: Perplexity would reset
// each one after a baseline week. padPct is how far the shown range is widened at each end.
export const PROPOSED = { hitRatePct: 80, padPct: 20, widthPct: 50, meterGapPct: 2, runsSentDropPct: 5 };

const median = (values: number[]) => {
  const xs = [...values].sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
};

// Would the receipt's range have held? For every prompt and setting run more than once, take each run out
// in turn, build the range from the runs that are left, widen it by padPct at each end, and see whether the
// run that was taken out lands inside. Also the median width of the widened ranges, as a share of the low end.
export function rangeBacktest(runs: Run[], padPct = 0): { hits: number; n: number; medianWidthPct: number } {
  const pad = padPct / 100;
  let hits = 0, n = 0;
  const widths: number[] = [];
  for (const g of groupRuns(runs).filter((x) => x.credits.n > 1)) {
    const finals = g.runIds.map((id) => runs.find((r) => r.id === id)!.final);
    widths.push(((g.credits.max * (1 + pad) - g.credits.min * (1 - pad)) / g.credits.min) * 100);
    finals.forEach((held, i) => {
      const rest = finals.filter((_, j) => j !== i);
      n += 1;
      if (held >= Math.min(...rest) * (1 - pad) && held <= Math.max(...rest) * (1 + pad)) hits += 1;
    });
  }
  return { hits, n, medianWidthPct: Math.round(median(widths)) };
}

// Median of the final charge minus the panel reading at "Finished", in credits.
export function medianGapCredits(readings: PanelReading[]): number {
  return round2(median(readings.map((r) => r.final - r.panel)));
}
