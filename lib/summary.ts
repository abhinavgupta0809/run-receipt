// Rolls the measured runs up for the page: one row per task and setting, plus a few counts.
// Runs are only grouped when they share task, surface, mode, effort and whether anything ran locally.

import { range, undercount, type Range, type Run } from "./estimate.ts";

const TASKS: [string, string][] = [
  ["file_report", "Bank report from a CSV"],
  ["budget_spreadsheet", "Excel budget from a CSV"],
  ["invoice_summary", "Invoice summary from a CSV"],
  ["lab_flags", "Lab results flags from a CSV"],
  ["emails", "Three short emails"],
  ["web_summary", "Web pricing summary"],
  ["pricing_comparison", "Price comparison, 3 apps"],
  ["website", "One-page website"],
  ["slides", "5-slide deck"],
  ["research_brief", "Two-page research brief"],
  ["note_apps", "Comparison of 5 apps"],
];

export function setting(r: Run): string {
  if (r.surface === "web") return `Web, ${r.effort === "high" ? "High" : "Standard"} effort`;
  if (r.mode === "cloud") return "Mac app, cloud";
  return r.ranLocal ? "Mac app, Hybrid, ran locally" : "Mac app, Hybrid on, nothing ran locally";
}

export type Group = {
  task: string;
  label: string;
  setting: string;
  runIds: string[];
  credits: Range;
  seconds: Range | null;
  undercountPct: Range | null;
};

export function groupRuns(runs: Run[]): Group[] {
  const groups: Group[] = [];
  for (const [task, label] of TASKS) {
    const settings = [...new Set(runs.filter((r) => r.task === task).map(setting))];
    for (const s of settings) {
      const rs = runs.filter((r) => r.task === task && setting(r) === s);
      groups.push({
        task,
        label,
        setting: s,
        runIds: rs.map((r) => r.id),
        credits: range(rs.map((r) => r.final))!,
        seconds: range(rs.map((r) => r.seconds)),
        undercountPct: range(rs.map(undercount)),
      });
    }
  }
  return groups;
}

export type Headline = {
  runs: number;
  taskTypes: number;
  hybridOn: number;
  hybridRanLocal: number;
  panelReadings: number;
  panelLow: number;
  panelLowPct: Range;
  widestRepeat: { label: string; credits: Range; spreadPct: number };
  effort: { standard: number; high: number; times: number } | null;
};

export function headline(runs: Run[]): Headline {
  const hybrid = runs.filter((r) => r.mode === "hybrid");
  const lows = runs.map(undercount).filter((x): x is number => x !== null);
  // Same prompt, same setting, run more than once: how far apart did the cost land?
  const repeats = groupRuns(runs).filter((g) => g.credits.n > 1);
  const spread = (g: Group) => Math.round(((g.credits.max - g.credits.min) / g.credits.min) * 100);
  const widest = repeats.reduce((a, b) => (spread(b) > spread(a) ? b : a));
  const std = runs.find((r) => r.task === "note_apps" && r.effort === "standard");
  const high = runs.find((r) => r.task === "note_apps" && r.effort === "high");
  return {
    runs: runs.length,
    taskTypes: new Set(runs.map((r) => r.task)).size,
    hybridOn: hybrid.length,
    hybridRanLocal: hybrid.filter((r) => r.ranLocal).length,
    panelReadings: lows.length,
    panelLow: lows.filter((x) => x > 0).length,
    panelLowPct: range(lows)!,
    widestRepeat: { label: widest.label, credits: widest.credits, spreadPct: spread(widest) },
    effort: std && high ? { standard: std.final, high: high.final, times: Math.round((high.final / std.final) * 10) / 10 } : null,
  };
}
