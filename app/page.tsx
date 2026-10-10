import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { PROTOCOL, medianLowPct, panelReadings, tally, widestRepeatRuns } from "@/lib/study.ts";
import { Dots } from "./charts";
import { load } from "./data";
import { credits, duration, runs as runCount, span } from "./format";

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

// Order: the problem with a number, the three problems, users saying the same, the fix, how to measure it, then method and limits.
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
  const repeatFinals = repeat.runs.map((r) => r.final).sort((x, y) => x - y);
  const repeatSpread = Math.round((repeatFinals[repeatFinals.length - 1] / repeatFinals[0] - 1) * 100);

  return (
    <main className="sum">
      <section className="sum-hero">
        <div>
          <h1 className="long">Same prompt, {countWord(repeat.runs.length)} runs: {listOf(repeatFinals)} credits.</h1>
          <p className="sum-lede">
            I ran one Perplexity Computer prompt {countWord(repeat.runs.length)} times on the same setting. The most expensive run cost {repeatSpread}% more than the cheapest. You can&apos;t budget for that, and {n(research.creditsRunOut.reviews)} store reviews are from paying users who ran out of credits.
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
            <div className="sum-moment cost line-in" style={{ animationDelay: "0.2s" }}>
              <p className="tape-head">Before you send</p>
              {lane.estimate && <Row label="Credits" value={span(lane.estimate.credits, credits)} />}
              {lane.estimate?.seconds && <Row label="Time" value={span(lane.estimate.seconds, duration)} />}
            </div>
            <div className="sum-moment meter line-in" style={{ animationDelay: "0.9s" }}>
              <p className="tape-head">While it runs</p>
              <div className="leader">
                <span>Credits so far</span>
                <span className="dots" />
                <span className="fig">{credits(lane.run.panelAtFinish)} <span className="chip mark-prov">PROVISIONAL</span></span>
              </div>
            </div>
            <div className="sum-moment hybrid line-in" style={{ animationDelay: "1.6s" }}>
              <p className="tape-head">After</p>
              <div className="leader">
                <span>Totals that match the file</span>
                <span className="dots" />
                <span className="fig">{totals} <span className="stamp text-fail">CAUGHT</span></span>
              </div>
              <Row label="Left out of the report" value={lane.withheld.map((w) => w.category).join(", ")} />
            </div>
            <div className="leader sum-total line-in" style={{ animationDelay: "2.3s" }}>
              <span>TOTAL</span>
              <span className="dots" />
              <span className="fig">{credits(lane.run.final)} credits</span>
            </div>
          </div>
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
            <ul className="sum-counts" aria-label="Reviews read">
              <li><b>{n(research.corpus.reviews)}</b><span>{research.corpus.stores} reviews, {research.corpus.from} to {research.corpus.to}</span></li>
              <li><b>{n(research.corpus.substantive)}</b><span>of them say something specific</span></li>
              <li className="cost"><b>{n(research.money.reviews)}</b><span>complaints and requests about credits, limits, pricing or billing</span></li>
            </ul>
            <p className="sum-finding">
              <b>{research.creditsRunOut.reviews}</b> reviews are from paying users who ran out of credits, and {research.creditsRunOut.lowStar} of those came with 1 or 2 stars. <b>{research.computerCredits.reviews}</b> say Computer burned through their credits.
            </p>
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
              Public reviews, not interviews. Labels come from an LLM, checked against {research.labelCheck.n} hand-labelled reviews: {research.labelCheck.matches} matched. A keyword search of these reviews found none about the credit meter reading low. That finding comes from my own runs.
            </p>
          </div>
          <aside className="sum-slot" aria-label="Reviews dashboard">
            <p className="sum-slot-tag">{research.dashboardUrl ? "Live" : "Built, not yet published"}</p>
            <h3>Reviews dashboard</h3>
            <p>All {n(research.corpus.reviews)} reviews, labelled, in four views: overview, deep dive, opportunities and every review.</p>
            {research.dashboardUrl ? <p className="sum-actions"><a className="btn btn-quiet" href={research.dashboardUrl}>Open the dashboard</a></p> : <p className="sum-slot-note">The link goes here when it is live.</p>}
          </aside>
        </div>
      </section>

      <section aria-labelledby="fix" className="sum-band">
        <h2 id="fix" className="sum-h2">The fix: one receipt, shown at three moments</h2>
        <ol className="sum-fix">
          <Fix tone="cost" when="Before you send" answers="Problem 1" what="The plan, where each step will run, and a credit range taken from past runs."
            proof={lane.estimate ? `${span(lane.estimate.credits, credits)} credits` : ""} proofNote={lane.estimate ? `range from ${runCount(lane.estimate.credits.n)}` : ""} />
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
        <p className="sum-note">What I would measure if Perplexity shipped the receipt. I have no access to Perplexity&apos;s data, so I would set each bar after a baseline week.</p>
        <div className="scroll-x" tabIndex={0} role="region" aria-label="Proposed metrics">
          <table className="data sum-metrics">
            <thead>
              <tr><th>Metric</th><th>How it is counted</th><th>The decision it controls</th></tr>
            </thead>
            <tbody>
              <tr className="cost">
                <th scope="row"><i />Estimate hit rate</th>
                <td>Runs whose final charge landed inside the range shown before sending, divided by runs that showed a range. Weekly, tasks with past runs.</td>
                <td>If it is low, the range cannot be trusted yet. Widen it or hold the rollout.</td>
              </tr>
              <tr className="meter">
                <th scope="row"><i />Meter gap at Finished</th>
                <td>Final charge minus the credits shown at Finished, divided by the final charge. Median per run, weekly. In my {h.panelReadings} readings it was {Math.round(medianLowPct(readings))}%.</td>
                <td>The provisional mark stays until this is close to zero.</td>
              </tr>
              <tr className="hybrid">
                <th scope="row"><i />Repair take-up</th>
                <td>Runs where the user took the offered repair, divided by runs where a check failed. Weekly, file tasks.</td>
                <td>If few take it, the repair is priced or placed wrong.</td>
              </tr>
              <tr>
                <th scope="row"><i />Guardrail: runs sent</th>
                <td>Runs sent, divided by prompts where a cost range was shown. Weekly, against the week before.</td>
                <td>If showing the cost stops runs people would have valued, change how the range is shown.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="path">
        <h2 id="path" className="sum-h2">How I worked</h2>
        <ol className="sum-path">
          <li><span>1</span><h3>Read what users say</h3><p>{n(research.firstRead.reviews)} recent App Store reviews, Reddit threads and press coverage. Later, {n(research.corpus.reviews)} store reviews in a dashboard.</p></li>
          <li><span>2</span><h3>Framed the problems</h3><p>{research.firstRead.problemStatements} problem statements. The largest group was about credits. I ruled out exporters, browser clones and UI redesigns.</p></li>
          <li><span>3</span><h3>Used the product</h3><p>I walked through Computer, Hybrid and Skills on my own account.</p></li>
          <li><span>4</span><h3>Measured it</h3><p>{h.runs} runs with made-up files and answer keys, {PROTOCOL.period}.</p></li>
          <li><span>5</span><h3>Built the fix</h3><p>Run Receipt first, then Session to Skill.</p></li>
        </ol>
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
