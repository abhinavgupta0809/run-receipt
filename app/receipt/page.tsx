import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { estimate } from "@/lib/estimate.ts";
import { widestRepeatRuns } from "@/lib/study.ts";
import { load } from "../data";
import Replay from "./replay";

export const metadata: Metadata = {
  title: "Prototype",
  description: "A replay of recorded Perplexity Computer runs as a receipt: plan and cost range before, a provisional credit count during, checks and repairs after.",
};

// The cost example is the prompt whose repeat runs moved the most on one setting, so the range is worth showing.
export default function ReceiptPage() {
  const { runs, replay } = load();
  const repeat = widestRepeatRuns(runs);
  const first = runs.find((r) => r.id === repeat.runs[0].id)!;
  const est = estimate(runs, first.task, first.mode)!;
  const saved = JSON.parse(readFileSync(path.join(process.cwd(), "data", "skill", "sessions.json"), "utf8")) as { task: string; prompt: string };
  const wide = { label: repeat.label, setting: repeat.setting, prompt: saved.task === first.task ? saved.prompt : null, credits: est.credits, seconds: est.seconds };
  return (
    <Replay data={replay} wide={wide} />
  );
}
