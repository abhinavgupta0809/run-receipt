// Credit and time ranges from measured runs. Nothing here is modelled: a range is the
// min and max of what was actually observed, and n says how thin the evidence is.

export type Run = {
  id: string;
  task: string;
  mode: "cloud" | "hybrid"; // hybrid = the Hybrid toggle was on, whether or not anything ran locally
  surface?: "web"; // absent = Mac app
  effort?: "standard" | "high"; // only the web shows an effort control
  ranLocal?: boolean; // hybrid runs only: did a local step actually run
  panelAtFinish: number | null; // null = not captured
  final: number;
  seconds: number | null;
  secondsNote?: string;
  localTokens?: number;
  correct: string | null;
  notes: string;
};

// A run with every reading the replay needs.
export type TimedRun = Run & { panelAtFinish: number; seconds: number };

export type Range = { min: number; max: number; n: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function range(values: (number | null)[]): Range | null {
  const v = values.filter((x): x is number => x !== null);
  if (v.length === 0) return null;
  return { min: Math.min(...v), max: Math.max(...v), n: v.length };
}

// seconds or undercountPct is null when no run in the group has that reading.
export type Estimate = { credits: Range; seconds: Range | null; undercountPct: Range | null };

// Mac-app runs of one task in one mode. Web runs are kept out because effort changes the cost.
export function estimate(runs: Run[], task: string, mode: Run["mode"]): Estimate | null {
  const rs = runs.filter((r) => r.task === task && r.mode === mode && !r.surface);
  const credits = range(rs.map((r) => r.final));
  const seconds = range(rs.map((r) => r.seconds));
  const undercountPct = range(rs.map(undercount));
  return credits ? { credits, seconds, undercountPct } : null;
}

// How far the run panel sat below the final charge when the run said "Finished", in percent.
export function undercount(r: Run): number | null {
  if (r.panelAtFinish === null) return null;
  return round2(((r.final - r.panelAtFinish) / r.final) * 100);
}

// Extra credits a cloud run cost over a Hybrid run of the same task: the widest gap the data allows.
export function cloudGap(runs: Run[], task: string): Range | null {
  const mac = runs.filter((r) => r.task === task && !r.surface);
  const cloud = range(mac.filter((r) => r.mode === "cloud").map((r) => r.final));
  const hybrid = range(mac.filter((r) => r.mode === "hybrid").map((r) => r.final));
  if (!cloud || !hybrid) return null;
  return { min: round2(cloud.min - hybrid.max), max: round2(cloud.max - hybrid.min), n: Math.min(cloud.n, hybrid.n) };
}
