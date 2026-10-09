import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/verify.ts";
import { buildReplay, parseJsonl, type BudgetRecordings, type Recordings } from "@/lib/replay.ts";
import type { Run } from "@/lib/estimate.ts";
import type { Gate } from "@/lib/study.ts";

const read = (name: string) => readFileSync(path.join(process.cwd(), "data", name), "utf8");

// Read once at build time from the recordings in data/, so the hosted link works with the Mac off.
export function load() {
  const runs = (JSON.parse(read("runs.json")) as { runs: Run[] }).runs;
  const rec = JSON.parse(read("recordings.json")) as Recordings;
  const budget = JSON.parse(read("recordings-budget.json")) as BudgetRecordings;
  const gate = (JSON.parse(read("gate.json")) as { gate: Gate }).gate;
  const txns = parseCsv(read("september_2026_transactions.csv"));
  const replay = buildReplay(txns, runs, rec, parseJsonl(read(rec.router.file)), budget);
  return { runs, rec, budget, gate, txns, replay };
}
