import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { estimate } from "@/lib/estimate.ts";
import { PROPOSED, PROTOCOL, medianGapCredits, medianLowPct, panelReadings, rangeBacktest, tally, widestRepeatRuns } from "@/lib/study.ts";
import { Dots } from "./charts";
import { load } from "./data";
import DeviceToggle from "./device";
import { credits, money, runs as runCount, span } from "./format";
import Replay from "./receipt/replay";

type Cluster = { title: string; reviews: number; lowStar: number; android: number; ios: number };
type Research = {
  generated: string;
  dashboardUrl: string | null;
  corpus: { reviews: number; android: number; ios: number; from: string; to: string; substantive: number; stores: string };
  labelCheck: { matches: number; n: number };
  money: { reviews: number; lowStar: number };
  creditsRunOut: Cluster;
  computerCredits: Cluster;
  larger: Cluster[];
  firstRead: { reviews: number; problemStatements: number };
  quotes: { tone: string; text: string; stars: number; when: string; source: string }[];
};
const n = (x: number) => x.toLocaleString("en-US");
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const countWord = (x: number) => WORDS[x] ?? String(x);
// "12.14, 14.29 and 21.96"
const listOf = (values: number[]) => { const parts = values.map(credits); return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join(""); };
const read = (name: string) => readFileSync(path.join(process.cwd(), "data", name), "utf8");

