import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { checkOutput, disagreements, parsePrices, type App } from "@/lib/skill.ts";
import { range, type Run } from "@/lib/estimate.ts";
import { day, friendly, sessionLabel } from "@/lib/livedemo.ts";
import type { SkillPlan } from "@/lib/skillwriter.ts";
import type { Citation } from "@/lib/perplexity.ts";
import { credits } from "../format";
import DeviceToggle from "../device";
import { Persona } from "../persona";
import AnswerView from "./answer";
import Demo from "./demo";
import LiveRun from "./live";

export const metadata: Metadata = {
  title: "Session to Skill",
  description: "Do a pricing analysis on two different apps, get asked once, and the method becomes a skill that works on any app. Written and run on Perplexity's Agent API.",
};

const read = (name: string) => readFileSync(path.join(process.cwd(), "data", name), "utf8");
const usd = (n: number, digits = 2) => `$${n.toFixed(digits).replace(/\.00$/, "")}`;
const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
const EXAMPLE = "Pricing analysis for Canva, Miro and Loom: compare their paid plans for one user, monthly vs yearly billing.";

type Sessions = { task: string; prompt: string; variation: string; apps: App[]; sessions: { runId: string; when: string; file: string }[] };
type LiveSession = { goal: string; recordedOn: string; events: number; screenshots: number; lines: string[] };
type Written = { model: string; costUsd: number; leaks: string[]; writtenOn: string; skillId?: string };
type LiveRunData = { question: string; ranOn: string; seconds: number; model: string; text: string; citations: Citation[]; searched: Citation[]; costUsd: number };

