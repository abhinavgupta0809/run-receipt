import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { checkOutput, disagreements, parsePrices, type App } from "@/lib/skill.ts";
import { range, type Run } from "@/lib/estimate.ts";
import { day, friendly, sessionLabel } from "@/lib/livedemo.ts";
import type { SkillPlan } from "@/lib/skillwriter.ts";
import type { Citation } from "@/lib/perplexity.ts";
import { about, holdoutSize, LEVELS, scenario, type Case } from "@/lib/skillcase.ts";
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
const usd = (n: number, digits = 2) => `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/\.00$/, "")}`;
const num = (n: number) => n.toLocaleString("en-US");
const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
// Each metric with its formula, population and period, and the decision it controls.
const METRICS = [
  { name: "Habitual paying Computer users", kind: "Company north star", formula: "Paying users with a kept task in 3 of the last 4 weeks ÷ all paying Computer users", who: "All paying Computer users, weekly", decision: "Context for the feature: if people offered a skill aren't more habitual than the holdout after its 90 days, stop expanding Session to Skill." },
  { name: "Skills run again", kind: "Feature north star", formula: "Skills saved from an offer run 2+ times in 14 days ÷ skills saved from an offer", who: "Weekly cohorts of saved skills", decision: "Under the bar for 4 cohorts in a row: change when the offer appears before building anything else." },
  { name: "Failed check shown without a flag", kind: "Guardrail", formula: "Graded skill answers with a failed check and no flag ÷ graded skill answers", who: "Weekly random sample of skill runs, graded by code and a reviewer", decision: "Above 1% in any week: pause the rollout until the flag is fixed." },
  { name: "Skill answers redone", kind: "Guardrail", formula: "Skill runs retried or redone by prompt within 24 hours ÷ skill runs, compared with the same task typed as a prompt", who: "Skill users, weekly, by task type", decision: "Worse than prompts for 2 weeks: pause offers for that task type." },
  { name: "Credits per skill run", kind: "Guardrail", formula: "Median credits per skill run ÷ median credits of the sessions the skill came from", who: "Skill runs, weekly", decision: "Above 1: fix the skill writer before widening the offer." },
  { name: "Offers dismissed", kind: "Guardrail", formula: "Offers dismissed or turned off ÷ offers shown", who: "Users shown an offer, weekly", decision: "Above the bar: raise the trigger from two sessions to three." },
  { name: "Offers accepted", kind: "Supporting", formula: "Offers accepted ÷ offers shown", who: "Users shown an offer, weekly", decision: "Low acceptance but high reuse: work on the offer's copy and timing, not the skill." },
  { name: "Runs on new inputs", kind: "Supporting", formula: "Skill runs with inputs not in the source sessions ÷ skill runs", who: "Skill runs, weekly", decision: "Near zero: skills behave like saved prompts, so drop the model-written generalizing step." },
  { name: "Skills edited before saving", kind: "Supporting", formula: "Skills edited in the review step ÷ skills saved", who: "Skills saved, weekly", decision: "High: the writer misses steps; improve it before widening the trigger." },
];
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
  const bc = JSON.parse(read("skill/case.json")) as Case;
  const business = JSON.parse(read("business.json")) as { checked: string; source: string; plans: { name: string; usdPerMonth: number }[]; costUnitUsd: number };
  const price = business.plans.find((p) => p.name === bc.plan)!.usdPerMonth;
  const maxPlan = business.plans.reduce((a, b) => (b.usdPerMonth > a.usdPerMonth ? b : a));
  const costUnit = business.costUnitUsd;
  const cases = LEVELS.map((l) => scenario(bc, l, price, written.costUsd, costUnit));
  const base = cases.find((x) => x.level === "base")!;

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
        <p className="sum-lede">Do the same kind of task twice and Computer offers to save how you did it as a skill. Here, two pricing comparisons became one skill that priced three apps it had never seen.</p>
        <p className="sum-actions"><a href="#solution" className="btn">Try the prototype ↓</a> <a href="#proof" className="btn btn-quiet">See it run on Perplexity</a></p>
      </header>

      <section aria-label="Who it's for">
        <Persona tone="sk" icon="repeat" name="The repeat-task user"
          line="Runs the same kind of job again and again: a price check, a weekly report, a filing."
          facts={[
            { icon: "repeat", value: String(first.length), label: "runs of one pricing prompt in my cost test, each redoing every step from scratch" },
            { icon: "coins", value: `${credits(cost.min)}–${credits(cost.max)}`, label: "credits paid each time to redo the same steps" },
          ]}
          why={<>Repeated work is where a tool becomes a habit. If Computer keeps the method, people come back to it instead of a blank prompt (my assumption).</>}
          evidence="Based on my own sessions. No review asks for this yet, so it needs testing with users." />
      </section>

      <section aria-labelledby="problem-h">
        <p className="tp-eyebrow">Problem</p>
        <h2 id="problem-h" className="tp-statement">You only know a task is worth saving after you&apos;ve repeated it. Then you have to describe the skill from memory.</h2>
        <p className="tp-quote">
          <span className="tp-tag">My test</span>
          <span>In my cost test I ran one pricing prompt {first.length} times, and each run redid every step from scratch. When I checked on Oct 2 to 4, 2026, the session menu had no save-as-skill option.</span>
        </p>
        <p className="sum-note tp-today">
          <b>What Computer has today.</b> You can make a skill by describing it to Computer (&ldquo;Create with Computer&rdquo;) or by uploading a file. Both start after you&apos;ve decided a task is worth saving, and neither uses the sessions you already ran. <a href="https://www.perplexity.ai/help-center/en/articles/19700001-what-is-brain" target="_blank" rel="noopener">Brain</a> (a research preview on Max) learns from past sessions, and Perplexity says skills that improve themselves may come later, shown to you for review first. Session to Skill is the step in between: it turns a repeated method into a named skill you can read, check and run on new inputs.
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
        <h2 id="proof-h" className="sum-h2">It runs on Perplexity&apos;s Agent API today: two recordings in, one skill out, a real answer back</h2>
        <ol className="lv-steps">
          <li>
            <span className="lv-n">1</span>
            <h3>Recorded</h3>
            <p className="lv-big">{live.length} sessions</p>
            <p>{live.map((x) => sessionLabel(x.goal)).join(" and ")}. {totalSteps} steps and {totalShots} screenshots, captured by my browser extension, standing in for Computer&apos;s session history. Password and card fields are never saved.</p>
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
          <p className="lv-meta"><span>Recorded run</span><span>{day(run.ranOn)}</span><span>{run.model} via Perplexity&apos;s Agent API</span></p>
          <p className="lv-q">{run.question}</p>
          <AnswerView text={run.text} />
          <p className="lv-sources"><b>Official pages it read:</b> {official.map((c, i) => <span key={c.url}>{i > 0 && " · "}<a href={c.url} target="_blank" rel="noreferrer">{host(c.url)}{new URL(c.url).pathname.replace(/\/$/, "")}</a></span>)}</p>
          {/* Checked by hand against figma.com, linear.app and slack.com pricing pages on Oct 26, 2026, for this recorded run only. */}
          <p className="lv-note"><b>How it did against its own skill.</b> Checked against the vendors&apos; pricing pages on Oct 26, 2026: every Figma and Linear price matches, as do Slack Pro and Business+, and it was right that Linear&apos;s page shows no monthly price. It missed one: Slack lists Enterprise+ at $45 per user a month, billed annually. It also skipped three things its skill asks for (a yearly-savings percentage, a source link on each row, and the date checked) without flagging them. That&apos;s the failure the first guardrail below is there to catch.</p>
        </div>

        <LiveRun example={EXAMPLE} skill={name} />

        <details className="rfold lv-file">
          <summary><strong>The skill file it wrote</strong><span>Plain Markdown, exactly as saved to Perplexity</span></summary>
          <pre className="demo-file sk-raw">{file}</pre>
        </details>
      </section>

      <section aria-labelledby="metrics-h">
        <p className="tp-eyebrow">Metrics</p>
        <h2 id="metrics-h" className="sum-h2">One company goal, one number for the feature, and the lines it can&apos;t cross</h2>
        <div className="mx-ladder">
          <article className="bm-card mx-company">
            <span className="bm-label">Company north star (my assumption)</span>
            <p className="bm-name">Habitual paying Computer users</p>
            <p className="bm-formula">Paying Computer users with a kept task in at least 3 of the last 4 weeks ÷ all paying Computer users, weekly.</p>
            <p className="bm-now">Subscriptions renew when Computer is part of someone&apos;s week. Run Receipt and Session to Skill both feed this.</p>
          </article>
          <article className="bm-card star skill">
            <span className="bm-label">Feature north star</span>
            <p className="bm-name">Skills run again</p>
            <p className="bm-formula">Skills saved from an offer that run at least twice in the 14 days after saving ÷ skills saved from an offer.</p>
            <p className="bm-now">No baseline yet: only I have used it. Closest signal: my cost test ran one prompt {first.length} times, each from scratch.</p>
          </article>
        </div>
        <div className="brief-metrics mx-two">
          <article className="bm-card">
            <span className="bm-label">Guardrails</span>
            <ul className="bm-list">
              <li><span>A failed check shown without a flag, in a weekly graded sample</span><span className="th">under 1%</span></li>
              <li><span>Skill answers redone within a day, vs the same task typed as a prompt</span><span className="th">no worse</span></li>
              <li><span>Credits per skill run, vs the sessions it came from</span><span className="th">no higher</span></li>
              <li><span>Offers dismissed ÷ offers shown</span><span className="th">set after baseline</span></li>
            </ul>
          </article>
          <article className="bm-card">
            <span className="bm-label">Supporting</span>
            <ul className="bm-list">
              <li><span>Offers accepted ÷ offers shown</span><span className="th">set after baseline</span></li>
              <li><span>Skill runs on inputs not in the source sessions ÷ all skill runs</span><span className="th">set after baseline</span></li>
              <li><span>Skills edited before saving ÷ skills saved</span><span className="th">set after baseline</span></li>
            </ul>
          </article>
        </div>
        <details className="rfold mx-defs">
          <summary><strong>How each metric is defined, and the decision it controls</strong><span>Formula, who, when, exclusions</span></summary>
          <div className="lv-table mx-table" tabIndex={0} role="region" aria-label="Metric definitions">
            <table>
              <thead><tr><th scope="col">Metric</th><th scope="col">Formula</th><th scope="col">Who and when</th><th scope="col">If it moves</th></tr></thead>
              <tbody>
                {METRICS.map((m) => <tr key={m.name}><td><b>{m.name}</b><span className="mx-kind">{m.kind}</span></td><td>{m.formula}</td><td>{m.who}</td><td>{m.decision}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="sum-note">Everywhere: excludes Perplexity staff and test accounts, and skills deleted within a day of saving. A kept task is one not retried or abandoned within 24 hours. All bars are proposals, set after a baseline week of real use.</p>
        </details>
      </section>

      <section aria-labelledby="business-h">
        <p className="tp-eyebrow">Business case</p>
        <h2 id="business-h" className="sum-h2">It pays back through retention, and only if people who save a skill cancel less often</h2>
        <p className="sk-intro">Per {num(bc.unitUsers)} paying Computer users on {bc.plan} at {usd(price)} a month. I have no Perplexity data, so every rate is my assumption. The cost of writing a skill is measured.</p>
        <div className="bc-grid">
          {cases.map((x) => (
            <article key={x.level} className={`bc-card${x.level === "base" ? " is-base" : ""}`}>
              <span className="bm-label">{x.level === "base" ? "Base case" : x.level === "low" ? "Low case" : "High case"}</span>
              <p className="bc-big">{usd(Math.round(x.netUsd), 0)}<small> a year</small></p>
              <ul>
                <li><b>{num(Math.round(x.skillUsers))}</b> people save a skill</li>
                <li><b>{num(Math.round(x.retainedMonths))}</b> subscriber-months kept</li>
                <li>Each {usd(costUnit, 0)} spent building it takes about <b>{num(about(x.breakEvenUsers))}</b> paying users a year to earn back</li>
              </ul>
            </article>
          ))}
        </div>
        <div className="bc-notes">
          <p><b>Cost.</b> Writing a skill cost {usd(written.costUsd, 3)} in one measured Agent API call, so writing every skill in the base case costs about {usd(Math.round(base.writeCostUsd), 0)}. Skill runs replace sessions people already pay for (my assumption). On {maxPlan.name} at {usd(maxPlan.usdPerMonth, 0)} a month, each kept subscriber-month is worth {Math.round(maxPlan.usdPerMonth / price)} times as much.</p>
          <p><b>The case against.</b> The direct value is small unless saving a skill changes who cancels. That churn effect is the assumption the whole case rests on, and nobody has measured it.</p>
          <p><b>How to prove it.</b> Among people who trigger the offer, hold it back from {Math.round(bc.holdoutShare * 100)}% at random and compare who&apos;s still subscribed after {bc.holdoutDays} days. Size it first: seeing a {bc.rolloutGapPts}-point gap takes roughly {num(about(holdoutSize(bc.rolloutGapPts, bc.holdoutShare)))} people who trigger the offer (my estimate, assuming 90% still subscribed), so widen the holdout if fewer qualify. A gap of {bc.rolloutGapPts} points or more: roll out wider. Between zero and {bc.rolloutGapPts}: keep it, and test the trigger and the copy. No gap: stop at the first version.</p>
          <p><b>Kill criteria.</b> Stop investing past the first version if skills run again stays under its bar for four weekly cohorts in a row, or the holdout shows no retention gap after {bc.holdoutDays} days.</p>
        </div>
        <details className="rfold">
          <summary><strong>Assumptions and arithmetic</strong><span>Every rate, what backs it, and the formula</span></summary>
          <div className="lv-table mx-table" tabIndex={0} role="region" aria-label="Business case assumptions">
            <table>
              <thead><tr><th scope="col">Assumption</th><th scope="col">Low</th><th scope="col">Base</th><th scope="col">High</th><th scope="col">What backs it</th></tr></thead>
              <tbody>
                {bc.inputs.map((i) => {
                  const f = (v: number) => (i.key === "churnCutPts" ? `${v} pt${v === 1 ? "" : "s"}` : `${Math.round(v * 100)}%`);
                  return <tr key={i.key}><td>{i.label}</td><td>{f(i.low)}</td><td>{f(i.base)}</td><td>{f(i.high)}</td><td>{i.evidence}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <ul className="bc-math">
            <li>People who save a skill = paying users × share who repeat a task × share who accept the offer</li>
            <li>Subscriber-months kept a year = people who save a skill × monthly churn drop × 12. This counts only the month each cancellation is prevented, so it undercounts.</li>
            <li>Value a year = subscriber-months kept × {usd(price)}, minus {usd(written.costUsd, 3)} to write each skill</li>
            <li>Plan prices are list prices from {business.source}, checked {business.checked}.</li>
          </ul>
        </details>
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
            <summary><strong>The need</strong><span>Why describing a task from memory is the wrong start</span></summary>
            <p className="sk-intro">Skills are saved methods Computer can reuse. Today you make one by describing it to Computer or uploading a file.</p>
            <div className="sk-need">
              <article>
                <Icon kind="blank" />
                <h3>You have to know the skill before you need it.</h3>
                <p>People find out a task is worth saving after they have repeated it, not before.</p>
              </article>
              <article>
                <Icon kind="write" />
                <h3>Describing a method from memory loses the details.</h3>
                <p>The steps that mattered, like switching a pricing page to monthly, are easy to forget after the fact. The sessions already have them.</p>
              </article>
              <article className="sk-seen">
                <Icon kind="eye" />
                <h3>What I saw</h3>
                <p>In my cost test I ran one prompt {first.length} times, each from scratch. On Oct 2 to 4, 2026 the session menu showed no save-as-skill option and the skill builder had no test step. There may be a menu I didn&apos;t check.</p>
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
              <li>The skill is written and run on Perplexity&apos;s Agent API, not inside Computer. The offer and the sidebar are my proposal. Computer already runs skills when they&apos;re relevant, and plugins from its / menu.</li>
              <li>The two sessions were recorded with my extension in a test browser. Real users repeat tasks less neatly.</li>
              <li>One recorded run is shown, and its prices were checked against the vendors&apos; pages on Oct 26, 2026. Answers vary between runs, and the others aren&apos;t checked.</li>
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
