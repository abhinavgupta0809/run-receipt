import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { checkOutput, disagreements, parsePrices, skillFile, type App } from "@/lib/skill.ts";
import { range, type Run } from "@/lib/estimate.ts";
import { credits, span } from "../format";
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

      <section aria-labelledby="result" className="sk-result">
        <h2 id="result" className="sum-h2">From {sessions.length} runs to one skill</h2>
        <p className="sk-intro">This is the task from the demo, for real: one prompt I ran {sessions.length} times, and the skill those runs turn into.</p>
        <div className="sk-out">
          <div className="sk-runs">
            <h3>You did this {sessions.length} times</h3>
            <p className="sk-prompt">&ldquo;{s.prompt}&rdquo;</p>
            <ol>
              {sessions.map((x) => (
                <li key={x.runId}>
                  <span>Run {x.runId}</span>
                  <span className="sk-when">{x.when}</span>
                  <b className="fig">{credits(x.credits)} credits</b>
                </li>
              ))}
            </ol>
            {d && (
              <p className="sk-diff">
                The answers disagreed once: <b>{d.plan}</b> came back at {d.values.map((v) => usd(v.value)).join(", ")} a month. So the skill checks its own result.
              </p>
            )}
          </div>
          <div className="sk-arrow" aria-hidden="true">
            <svg width="44" height="24" viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h38M32 4l8 8-8 8" /></svg>
          </div>
          <div className="sk-card">
            <p className="sk-card-top"><span>The skill</span><code className="fig">{command}</code></p>
            <h3>{SKILL_NAME}</h3>
            <dl>
              <div>
                <dt>What it does</dt>
                <dd>{s.prompt}</dd>
              </div>
              <div>
                <dt>What it checks before showing a result</dt>
                <dd>
                  <ul>{checkNames.map((c) => <li key={c}>{c}</li>)}</ul>
                </dd>
              </div>
              <div>
                <dt>What it will cost</dt>
                <dd><b className="fig">{span(cost, credits)} credits</b>, from your {cost.n} runs</dd>
              </div>
            </dl>
          </div>
        </div>
        <details className="fold sk-fold">
          <summary>The skill file itself, in Markdown</summary>
          <pre className="demo-file sk-raw">{file}</pre>
        </details>
        <p className="sum-note sk-after">A prototype. The skill is written by plain code from the {sessions.length} saved outputs, with no model in the loop, and does not hook into Perplexity&apos;s product.</p>
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
