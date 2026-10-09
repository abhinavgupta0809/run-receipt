import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { checkOutput, coverage, disagreements, parsePrices, skillFile, type App } from "@/lib/skill.ts";
import { range, type Run } from "@/lib/estimate.ts";
import { credits, span } from "../format";
import Builder from "./builder";
import Demo from "./demo";

export const metadata: Metadata = {
  title: "Session to Skill",
  description: "Do a task three times, get asked once, and your sessions become a skill you can call with a slash command.",
};

const read = (name: string) => readFileSync(path.join(process.cwd(), "data", name), "utf8");
const SKILL_NAME = "App price comparison";
const usd = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

type Sessions = { task: string; prompt: string; variation: string; apps: App[]; sessions: { runId: string; when: string; file: string }[] };

// Built at build time from three real sessions that used the same prompt.
export default function SkillPage() {
  const s = JSON.parse(read("skill/sessions.json")) as Sessions;
  const runs = (JSON.parse(read("runs.json")) as { runs: Run[] }).runs;
  const sessions = s.sessions.map((x) => {
    const md = read(`skill/${x.file}`);
    const run = runs.find((r) => r.id === x.runId);
    if (!run) throw new Error(`run ${x.runId} is not in runs.json`);
    return { runId: x.runId, when: x.when, credits: run.final, seconds: run.seconds, prices: parsePrices(md), checks: checkOutput(md, s.apps) };
  });
  const diffs = disagreements(sessions);
  const cost = range(sessions.map((x) => x.credits))!;
  const checkNames = sessions[0].checks.map((c) => c.name);
  // The one price the runs disagreed on, as each run reported it.
  const d = diffs[0];
  const reported = (runId: string) => {
    const v = d?.values.find((x) => x.runId === runId);
    return v && d ? `${d.plan} at ${usd(v.value)} a month` : "its prices";
  };
  const file = skillFile({
    name: SKILL_NAME,
    template: s.prompt,
    inputs: [],
    rules: [],
    checks: checkNames,
    cost: `${cost.min.toFixed(2)} to ${cost.max.toFixed(2)} credits, from ${cost.n} measured runs of this prompt.`,
  });
  const command = `/${SKILL_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <main className="sk">
      <header className="sk-hero">
        <h1>Session to Skill</h1>
        <p className="sum-lede">Do a task {sessions.length} times, get asked once, and your sessions become a skill you can call with a slash command.</p>
      </header>

      <section aria-labelledby="need">
        <h2 id="need" className="sum-h2">The need</h2>
        <p className="sk-intro">Skills are saved instructions an agent can reuse. Making one today starts from a blank page.</p>
        <div className="sk-need">
          <article>
            <Icon kind="blank" />
            <h3>You have to know the skill before you need it.</h3>
            <p>People find out a task is worth saving after they have repeated it, not before.</p>
          </article>
          <article>
            <Icon kind="write" />
            <h3>Writing a skill is hard if AI is not your job.</h3>
            <p>A skill needs a prompt, inputs, rules and a way to check the result. Most people have never written one.</p>
          </article>
          <article className="sk-seen">
            <Icon kind="eye" />
            <h3>What I saw</h3>
            <p>I ran one prompt {sessions.length} times, word for word, in a day. On Oct 2 to 4, 2026 the session menu showed no save-as-skill option and the skill builder had no test step. One menu was not checked.</p>
          </article>
        </div>
        <p className="sum-note sk-after">My read of the gap. I have not interviewed Perplexity users about Skills.</p>
      </section>

      <section aria-labelledby="solution" className="sum-band sk-band">
        <h2 id="solution" className="sum-h2">The solution: the skill comes out of the work</h2>
        <ol className="sk-flow">
          <li><span>1</span><h3>Repeat a task</h3><p>Do it two or three times, the way you already do.</p></li>
          <li><span>2</span><h3>Get asked</h3><p>&ldquo;You have done this {sessions.length} times. Turn it into a skill?&rdquo;</p></li>
          <li><span>3</span><h3>Say yes</h3><p>The skill is written for you in Markdown, so anyone can read it.</p></li>
          <li><span>4</span><h3>Call it</h3><p>Next time, type <code className="fig">{command}</code>.</p></li>
        </ol>
      </section>

      <section aria-labelledby="demo">
        <h2 id="demo" className="sum-h2">Watch it happen</h2>
        <Demo
          prompt={s.prompt}
          runs={sessions.map((x) => ({ runId: x.runId, when: x.when, credits: credits(x.credits), reported: reported(x.runId) }))}
          file={file}
          command={command}
          name={SKILL_NAME}
          checks={checkNames.length}
          cost={span(cost, credits)}
        />
      </section>

      <section aria-labelledby="builder" className="sk-builder">
        <h2 id="builder" className="sum-h2">The working builder</h2>
        <p className="sk-intro">The same {sessions.length} sessions, step by step: what the runs disagreed on, the rules, and the test your past outputs fail. Plain code, no model.</p>
        <details>
          <summary>Open the working builder</summary>
          <Builder
            prompt={s.prompt}
            variation={s.variation}
            sessions={sessions.map((x) => ({ runId: x.runId, when: x.when, credits: x.credits, seconds: x.seconds, checks: x.checks }))}
            disagreements={diffs}
            coverage={coverage(sessions)}
            cost={cost}
          />
        </details>
      </section>
    </main>
  );
}

// Small authored line icons, one stroke weight.
function Icon({ kind }: { kind: "blank" | "write" | "eye" }) {
  const paths = {
    blank: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h3" strokeDasharray="1.5 2.5" /></>,
    write: <><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13 7l4 4" /></>,
    eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.6" /></>,
  };
  return <svg className="sk-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
