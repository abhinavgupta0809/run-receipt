import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { PROPOSED, PROTOCOL, rangeBacktest } from "@/lib/study.ts";
import { load } from "./data";

type Research = { dashboardUrl: string | null; corpus: { reviews: number; from: string; to: string } };
const n = (x: number) => x.toLocaleString("en-US");
const LINKEDIN = "https://www.linkedin.com/in/abhinavgupta0809";
const GITHUB = "https://github.com/abhinavgupta0809";

// The front page, in the shape of the Wispr Flow prototypes overview: hero, film, the two prototypes,
// how we'd know it worked, why listen to me, and what is real. Figures come from data/ through lib/.
export default function Overview() {
  const { runs, replay: d } = load();
  const h = d.headline;
  const research = JSON.parse(readFileSync(path.join(process.cwd(), "data", "research.json"), "utf8")) as Research;
  const raw = rangeBacktest(runs);

  return (
    <main className="ov">
      <header className="ov-hero">
        <div>
          <p className="tp-independent">Two prototypes for Perplexity Computer · independent, not made by or with Perplexity</p>
          <h1>Same prompt, three runs, <em>three prices.</em></h1>
          <p className="sum-lede">I measured {h.runs} runs of Computer on my own account. Here are two moments where it leaves you guessing, and what I&apos;d build so it doesn&apos;t.</p>
        </div>
        {research.dashboardUrl && (
          <a className="ov-data" href={research.dashboardUrl} target="_blank" rel="noopener" aria-label={`Real customer data, analyzed: open the Perplexity app reviews dashboard (${n(research.corpus.reviews)} reviews)`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/reviews-dashboard.webp" width={1080} height={885} alt={`The Perplexity app reviews dashboard: ${n(research.corpus.reviews)} public reviews, average 4.20 stars, and a chart of where the signal is.`} />
            <span className="ov-data-cap"><strong>Real customer data, analyzed</strong><span>{n(research.corpus.reviews)} public app reviews, labelled and charted · open the dashboard ↗</span></span>
          </a>
        )}
      </header>

      <section className="ov-film" aria-label="Both prototypes in 37 seconds">
        <figure>
          <video controls playsInline preload="metadata" poster="/video/run-receipt-overview.jpg" width={1920} height={1080}>
            <source src="/video/run-receipt-overview.mp4" type="video/mp4" />
            Your browser can&apos;t play this video. <a href="/video/run-receipt-overview.mp4">Download it</a>.
          </video>
          <figcaption>37 seconds · both prototypes, replaying my recorded runs · no speech, so it works with the sound off · soundtrack made for this film</figcaption>
        </figure>
      </section>

      <section aria-labelledby="protos-h">
        <div className="ov-head">
          <h2 id="protos-h" className="sum-h2">Two prototypes, one idea</h2>
          <p>Computer should tell you what a run will cost, and remember the work you keep repeating.</p>
        </div>
        <ol className="ov-protos">
          <li>
            <Link className="ov-proto is-rr" href="/receipt">
              <span className="ov-n">01</span>
              <span className="ov-when">When the price is a surprise</span>
              <span className="ov-name">Run Receipt</span>
              <span className="ov-line">A cost range before you send, an honest count while it runs, numbers checked by code after.</span>
              <span className="ov-ev strong">Measured in my runs</span>
              <span className="ov-go" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link className="ov-proto is-sk" href="/skill">
              <span className="ov-n">02</span>
              <span className="ov-when">When you repeat a task</span>
              <span className="ov-name">Session to Skill</span>
              <span className="ov-line">Do a task three times, get asked once, then call it with a slash command.</span>
              <span className="ov-ev hyp">Seen in my sessions, to test</span>
              <span className="ov-go" aria-hidden="true">→</span>
            </Link>
          </li>
        </ol>
      </section>

      <section aria-labelledby="tree-h">
        <div className="ov-head">
          <h2 id="tree-h" className="sum-h2">How we&apos;d know it worked</h2>
          <p>Each prototype has one number that decides it. Both roll up to one Perplexity-level goal.</p>
        </div>
        <div className="ov-tree">
          <div className="ov-root"><span className="bm-label">Perplexity-level goal (my assumption)</span><strong>Paying Computer users who stay subscribed</strong></div>
          <div className="ov-branches">
            <Link className="ov-branch is-rr" href="/receipt#metrics-h">
              <span className="ov-n">01 · Run Receipt</span>
              <span className="bm-label">North star</span>
              <strong>Estimate hit rate</strong>
              <span className="ov-bline">Runs that land inside the quoted range. {raw.hits} of {raw.n} in my runs today; proposed bar {PROPOSED.hitRatePct}%.</span>
            </Link>
            <Link className="ov-branch is-sk" href="/skill#metrics-h">
              <span className="ov-n">02 · Session to Skill</span>
              <span className="bm-label">North star</span>
              <strong>Skills run again</strong>
              <span className="ov-bline">Saved skills used twice in the 14 days after saving. No baseline yet.</span>
            </Link>
          </div>
        </div>
        <p className="ov-fine">I have no Perplexity data, so there are no real baselines; every bar is a proposal. The Perplexity-level goal is my assumption.</p>
      </section>

      <section aria-labelledby="about-h" className="ov-about">
        <div className="ov-about-copy">
          <h2 id="about-h" className="sum-h2">Why listen to me</h2>
          <p className="ov-lede">I didn&apos;t guess. I ran the tasks on my own account, recorded every credit, and graded the results against files with a known answer.</p>
          <p>How: I labelled {n(research.corpus.reviews)} public app reviews in a <a href={research.dashboardUrl ?? "#"} target="_blank" rel="noopener">reviews dashboard</a>, then ran {h.runs} measured runs across {h.taskTypes} task types before designing anything (<Link href="/evidence">evidence</Link>).</p>
          <p><strong>Abhinav Gupta.</strong> MS Product Management at Carnegie Mellon (Tepper), December 2026. About six years in product, growth and strategy at Flipkart, ShareChat, Meesho and Tata 1mg. I ran the study, built the dashboard and built these prototypes, with Claude Code as a coding partner.</p>
          <p className="ov-buttons"><a className="btn" href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a><a className="btn btn-quiet" href={GITHUB} target="_blank" rel="noopener">GitHub</a></p>
        </div>
        <dl className="ov-stats" aria-label="By the numbers">
          <div><dt>{h.runs}</dt><dd>measured runs of Computer, {PROTOCOL.period}</dd></div>
          <div><dt>{h.taskTypes}</dt><dd>task types, from bank reports to price lookups</dd></div>
          <div><dt>{n(research.corpus.reviews)}</dt><dd>app reviews read and labelled</dd></div>
          <div><dt>2</dt><dd>working prototypes</dd></div>
        </dl>
        <p className="ov-fine">One account, one Mac, one week. Every comparison is a count, not a rate.</p>
      </section>

      <section className="ov-real" aria-label="What's real and what's simulated">
        <details className="rfold">
          <summary><strong>What&apos;s real and what&apos;s simulated</strong><span>Read before you quote a number</span></summary>
          <ul>
            <li><b>Real:</b> the credits, times and results of {h.runs} runs on my own account, {PROTOCOL.period}, and the review counts and quotes from the dashboard ({research.corpus.from} to {research.corpus.to}).</li>
            <li><b>Simulated:</b> both prototypes replay recorded runs and do not connect to Perplexity. The test files are made up. The skill offer, the one-click build and the slash command are my proposal.</li>
            <li><b>Not yet done:</b> testing either prototype with Perplexity users.</li>
          </ul>
        </details>
      </section>
    </main>
  );
}
