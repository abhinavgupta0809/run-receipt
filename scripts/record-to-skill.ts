// Recording -> SKILL.md -> saved Perplexity skill -> a run that uses it.
// Run: node --env-file-if-exists=.env.local scripts/record-to-skill.ts <recording.json>... [--out dir] [--reuse] [--save] [--run "question"] [--delete]
// Pass several recordings of the same kind of task to get one general skill.
// Without --save it only writes the skill. --run needs --save. --delete removes the saved skill at the end;
// without it the skill stays saved and its id goes into write.json for the live demo.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Perplexity from "@perplexity-ai/perplexity_ai";
import { answer, client, uploadSkill } from "../lib/perplexity.ts";
import { compact, parseRecording, renderSkillMd, writeSkill, type SkillPlan } from "../lib/skillwriter.ts";

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const value = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);

async function main() {
  const firstFlag = args.findIndex((a) => a.startsWith("--"));
  const files = firstFlag < 0 ? args : args.slice(0, firstFlag);
  if (files.length === 0) throw new Error("Pass one or more recording files exported from the extension");
  const recs = files.map((f) => parseRecording(readFileSync(f, "utf8")));
  const out = value("--out") ?? path.dirname(files[0]);
  mkdirSync(out, { recursive: true });

  const summaries = recs.map((r) => {
    const lines = compact(r).timeline.split("\n");
    console.log(`recording: ${r.goal || "(no goal)"}: ${r.events.length} events -> ${lines.length} steps, ${r.shots.length} screenshots`);
    return { goal: r.goal, recordedOn: r.recordedOn ?? new Date(r.startedAt).toLocaleDateString("en-CA"), events: r.events.length, screenshots: r.shots.length, lines };
  });
  const sessions = summaries.map((x) => ({ recordedOn: x.recordedOn, goal: x.goal, steps: x.lines.length }));
  writeFileSync(path.join(out, "sessions.json"), JSON.stringify(summaries, null, 2));

  // --reuse keeps the skill already written in --out instead of asking the model again.
  const reuse = flag("--reuse");
  const { plan, leaks, costUsd, model } = reuse
    ? { plan: JSON.parse(readFileSync(path.join(out, "skill-plan.json"), "utf8")) as SkillPlan, ...(JSON.parse(readFileSync(path.join(out, "write.json"), "utf8")) as { leaks: string[]; costUsd: number; model: string }) }
    : await writeSkill(recs);
  const md = reuse ? readFileSync(path.join(out, "SKILL.md"), "utf8") : renderSkillMd(plan, sessions);
  const written = reuse ? JSON.parse(readFileSync(path.join(out, "write.json"), "utf8")) : { model, costUsd, leaks, writtenOn: new Date().toLocaleDateString("en-CA") };
  if (!reuse) {
    writeFileSync(path.join(out, "SKILL.md"), md);
    writeFileSync(path.join(out, "skill-plan.json"), JSON.stringify(plan, null, 2));
    writeFileSync(path.join(out, "write.json"), JSON.stringify(written, null, 2));
  }
  console.log(`${reuse ? "reuse" : "write"}: ${model}, $${costUsd.toFixed(4)}, ${plan.name}: ${plan.steps.length} steps, ${plan.inputs.length} inputs, ${plan.checks.length} checks -> ${path.join(out, "SKILL.md")}`);
  if (leaks.length) console.log(`warning: site names still in the general text: ${leaks.join(", ")}`);

  if (!flag("--save")) return;
  const skill = await uploadSkill(plan.name, md);
  console.log(`save: ${skill.skill_id} (${skill.name})`);
  if (!flag("--delete")) writeFileSync(path.join(out, "write.json"), JSON.stringify({ ...written, skillId: skill.skill_id }, null, 2));
  try {
    const question = value("--run");
    if (question) {
      const started = Date.now();
      const a = await answer(question, { skillId: skill.skill_id });
      const seconds = Math.round((Date.now() - started) / 1000);
      writeFileSync(path.join(out, "run.json"), JSON.stringify({ question, ranOn: new Date().toLocaleDateString("en-CA"), seconds, ...a }, null, 2));
      console.log(`run: ${a.status}, ${a.model}, $${a.costUsd}, ${a.citations.length} cited, ${a.searched.length} searched -> ${path.join(out, "run.json")}`);
    }
  } finally {
    if (flag("--delete")) {
      const latest = await client().skills.retrieve(skill.skill_id);
      await client().skills.delete(skill.skill_id, { expected_revision: latest.latest_revision ?? "" });
      console.log("delete: ok");
    }
  }
}

main().catch((e) => {
  if (e instanceof Perplexity.APIError) {
    console.log(`HTTP ${e.status}`, e.message);
    process.exit(1);
  }
  throw e;
});
