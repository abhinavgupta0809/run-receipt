import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { PROPOSED, PROTOCOL, medianGapCredits, medianLowPct, panelReadings, rangeBacktest, tally, widestRepeatRuns } from "@/lib/study.ts";
import { Dots } from "./charts";
import HeroMoments from "./hero-moments";
import { load } from "./data";
import { credits, duration, money, runs as runCount, span } from "./format";

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

// Order: the problem with a number, the three problems, users saying the same, the fix, how to measure it, then limits.
// How I got to the problem sits behind a fold on /evidence.
// The two-minute read. Every table and screenshot behind it lives on /evidence.
// Built at build time from data/ through lib/. No figure on this page is typed by hand.
export default function Summary() {
  const { runs, gate, replay: d } = load();
  const h = d.headline;
  const t = tally(runs, gate);
  const repeat = widestRepeatRuns(runs);
  const readings = panelReadings(runs);
  const lane = d.hybrid;
  // Shown as totals matched, not checks failed: "9 of 9 failed" read as if the receipt itself had failed.
  const totals = `${lane.totalsRight} of ${lane.rows.length}`;
  const range = span(h.widestRepeat.credits, credits);
  const research = JSON.parse(readFileSync(path.join(process.cwd(), "data", "research.json"), "utf8")) as Research;
  const business = JSON.parse(readFileSync(path.join(process.cwd(), "data", "business.json"), "utf8")) as { checked: string; source: string; plans: { name: string; usdPerMonth: number }[]; costUnitUsd: number };
  const raw = rangeBacktest(runs);
  const padded = rangeBacktest(runs, PROPOSED.padPct);
  const rate = PROTOCOL.usdPerCredit;
  const repeatFinals = repeat.runs.map((r) => r.final).sort((x, y) => x - y);
  const repeatSpread = Math.round((repeatFinals[repeatFinals.length - 1] / repeatFinals[0] - 1) * 100);

  return (
    <main className="sum">
      <section className="sum-hero">
        <div>
          <h1 className="long">Same prompt, {countWord(repeat.runs.length)} runs: {listOf(repeatFinals)} credits.</h1>
          <p className="sum-lede">
            The most expensive run cost {repeatSpread}% more than the cheapest, on the same setting. You can&apos;t budget for that, and {n(research.creditsRunOut.reviews)} store reviews are from paying users who ran out of credits.
          </p>
          <p className="sum-lede sum-why">
            <b>Run Receipt</b> is my fix: a cost range before you send, a provisional count while it runs, and numbers checked by code after.
          </p>
          <p className="sum-actions">
            <Link href="/receipt" className="btn">See the fix</Link>
            <Link href="#problems" className="btn btn-quiet">The three problems</Link>
          </p>
          <p className="sum-byline">
            By <b>Abhinav Gupta</b>, a product manager with six years of experience, now in the MS Product Management program at Carnegie Mellon. {h.runs} runs, {h.taskTypes} task types, one account, {PROTOCOL.period}.
          </p>
        </div>
        <figure className="sum-receipt" aria-label={`Receipt for recorded run ${lane.run.id}`}>
          <figcaption>The fix: one run, as its receipt</figcaption>
          <div className="tape">
            <p className="small">Bank report, private steps on your Mac. Recorded run {lane.run.id}.</p>
            <div className="sum-moment cost line-in" style={{ animationDelay: "0.1s" }}>
              <p className="tape-head">Before you send</p>
              {lane.estimate && <Row label="Credits" value={span(lane.estimate.credits, credits)} />}
              {lane.estimate?.seconds && <Row label="Time" value={span(lane.estimate.seconds, duration)} />}
            </div>
            <HeroMoments panel={lane.run.panelAtFinish} final={lane.run.final} totals={totals} withheld={lane.withheld.map((w) => w.category).join(", ")} />
            <div className="leader sum-total line-in" style={{ animationDelay: "0.85s" }}>
              <span>TOTAL</span>
              <span className="dots" />
              <span className="fig">{credits(lane.run.final)} credits</span>
            </div>
          </div>
        </figure>
      </section>

      <section aria-labelledby="film" className="sum-film">
        <h2 id="film" className="sum-h2">The study in under half a minute</h2>
        <figure>
          <video controls playsInline preload="metadata" poster="/video/run-receipt-explainer.jpg" aria-describedby="film-note">
            <source src="/video/run-receipt-explainer.mp4" type="video/mp4" />
          </video>
          <figcaption id="film-note">
            The problem, the three findings and the receipt, in that order. No speech, so it reads with the sound off. Its numbers were rendered from this site&apos;s data and do not update by themselves.
          </figcaption>
        </figure>
      </section>

      <hr className="tri-rule" />

      <section aria-labelledby="problems">
        <h2 id="problems" className="sum-h2">Three problems, measured</h2>
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
      </section>

      <section aria-labelledby="research">
        <h2 id="research" className="sum-h2">Users say it too</h2>
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
      </section>

      <section aria-labelledby="fix" className="sum-band">
        <h2 id="fix" className="sum-h2">The fix: one receipt, shown at three moments</h2>
        <ol className="sum-fix">
          <Fix tone="cost" when="Before you send" answers="Problem 1" what="The plan, where each step will run, and a credit range taken from past runs."
            proof={`${range} credits`} proofNote={`range from ${runCount(h.widestRepeat.credits.n)} of one prompt`} />
          <Fix tone="meter" when="While it runs" answers="Problem 2" what="The credit count, marked provisional until the charge settles."
            proof={`${credits(lane.run.panelAtFinish)} → ${credits(lane.run.final)}`} proofNote="panel at Finished, then the final charge" />
          <Fix tone="hybrid" when="After" answers="Problem 3" what="Checks done by code, what was withheld from the result, and a way to repair it."
            proof={`${totals} totals matched the file`} proofNote={`caught by code on recorded Hybrid run ${lane.run.id}`} />
        </ol>
        <p className="sum-actions">
          <Link href="/receipt" className="btn">Replay a recorded run</Link>
        </p>
      </section>

      <section aria-labelledby="measure">
        <h2 id="measure" className="sum-h2">Proposed success metrics</h2>
        <p className="sum-note">What I would measure if Perplexity shipped the receipt. The middle column is what my own {h.runs} runs show today. The bars are my starting proposals: I have no access to Perplexity&apos;s data, so each would be reset after a baseline week.</p>
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
      </section>

      <section aria-labelledby="worth" className="sum-worth">
        <h2 id="worth" className="sum-h2">What it could be worth</h2>
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
      </section>

      <section aria-labelledby="limits" className="sum-limits">
        <h2 id="limits" className="sum-h2">What this cannot tell you</h2>
        <ul>
          <li>Small numbers. Most comparisons are one run on each side. Nothing here is a rate.</li>
          <li>One account, one Mac, one local model ({PROTOCOL.localModel}), one week.</li>
          <li>These are my own runs. I have not interviewed Perplexity users, so how much these problems matter to them is still a hypothesis.</li>
          <li>The prototype is standalone. It replays recorded runs and does not hook into Perplexity&apos;s product.</li>
        </ul>
        <p className="sum-actions">
          <Link href="/evidence" className="btn btn-quiet">Every table, chart and screenshot</Link>
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

function Fix({ tone, when, answers, what, proof, proofNote }: { tone: string; when: string; answers: string; what: string; proof: string; proofNote: string }) {
  return (
    <li className={`sum-fix-step ${tone}`}>
      <p className="sum-answers">{answers}</p>
      <h3>{when}</h3>
      <p>{what}</p>
      <p className="sum-proof"><b className="fig">{proof}</b><span>{proofNote}</span></p>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="leader">
      <span>{label}</span>
      <span className="dots" />
      <span className="fig">{value}</span>
    </div>
  );
}