// The one-minute template: problem, solution (the demo), proof on Perplexity, metrics, trade-offs, then research in folds.
// The demo and the proof are built from data/skill/live: two recorded sessions, the skill written from them, one real run.
// The research fold keeps the three Computer runs of one prompt that started the idea.
export default function SkillPage() {
  const live = JSON.parse(read("skill/live/sessions.json")) as LiveSession[];
  const plan = JSON.parse(read("skill/live/skill-plan.json")) as SkillPlan;
  const written = JSON.parse(read("skill/live/write.json")) as Written;
  const run = JSON.parse(read("skill/live/run.json")) as LiveRunData;
  const file = read("skill/live/SKILL.md");
  const name = file.match(/^name: (.+)$/m)![1];
  const command = `/${name}`;
  const apps = (run.question.match(/for (.+?):/)?.[1] ?? "").replace(/ and /g, ", ");
  const appWords = apps.split(", ").map((a) => a.toLowerCase());
  const official = run.searched.filter((c) => appWords.some((a) => host(c.url).includes(a)) && /pric/.test(c.url));
  const products = plan.variations.find((v) => /product/i.test(v.what)) ?? plan.variations[0];
  const totalSteps = live.reduce((t, s) => t + s.lines.length, 0);
  const totalShots = live.reduce((t, s) => t + s.screenshots, 0);

  // The three Computer runs of one prompt that started the idea.
  const s = JSON.parse(read("skill/sessions.json")) as Sessions;
  const runs = (JSON.parse(read("runs.json")) as { runs: Run[] }).runs;
  const first = s.sessions.map((x) => {
    const md = read(`skill/${x.file}`);
    const r = runs.find((y) => y.id === x.runId);
    if (!r) throw new Error(`run ${x.runId} is not in runs.json`);
    return { runId: x.runId, when: x.when, credits: r.final, prices: parsePrices(md), checks: checkOutput(md, s.apps) };
  });
  const cost = range(first.map((x) => x.credits))!;
  const d = disagreements(first)[0];

  return (
    <main className="sk tp">
      <header className="tp-intro">
        <p className="tp-independent">Prototype · independent, not made by or with Perplexity</p>
        <h1>Session to Skill</h1>
        <p className="sum-lede">Do a pricing analysis on two different apps, get asked once, and the method becomes a skill that works on any app.</p>
        <p className="sum-actions"><a href="#solution" className="btn">Try the prototype ↓</a> <a href="#proof" className="btn btn-quiet">See it run on Perplexity</a></p>
      </header>

      <section aria-label="Who it's for">
        <Persona tone="sk" icon="repeat" name="The repeat-task user"
          line="Runs the same kind of job again and again: a price check, a weekly report, a filing."
          facts={[
            { icon: "repeat", value: String(first.length), label: "runs of one pricing prompt, word for word, in one day of my sessions" },
            { icon: "coins", value: `${credits(cost.min)}–${credits(cost.max)}`, label: "credits paid each time to redo the same steps" },
          ]}
          why={<>Repeated work is where a tool becomes a habit. If Computer keeps the method, people come back to it instead of a blank prompt (my assumption).</>}
          evidence="Based on my own sessions. No review asks for this yet, so it needs testing with users." />
      </section>

      <section aria-labelledby="problem-h">
        <p className="tp-eyebrow">Problem</p>
        <h2 id="problem-h" className="tp-statement">You only know a task is worth saving after you&apos;ve repeated it. Then a skill starts from a blank page.</h2>
        <p className="tp-quote">
          <span className="tp-tag">My test</span>
          <span>I ran one pricing prompt {first.length} times, word for word, in a day. On Oct 2 to 4, 2026 the session menu had no save-as-skill option.</span>
        </p>
      </section>

      <section id="solution" aria-labelledby="solution-h">
        <div className="solution-head">
          <div>
            <p className="tp-eyebrow">Solution</p>
            <h2 id="solution-h" className="sum-h2">The skill comes out of the work: two sessions on different apps, one offer, one skill for any app</h2>
          </div>
          <DeviceToggle />
        </div>
        <Demo
          sessions={live.map((x) => ({ label: sessionLabel(x.goal), when: day(x.recordedOn), steps: x.lines.length, did: x.lines.map(friendly).filter((l): l is string => l !== null) }))}
          changed={products}
          file={file}
          name={name}
          command={command}
          inputs={plan.inputs.map((i) => i.name.replace(/_/g, " "))}
          checks={plan.checks.length + 1}
          run={{ apps, text: run.text, seconds: run.seconds, cost: usd(run.costUsd, 3), pages: run.searched.length, ranOn: day(run.ranOn) }}
        />
      </section>

      <section id="proof" aria-labelledby="proof-h">
        <p className="tp-eyebrow">Proof</p>
        <h2 id="proof-h" className="sum-h2">It runs on Perplexity today: two recordings in, one skill out, a real answer back</h2>
        <ol className="lv-steps">
          <li>
            <span className="lv-n">1</span>
            <h3>Recorded</h3>
            <p className="lv-big">{live.length} sessions</p>
            <p>{live.map((x) => sessionLabel(x.goal)).join(" and ")}. {totalSteps} steps and {totalShots} screenshots, captured by my browser extension. Password and card fields are never saved.</p>
          </li>
          <li>
            <span className="lv-n">2</span>
            <h3>Written</h3>
            <p className="lv-big"><code>{name}</code></p>
            <p>{plan.inputs.length} inputs, {plan.steps.length} steps, {plan.checks.length + 1} checks. Code checked that no app name made it into the steps. Written by {written.model.split("/")[1]} through the Agent API for {usd(written.costUsd, 3)}.</p>
          </li>
          <li>
            <span className="lv-n">3</span>
            <h3>Saved and run</h3>
            <p className="lv-big">{run.seconds} s · {usd(run.costUsd, 3)}</p>
            <p>Saved with Perplexity&apos;s Skills API, then asked about {apps.replace(/, ([^,]+)$/, " and $1")}: apps it never saw. It read {run.searched.length} pages and answered.</p>
          </li>
        </ol>

        <div className="lv-replay">
          <p className="lv-meta"><span>Recorded run</span><span>{day(run.ranOn)}</span><span>{run.model}</span></p>
          <p className="lv-q">{run.question}</p>
          <AnswerView text={run.text} />
          <p className="lv-sources"><b>Official pages it read:</b> {official.map((c, i) => <span key={c.url}>{i > 0 && " · "}<a href={c.url} target="_blank" rel="noreferrer">{host(c.url)}{new URL(c.url).pathname.replace(/\/$/, "")}</a></span>)}</p>
          <p className="lv-note">Prices as Perplexity returned them on {day(run.ranOn)}. I haven&apos;t checked them by hand.{/not stated|doesn.t (list|publish|state)|did not state/i.test(run.text) && <> Where a page doesn&apos;t publish a price, it says so instead of guessing one.</>}</p>
        </div>

        <LiveRun example={EXAMPLE} skill={name} />

        <details className="rfold lv-file">
          <summary><strong>The skill file it wrote</strong><span>Plain Markdown, exactly as saved to Perplexity</span></summary>
          <pre className="demo-file sk-raw">{file}</pre>
        </details>
      </section>

      <section aria-labelledby="metrics-h">
        <p className="tp-eyebrow">Metrics</p>
        <h2 id="metrics-h" className="sum-h2">Saved skills get used again, and never hide a failed check</h2>
        <div className="brief-metrics">
          <article className="bm-card star skill">
            <span className="bm-label">North star</span>
            <p className="bm-name">Skills run again</p>
            <p className="bm-formula">Skills run at least twice in the 14 days after saving ÷ skills saved from an offer.</p>
            <p className="bm-now">No baseline yet: only I have used it. In my own sessions, one prompt came back {first.length} times in a day.</p>
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
              <li><span>Skill runs on apps not in the recordings ÷ all skill runs</span><span className="th">set after baseline</span></li>
            </ul>
          </article>
        </div>
        <p className="bm-gate">All proposals. The bars get set after a baseline week of real use.</p>
      </section>

      <section aria-labelledby="trade-h">
        <p className="tp-eyebrow">Trade-offs</p>
        <h2 id="trade-h" className="sum-h2">What I gave up, on purpose</h2>
        <div className="tradeoffs">
          <article className="trade"><h3>Ask after two sessions of the same kind, never auto-save</h3><p><b>Over</b>saving skills silently</p><p><b>Cost</b>fewer skills get made</p></article>
          <article className="trade"><h3>A model writes the general method</h3><p><b>Over</b>keeping the exact prompt</p><p><b>Cost</b>it can over-generalize, so you see the file before it&apos;s saved</p></article>
          <article className="trade"><h3>Plain Markdown, not a hidden config</h3><p><b>Over</b>a polished settings screen</p><p><b>Cost</b>looks rough to people new to AI</p></article>
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
                <p>A skill needs steps, inputs and a way to check the result. Most people have never written one.</p>
              </article>
              <article className="sk-seen">
                <Icon kind="eye" />
                <h3>What I saw</h3>
                <p>I ran one prompt {first.length} times, word for word, in a day. On Oct 2 to 4, 2026 the session menu showed no save-as-skill option and the skill builder had no test step. I did not check one menu.</p>
              </article>
            </div>
            <p className="sum-note sk-after">My read of the gap. I have not interviewed Perplexity users about Skills.</p>
          </details>
          <details className="rfold sk-result">
            <summary><strong>Where the idea came from</strong><span>One pricing prompt, {first.length} paid runs, different answers</span></summary>
            <div className="sk-runs">
              <h3>I typed this {first.length} times</h3>
              <p className="sk-prompt">&ldquo;{s.prompt}&rdquo;</p>
              <ol>
                {first.map((x) => (
                  <li key={x.runId}>
                    <span>Run {x.runId}</span>
                    <span className="sk-when">{x.when}</span>
                    <b className="fig">{credits(x.credits)} credits</b>
                  </li>
                ))}
              </ol>
              {d && (
                <p className="sk-diff">
                  The answers disagreed once: <b>{d.plan}</b> came back at {d.values.map((v) => usd(v.value)).join(", ")} a month. That&apos;s why the skill carries checks.
                </p>
              )}
            </div>
          </details>
          <details className="rfold sum-limits">
            <summary><strong>What this prototype doesn&apos;t show</strong><span>Limits</span></summary>
            <ul>
              <li>The skill is written and run on Perplexity&apos;s Agent API, not inside Computer. The offer, the sidebar and the slash command are my proposal.</li>
              <li>The two sessions were recorded with my extension in a test browser. Real users repeat tasks less neatly.</li>
              <li>One recorded run is shown. Answers vary between runs, and I haven&apos;t checked the prices by hand.</li>
              <li>Runs sometimes cite sources as numbered markers that don&apos;t map to pages, so I list the pages each run read instead.</li>
              <li>Not yet tested with Perplexity users.</li>
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