// The one-minute template: problem, solution (the prototype), metrics, trade-offs, then research in folds.
// Every table and screenshot behind it lives on /evidence.
// Built at build time from data/ through lib/. No figure on this page is typed by hand.
export default function Home() {
  const { runs, gate, replay: d } = load();
  const h = d.headline;
  const t = tally(runs, gate);
  const repeat = widestRepeatRuns(runs);
  const readings = panelReadings(runs);
  const range = span(h.widestRepeat.credits, credits);
  const research = JSON.parse(read("research.json")) as Research;
  const business = JSON.parse(read("business.json")) as { checked: string; source: string; plans: { name: string; usdPerMonth: number }[]; costUnitUsd: number };
  const raw = rangeBacktest(runs);
  const padded = rangeBacktest(runs, PROPOSED.padPct);
  const rate = PROTOCOL.usdPerCredit;
  const repeatFinals = repeat.runs.map((r) => r.final).sort((x, y) => x - y);
  const quote = research.quotes[0];

  // The prototype's cost example is the prompt whose repeat runs moved the most on one setting.
  const first = runs.find((r) => r.id === repeat.runs[0].id)!;
  const est = estimate(runs, first.task, first.mode)!;
  const saved = JSON.parse(read("skill/sessions.json")) as { task: string; prompt: string };
  const wide = { label: repeat.label, setting: repeat.setting, prompt: saved.task === first.task ? saved.prompt : null, credits: est.credits, seconds: est.seconds };

  return (
    <main className="sum tp">
      <header className="tp-intro">
        <p className="tp-independent">Prototype · independent, not made by or with Perplexity</p>
        <h1>Run Receipt</h1>
        <p className="sum-lede">A receipt for every Computer run: the cost before you send, an honest count while it runs, numbers checked by code after.</p>
        <p className="sum-actions"><a href="#solution" className="btn">Try the prototype ↓</a></p>
        <p className="tp-by">By <b>Abhinav Gupta</b>, product manager (six years), MS Product Management at Carnegie Mellon. {h.runs} runs on my own account, {PROTOCOL.period}.</p>
      </header>

      <section aria-labelledby="problem-h">
        <p className="tp-eyebrow">Problem</p>
        <h2 id="problem-h" className="tp-statement">Same prompt, {countWord(repeat.runs.length)} runs: {listOf(repeatFinals)} credits. Nothing on screen says which you&apos;ll get.</h2>
        <ul className="tp-proof" aria-label="Three problems, from my runs">
          <li className="cost"><b>{range}</b><span>credits for one prompt, same setting</span></li>
          <li className="meter"><b>{h.panelLow} of {h.panelReadings}</b><span>times the meter read low at Finished</span></li>
          <li className="hybrid"><b>{t.localRunsNotFullMarks} of {t.localRuns}</b><span>Hybrid runs on my Mac came back wrong or incomplete</span></li>
        </ul>
        <p className="tp-quote">
          <span className="tp-tag">{n(research.creditsRunOut.reviews)} paying users ran out of credits</span>
          <q>{quote.text}</q>
          <span className="tp-src">{quote.stars} of 5 stars, {quote.source}</span>
        </p>
      </section>

      <section id="solution" aria-labelledby="solution-h">
        <div className="solution-head">
          <div>
            <p className="tp-eyebrow">Solution</p>
            <h2 id="solution-h" className="sum-h2">One receipt, at the three moments that go wrong</h2>
          </div>
          <DeviceToggle />
        </div>
        <Replay data={d} wide={wide} />
      </section>

      <section aria-labelledby="metrics-h">
        <p className="tp-eyebrow">Metrics</p>
        <h2 id="metrics-h" className="sum-h2">Runs land inside the quoted range, and people still send them</h2>
        <div className="brief-metrics">
          <article className="bm-card star cost">
            <span className="bm-label">North star</span>
            <p className="bm-name">Estimate hit rate</p>
            <p className="bm-formula">Runs whose final charge landed inside the range shown before sending ÷ runs shown a range. Weekly.</p>
            <p className="bm-now">In my runs: <b>{raw.hits} of {raw.n}</b>, or <b>{padded.hits} of {padded.n}</b> with the range {PROPOSED.padPct}% wider. Bar: <b>{PROPOSED.hitRatePct}%</b>.</p>
          </article>
          <article className="bm-card">
            <span className="bm-label">Guardrails</span>
            <ul className="bm-list">
              <li><span>Runs sent, against the week before</span><span className="th">≤{PROPOSED.runsSentDropPct}% drop</span></li>
              <li><span>Range width, median</span><span className="th">&lt;{PROPOSED.widthPct}%</span></li>
            </ul>
          </article>
          <article className="bm-card">
            <span className="bm-label">Supporting</span>
            <ul className="bm-list">
              <li className="meter"><span><i />Meter gap at Finished</span><span className="th">&lt;{PROPOSED.meterGapPct}%</span></li>
              <li className="hybrid"><span><i />Repair taken when a check fails</span><span className="th">after baseline</span></li>
            </ul>
          </article>
        </div>
        <p className="bm-gate">The bars are my proposals. I don&apos;t have Perplexity&apos;s data, so each resets after a baseline week.</p>
      </section>

      <section aria-labelledby="trade-h">
        <p className="tp-eyebrow">Trade-offs</p>
        <h2 id="trade-h" className="sum-h2">What I gave up, on purpose</h2>
        <div className="tradeoffs">
          <article className="trade"><h3>A range, not a price</h3><p><b>Over</b>one number people can hold you to</p><p><b>Cost</b>wide ranges help less ({padded.medianWidthPct}% median in my runs)</p></article>
          <article className="trade"><h3>Say &ldquo;provisional&rdquo; out loud</h3><p><b>Over</b>hiding the count until it settles</p><p><b>Cost</b>people still see a number that will change</p></article>
          <article className="trade"><h3>Code checks the sums, not the model</h3><p><b>Over</b>asking the model to grade itself</p><p><b>Cost</b>only works when there&apos;s a file to check against</p></article>
        </div>
      </section>

      <section aria-labelledby="more-h">
        <p className="tp-eyebrow">Research</p>
        <h2 id="more-h" className="sum-h2">For anyone who wants to dig in</h2>
        <div className="rfolds">
          <details className="rfold">
            <summary><strong>Three problems, measured</strong><span>A chart for each, from my {h.runs} runs</span></summary>
            <div className="sum-problems">
              <Problem tone="cost" n="1" title="Cost is a surprise." figure={range} unit="credits for one prompt"
                body={`The same prompt on the same setting cost ${range} credits across ${runCount(h.widestRepeat.credits.n)}. Nothing on my screen said which price I would get.`}
                limit={`${runCount(repeat.runs.length)} of one prompt. A count, not a rate.`}>
                <ul data-chart className="sum-bars" aria-label="Final credits for each run of the same prompt">
                  {repeat.runs.map((r) => (
                    <li key={r.id}><span>Run {r.id}</span><i className="m-grow-x" style={{ width: `${(r.final / h.widestRepeat.credits.max) * 100}%` }} /><b>{credits(r.final)}</b></li>
                  ))}
                </ul>
              </Problem>
              <Problem tone="meter" n="2" title="The credit meter reads low while you watch it." figure={`${h.panelLow} of ${h.panelReadings}`} unit="readings below the final charge"
                body={`When the run said Finished, the meter was below the final charge in ${h.panelLow} of ${h.panelReadings} readings.`}
                limit="The meter does catch up later.">
                <Dots tone="meter" total={h.panelReadings} on={h.panelLow} perRow={9} label={`${h.panelLow} of ${h.panelReadings} panel readings were below the final charge`} />
              </Problem>
              <Problem tone="hybrid" n="3" title="Hybrid mode is unpredictable." figure={`${h.hybridRanLocal} of ${h.hybridOn}`} unit="Hybrid runs ran on the Mac"
                body={`Hybrid is meant to run private steps on your Mac. With it on, the local model ran in ${h.hybridRanLocal} of ${h.hybridOn} runs. In ${t.localRunsNotFullMarks} of those ${t.localRuns}, the result was wrong or incomplete.`}
                limit="One Mac, one local model.">
                <Dots tone="hybrid" total={h.hybridOn} on={h.hybridRanLocal} perRow={8} label={`${h.hybridRanLocal} of ${h.hybridOn} runs with Hybrid on ran a step on the Mac`} />
              </Problem>
            </div>
          </details>
          <details className="rfold">
            <summary><strong>What users say</strong><span>{n(research.corpus.reviews)} store reviews, labelled</span></summary>
            <div className="sum-research">
              <div>
                <ul className="sum-counts" aria-label="What the reviews say about credits">
                  <li className="cost"><b>{n(research.creditsRunOut.reviews)}</b><span>reviews are from paying users who ran out of credits</span></li>
                  <li className="cost"><b>{n(research.creditsRunOut.lowStar)}</b><span>of those came with 1 or 2 stars</span></li>
                  <li className="cost"><b>{n(research.computerCredits.reviews)}</b><span>reviews say Computer burned through their credits</span></li>
                </ul>
                <p className="sum-finding quiet">
                  This is not the largest complaint. {research.larger.map((c) => `${c.title} (${c.reviews})`).join(" and ")} are bigger. Run Receipt is aimed at paying Computer users.
                </p>
                <div className="sum-quotes">
                  {research.quotes.slice(0, 2).map((q) => (
                    <figure key={q.text} className={q.tone}>
                      <blockquote>&ldquo;{q.text}&rdquo;</blockquote>
                      <figcaption>{q.stars} of 5 stars. {q.source}, {q.when}.</figcaption>
                    </figure>
                  ))}
                </div>
                <p className="sum-source">
                  From {n(research.corpus.reviews)} {research.corpus.stores} reviews, {research.corpus.from} to {research.corpus.to}. {n(research.corpus.substantive)} say something specific. {n(research.money.reviews)} are complaints and requests about credits, limits, pricing or billing. Public reviews, not interviews. Labels come from an LLM, checked against {research.labelCheck.n} hand-labelled reviews: {research.labelCheck.matches} matched. A keyword search of these reviews found none about the credit meter reading low. That finding comes from my own runs.
                </p>
              </div>
              <aside className={`sum-slot ${research.dashboardUrl ? "live" : ""}`} aria-label="Reviews dashboard">
                <p className="sum-slot-tag">{research.dashboardUrl ? "Live" : "Built, not yet published"}</p>
                <h3>Reviews dashboard</h3>
                <p>All {n(research.corpus.reviews)} reviews, labelled, in four views: overview, deep dive, opportunities and every review.</p>
                {research.dashboardUrl ? <p className="sum-actions"><a className="btn" href={research.dashboardUrl}>Open the dashboard</a></p> : <p className="sum-slot-note">The link goes here when it is live.</p>}
              </aside>
            </div>
          </details>
          <details className="rfold">
            <summary><strong>Full metric plan</strong><span>Formulas, baselines and the decision each one controls</span></summary>
            <div className="scroll-x" tabIndex={0} role="region" aria-label="Proposed metrics">
              <table className="data sum-metrics">
                <thead>
                  <tr><th>Metric</th><th>How it is counted</th><th>In my runs</th><th>Starting bar</th><th>The decision it controls</th></tr>
                </thead>
                <tbody>
                  <tr className="cost">
                    <th scope="row"><i />Estimate hit rate</th>
                    <td>Runs whose final charge landed inside the range shown before sending, divided by runs that showed a range. Weekly, tasks with past runs.</td>
                    <td><b className="sum-num">{raw.hits} of {raw.n}</b>A range built from the other runs of the same prompt held the next run. Widened by {PROPOSED.padPct}% at each end: <b>{padded.hits} of {padded.n}</b>.</td>
                    <td><b className="sum-num">{PROPOSED.hitRatePct}%</b>of runs inside the range.</td>
                    <td>Below the bar, the range cannot be trusted yet. Widen it or hold the rollout.</td>
                  </tr>
                  <tr className="cost">
                    <th scope="row"><i />Range width</th>
                    <td>High end minus low end, divided by the low end. Median across tasks, weekly. It keeps the hit rate honest: a very wide range always hits.</td>
                    <td><b className="sum-num">{padded.medianWidthPct}%</b>Median with the {PROPOSED.padPct}% widening. Without it, {raw.medianWidthPct}%. The widest single prompt was {Math.round(h.widestRepeat.spreadPct)}%.</td>
                    <td><b className="sum-num">under {PROPOSED.widthPct}%</b>median width.</td>
                    <td>Above the bar, the range is too wide to budget with. Collect more past runs before showing it.</td>
                  </tr>
                  <tr className="meter">
                    <th scope="row"><i />Meter gap at Finished</th>
                    <td>Final charge minus the credits shown at Finished, divided by the final charge. Median per run, weekly.</td>
                    <td><b className="sum-num">{Math.round(medianLowPct(readings))}%</b>Median of {h.panelReadings} readings. {h.panelLow} of them read low.</td>
                    <td><b className="sum-num">under {PROPOSED.meterGapPct}%</b>median gap.</td>
                    <td>The provisional mark stays until the gap is under the bar.</td>
                  </tr>
                  <tr className="hybrid">
                    <th scope="row"><i />Repair take-up</th>
                    <td>Runs where the user took the offered repair, divided by runs where a check failed. Weekly, file tasks.</td>
                    <td><b className="sum-num quiet">No baseline</b>Only I have used the prototype. In my runs the local model ran {t.localRuns} times and {t.localRunsNotFullMarks} came back wrong or incomplete.</td>
                    <td><b className="sum-num quiet">Set after a baseline week</b></td>
                    <td>If few take it, the repair is priced or placed wrong.</td>
                  </tr>
                  <tr>
                    <th scope="row"><i />Guardrail: runs sent</th>
                    <td>Runs sent, divided by prompts where a cost range was shown. Weekly, against the week before.</td>
                    <td><b className="sum-num quiet">No baseline</b>The prototype replays recorded runs, so nobody chose whether to send.</td>
                    <td><b className="sum-num">{PROPOSED.runsSentDropPct}%</b>lower at most.</td>
                    <td>A bigger drop means the range is stopping runs people would have valued. Change how it is shown.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
          <details className="rfold sum-worth">
            <summary><strong>What it could be worth</strong><span>Per run, and the levers only Perplexity can size</span></summary>
            <p className="sum-note">Per run, the money is small. At {money(rate)} a credit:</p>
            <ul className="sum-counts" aria-label="Money at stake in one run">
              <li className="cost"><b>{money((h.widestRepeat.credits.max - h.widestRepeat.credits.min) * rate)}</b><span>between the cheapest and the most expensive run of one prompt ({range} credits)</span></li>
              <li className="meter"><b>{money(medianGapCredits(readings) * rate)}</b><span>median amount the meter read low at Finished ({credits(medianGapCredits(readings))} credits)</span></li>
              {h.effort && <li className="cost"><b>{money(h.effort.high * rate)}</b><span>for one prompt on High effort, against {money(h.effort.standard * rate)} on Standard</span></li>}
            </ul>
            <p className="sum-finding">So the case is not cents saved per run. It is whether paying users who cannot predict their credits stay subscribed.</p>
            <ol className="sum-fix sum-levers">
              <li className="sum-fix-step cost">
                <p className="sum-answers">Lever 1</p>
                <h3>Fewer cancellations</h3>
                <p>Paying users who run out of credits without warning. Perplexity would plug in: paying Computer users, the share who hit a credit surprise, and how many of those cancel.</p>
              </li>
              <li className="sum-fix-step meter">
                <p className="sum-answers">Lever 2</p>
                <h3>Fewer billing contacts</h3>
                <p>Refund and credit disputes that start with a charge higher than the screen showed. Perplexity would plug in: contacts tagged credits or billing, and the cost of one.</p>
              </li>
              <li className="sum-fix-step hybrid">
                <p className="sum-answers">Lever 3</p>
                <h3>More top-ups, or fewer</h3>
                <p>A user who can budget may buy more credits. A user who sees the price may send fewer runs. The guardrail metric above is there to tell which.</p>
              </li>
            </ol>
            <p className="sum-finding quiet">
              <b>Break-even.</b> One retained subscriber-month is worth {business.plans.map((p) => `${money(p.usdPerMonth).replace(/\.00$/, "")} on ${p.name}`).join(" and ")}. Every {money(business.costUnitUsd).replace(/\.00$/, "")} of build and running cost is paid back by {business.plans.map((p) => `${n(business.costUnitUsd / p.usdPerMonth)} retained ${p.name} months`).join(" or ")}.
            </p>
            <p className="sum-source">
              I cannot size this. Subscriber counts, churn and credit revenue are inside Perplexity, and I will not guess them. The public signal is a count, not a rate: {n(research.creditsRunOut.reviews)} store reviews in the window above are from paying users who ran out of credits, {n(research.creditsRunOut.lowStar)} of them at 1 or 2 stars. Plan prices are list prices from {business.source}, checked {business.checked}.
            </p>
          </details>
          <details className="rfold sum-film">
            <summary><strong>The study in under half a minute</strong><span>A 24-second film, no sound needed</span></summary>
            <figure>
              <video controls playsInline preload="none" poster="/video/run-receipt-explainer.jpg" aria-describedby="film-note">
                <source src="/video/run-receipt-explainer.mp4" type="video/mp4" />
              </video>
              <figcaption id="film-note">
                The problem, the three findings and the receipt, in that order. Its numbers were rendered from this site&apos;s data and do not update by themselves.
              </figcaption>
            </figure>
          </details>
          <details className="rfold sum-limits">
            <summary><strong>What this can&apos;t tell you</strong><span>Limits of a one-person study</span></summary>
            <ul>
              <li>Small numbers. Most comparisons are one run on each side. Nothing here is a rate.</li>
              <li>One account, one Mac, one local model ({PROTOCOL.localModel}), one week.</li>
              <li>These are my own runs. I have not interviewed Perplexity users, so how much these problems matter to them is still a hypothesis.</li>
              <li>The prototype is standalone. It replays recorded runs and does not hook into Perplexity&apos;s product.</li>
            </ul>
          </details>
        </div>
        <p className="tp-links">
          <Link href="/evidence">Every table, chart and screenshot</Link>
          <Link href="/router">How my own router splits the work</Link>
        </p>
      </section>
    </main>
  );
}

function Problem({ tone, n, title, figure, unit, body, limit, children }: { tone: string; n: string; title: string; figure: string; unit: string; body: string; limit: string; children: React.ReactNode }) {
  return (
    <article className={`sum-problem ${tone}`}>
      <p className="sum-n" aria-hidden="true">{n}</p>
      <h3>{title}</h3>
      <p className="sum-figure">{figure}<span>{unit}</span></p>
      <div className="sum-visual">{children}</div>
      <p className="sum-body">{body}</p>
      <p className="sum-limit"><b>Limit.</b> {limit}</p>
    </article>
  );
}
