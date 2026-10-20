import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { checkOutput, disagreements, parsePrices, skillFile, type App } from "@/lib/skill.ts";
import { range, type Run } from "@/lib/estimate.ts";
import { credits, span } from "../format";
import DeviceToggle from "../device";
import { Persona } from "../persona";
import Demo from "./demo";

export const metadata: Metadata = {
  title: "Session to Skill",
  description: "Do a task three times, get asked once, and your sessions become a skill you can call with a slash command.",
};

const read = (name: string) => readFileSync(path.join(process.cwd(), "data", name), "utf8");
const SKILL_NAME = "App price comparison";
const WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
const countWord = (x: number) => WORDS[x] ?? String(x);
const usd = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

type Sessions = { task: string; prompt: string; variation: string; apps: App[]; sessions: { runId: string; when: string; file: string }[] };

// The one-minute template: problem, solution (the demo), metrics, trade-offs, then research in folds.
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
    <main className="sk tp">
      <header className="tp-intro">
        <p className="tp-independent">Prototype · independent, not made by or with Perplexity</p>
        <h1>Session to Skill</h1>
        <p className="sum-lede">Do a task {sessions.length} times, get asked once, and it becomes a skill you call with a slash command.</p>
        <p className="sum-actions"><a href="#solution" className="btn">Try the prototype ↓</a></p>
      </header>

      <section aria-label="Who it's for">
        <Persona tone="sk" icon="repeat" name="The repeat-task user"
          line="Runs the same job again and again: a weekly report, a price check, a filing."
          facts={[
            { icon: "repeat", value: String(sessions.length), label: "runs of one prompt, word for word, in one day of my sessions" },
            { icon: "coins", value: `${credits(cost.min)}–${credits(cost.max)}`, label: "credits paid each time to redo the same steps" },
          ]}
          why={<>Repeated work is where a tool becomes a habit. If Computer keeps the recipe, people come back to it instead of a blank prompt (my assumption).</>}
          evidence="Based on my own sessions. No review asks for this yet, so it needs testing with users." />
      </section>

      <section aria-labelledby="problem-h">
        <p className="tp-eyebrow">Problem</p>
        <h2 id="problem-h" className="tp-statement">You only know a task is worth saving after you&apos;ve repeated it. Then a skill starts from a blank page.</h2>
        <p className="tp-quote">
          <span className="tp-tag">My test</span>
          <span>I ran one prompt {sessions.length} times, word for word, in a day. On Oct 2 to 4, 2026 the session menu had no save-as-skill option.</span>
        </p>
      </section>

      <section id="solution" aria-labelledby="solution-h">
        <div className="solution-head">
          <div>
            <p className="tp-eyebrow">Solution</p>
            <h2 id="solution-h" className="sum-h2">The skill comes out of the work: {sessions.length} runs, one offer, one command</h2>
          </div>
          <DeviceToggle />
        </div>
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

      <section aria-labelledby="metrics-h">
        <p className="tp-eyebrow">Metrics</p>
        <h2 id="metrics-h" className="sum-h2">Saved skills get used again, and never hide a failed check</h2>
        <div className="brief-metrics">
          <article className="bm-card star skill">
            <span className="bm-label">North star</span>
            <p className="bm-name">Skills run again</p>
            <p className="bm-formula">Skills run at least twice in the 14 days after saving ÷ skills saved from an offer.</p>
            <p className="bm-now">No baseline yet: only I have used it. In my own sessions, one prompt came back {sessions.length} times in a day.</p>
          </article>
          <article className="bm-card">
            <span className="bm-label">Guardrails</span>
            <ul className="bm-list">
              <li><span>A failed check shown without a flag</span><span className="th">never</span></li>
              <li><span>Offers turned down</span><span className="th">set after baseline</span></li>
            </ul>
          </article>
          <article className="bm-card">
            <span className="bm-label">Supporting</span>
            <ul className="bm-list">
              <li><span>Offers accepted ÷ offers shown</span><span className="th">set after baseline</span></li>
              <li><span>Repeat prompts sent as a slash command</span><span className="th">set after baseline</span></li>
            </ul>
          </article>
        </div>
        <p className="bm-gate">All proposals. The bars get set after a baseline week of real use.</p>
      </section>

      <section aria-labelledby="trade-h">
        <p className="tp-eyebrow">Trade-offs</p>
        <h2 id="trade-h" className="sum-h2">What I gave up, on purpose</h2>
        <div className="tradeoffs">
          <article className="trade"><h3>Ask after {countWord(sessions.length)} runs, never auto-save</h3><p><b>Over</b>saving skills silently</p><p><b>Cost</b>fewer skills get made</p></article>
          <article className="trade"><h3>Plain Markdown, not a hidden config</h3><p><b>Over</b>a polished settings screen</p><p><b>Cost</b>looks rough to people new to AI</p></article>
          <article className="trade"><h3>Keep the prompt, don&apos;t rewrite it</h3><p><b>Over</b>a model generalising the sessions</p><p><b>Cost</b>one skill per exact task, no inputs yet</p></article>
        </div>
      </section>

      <section aria-labelledby="more-h">
        <p className="tp-eyebrow">Research</p>
        <h2 id="more-h" className="sum-h2">For anyone who wants to dig in</h2>
        <div className="rfolds">
          <details className="rfold">
            <summary><strong>The need</strong><span>Why a blank page is the wrong start</span></summary>
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
                <p>I ran one prompt {sessions.length} times, word for word, in a day. On Oct 2 to 4, 2026 the session menu showed no save-as-skill option and the skill builder had no test step. I did not check one menu.</p>
              </article>
            </div>
            <p className="sum-note sk-after">My read of the gap. I have not interviewed Perplexity users about Skills.</p>
          </details>
          <details className="rfold sk-result">
            <summary><strong>From {sessions.length} runs to one skill</strong><span>The real sessions, and the skill they become</span></summary>
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
          </details>
          <details className="rfold sum-limits">
            <summary><strong>What this prototype doesn&apos;t show</strong><span>Limits</span></summary>
            <ul>
              <li>The skill is written by plain code from the {sessions.length} saved outputs, with no model in the loop.</li>
              <li>It does not hook into Perplexity&apos;s product. The offer, the build and the command are my proposal.</li>
              <li>Still open: where the offer appears in the product, a second example with real inputs, and corrections saved as rules.</li>
            </ul>
          </details>
        </div>
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
