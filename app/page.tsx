import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { day } from "@/lib/livedemo.ts";
import { PROPOSED, PROTOCOL, rangeBacktest } from "@/lib/study.ts";
import { load } from "./data";
import { credits, span } from "./format";
import { PersonaLink, StatBand, WhoWhatWhy } from "./persona";

type Research = {
  dashboardUrl: string | null;
  corpus: { reviews: number; from: string; to: string; iosTo: string };
  labelCheck: { matches: number; n: number };
  creditsRunOut: { reviews: number; lowStar: number };
};
const n = (x: number) => x.toLocaleString("en-US");
const LINKEDIN = "https://www.linkedin.com/in/abhinavgupta0809";
const GITHUB = "https://github.com/abhinavgupta0809";
const PORTFOLIO = "https://abhinavgupta0809.github.io/";
const RESUME = "https://abhinavgupta0809.github.io/cv.html";

// The front page: hero, who / problem / why, film, the research as numbers, the two personas and their
// prototypes, how we'd know it worked, why listen to me, and what is real. Figures come from data/ through lib/.
export default function Overview() {
  const { runs, replay: d } = load();
  const h = d.headline;
  const research = JSON.parse(readFileSync(path.join(process.cwd(), "data", "research.json"), "utf8")) as Research;
  const skillDay = day((JSON.parse(readFileSync(path.join(process.cwd(), "data", "skill", "live", "sessions.json"), "utf8")) as { recordedOn: string }[])[0].recordedOn);
  const raw = rangeBacktest(runs);
  const padded = rangeBacktest(runs, PROPOSED.padPct);
  const business = JSON.parse(readFileSync(path.join(process.cwd(), "data", "business.json"), "utf8")) as { plans: { name: string; usdPerMonth: number }[] };
  // "Pro ($20) or Max ($200)": list prices from Perplexity's Help Center, see data/business.json.
  const plans = business.plans.map((p) => `${p.name} ($${p.usdPerMonth})`).join(" or ");

  return (
    <main className="ov">
      <header className="ov-hero">
        <div>
          <p className="tp-independent">Two prototypes for Perplexity Computer · independent, not made by or with Perplexity</p>
          <h1>Same prompt, three runs, <em>three prices.</em></h1>
          <p className="sum-lede">I measured {h.runs} Computer runs on my own account. I found two gaps: you can&apos;t see what a run will cost before you send it, and a task you repeat redoes every step unless you&apos;ve already written a skill for it. Here&apos;s what I&apos;d build for each.</p>
        </div>
        <figure className="ov-hero-film">
          <video controls playsInline preload="metadata" poster="/video/run-receipt-overview.jpg" width={1920} height={1080}>
            <source src="/video/run-receipt-overview.mp4" type="video/mp4" />
            Your browser can&apos;t play this video. <a href="/video/run-receipt-overview.mp4">Download it</a>.
          </video>
          <figcaption>43 seconds · two personas, both prototypes · Run Receipt replays my recorded runs, Session to Skill shows the real skill and its Perplexity answer · no speech, so it works with the sound off · soundtrack made for this film</figcaption>
        </figure>
      </header>

      <section aria-label="Who it's for, the problem, and why it matters">
        <WhoWhatWhy
          who={<><b>Paying Computer users</b> on {plans} a month, who hand it real multi-step work.</>}
          what={<><b>No price before you send.</b> One prompt cost {span(h.widestRepeat.credits, credits)} credits across {h.widestRepeat.credits.n} runs on one setting.</>}
          why={<><b>{n(research.creditsRunOut.reviews)} reviews</b> are about running out of credits, most from people who say they pay; {n(research.creditsRunOut.lowStar)} gave 1 or 2 stars. If people can&apos;t predict a price, they send fewer runs (my assumption).</>}
        />
      </section>

      <section className="ov-dash-sec" aria-label="The reviews dashboard">
        {research.dashboardUrl && (
          <a className="ov-data" href={research.dashboardUrl} target="_blank" rel="noopener" aria-label={`Real customer data, analyzed: open the Perplexity app reviews dashboard (${n(research.corpus.reviews)} reviews)`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/reviews-dashboard.webp" width={1080} height={885} alt={`The Perplexity app reviews dashboard: ${n(research.corpus.reviews)} public reviews and a chart of where the signal is.`} />
            <span className="ov-data-cap"><strong>Real customer data, analyzed</strong><span>{n(research.corpus.reviews)} public app reviews, labelled and charted · open the dashboard ↗</span></span>
          </a>
        )}
      </section>

      <section aria-labelledby="work-h">
        <div className="ov-head">
          <h2 id="work-h" className="sum-h2">The work behind it</h2>
          <p>Customer data first, then my own measured runs, then the prototypes.</p>
        </div>
        <StatBand label="The research, by the numbers" stats={[
          { icon: "reviews", value: n(research.corpus.reviews), label: "app reviews parsed and labelled" },
          { icon: "check", value: `${research.labelCheck.matches}/${research.labelCheck.n}`, label: "labels matched my hand check" },
          { icon: "play", value: String(h.runs), label: "Computer runs measured, every credit logged" },
          { icon: "layers", value: String(h.taskTypes), label: "task types, from bank reports to price lookups" },
          { icon: "build", value: "2", label: "working prototypes" },
        ]} />
      </section>

      <section aria-labelledby="protos-h">
        <div className="ov-head">
          <h2 id="protos-h" className="sum-h2">Two people, two prototypes</h2>
          <p>Computer should tell you what a run will cost, and turn the work you keep repeating into a skill.</p>
        </div>
        <div className="ov-personas">
          <PersonaLink href="/receipt" tone="rr" icon="coins" name="The paying power user"
            line={`Pays ${plans} a month and gives Computer real work: reports, research, file checks.`}
            pain={{ icon: "reviews", value: n(research.creditsRunOut.reviews), label: "store reviews about running out of credits, most from people who say they pay" }}
            proto="Run Receipt" protoLine="A cost range before you send, an honest count while it runs, sums checked by code after."
            ev={{ cls: "strong", text: "Measured in my runs" }} />
          <PersonaLink href="/skill" tone="sk" icon="repeat" name="The repeat-task user"
            line="Does the same kind of job on new inputs: a price check, a vendor comparison."
            pain={{ icon: "receipt", value: "3×", label: "one pricing prompt in my cost test, every step redone and paid for each time" }}
            proto="Session to Skill" protoLine="Price two apps, then two more: you get asked once, and the method becomes a skill that runs on any app."
            ev={{ cls: "hyp", text: "Seen in my sessions, to test" }} />
        </div>
      </section>

      <section aria-labelledby="tree-h">
        <div className="ov-head">
          <h2 id="tree-h" className="sum-h2">How we&apos;d know it worked</h2>
          <p>Each prototype has one number that decides it. Both roll up to one Perplexity-level goal.</p>
        </div>
        <div className="ov-tree">
          <div className="ov-root"><span className="bm-label">Perplexity-level goal (my assumption)</span><strong>Paying Computer users who stay subscribed</strong><span className="ov-bline">North star: paying users with a kept task in at least 3 of the last 4 weeks.</span></div>
          <div className="ov-branches">
            <Link className="ov-branch is-rr" href="/receipt#metrics-h">
              <span className="ov-n">01 · Run Receipt</span>
              <span className="bm-label">Feature north star</span>
              <strong>Estimate hit rate</strong>
              <span className="ov-bline">Runs that land inside the quoted range. {raw.hits} of {raw.n} in my runs, or {padded.hits} of {padded.n} with the range {PROPOSED.padPct}% wider; proposed bar {PROPOSED.hitRatePct}%.</span>
            </Link>
            <Link className="ov-branch is-sk" href="/skill#metrics-h">
              <span className="ov-n">02 · Session to Skill</span>
              <span className="bm-label">Feature north star</span>
              <strong>Skills run again</strong>
              <span className="ov-bline">Saved skills run at least twice in the 14 days after saving. No baseline yet.</span>
            </Link>
          </div>
        </div>
        <p className="ov-fine">I have no Perplexity data, so there are no real baselines; every bar is a proposal. The Perplexity-level goal is my assumption.</p>
      </section>

      <section aria-labelledby="about-h" className="ov-about">
        <div className="ov-about-copy">
          <h2 id="about-h" className="sum-h2">Why listen to me</h2>
          <p className="ov-lede">I measured before I proposed anything. I ran the tasks on my own account, logged every credit, and graded results against files with a known answer.</p>
          <p><strong>Abhinav Gupta.</strong> MS Product Management, Carnegie Mellon (Tepper), Dec 2026. Six years in product and growth at Flipkart, ShareChat, Meesho and Tata 1mg.</p>
          <p className="ov-buttons"><a className="btn" href={PORTFOLIO} target="_blank" rel="noopener">Portfolio</a><a className="btn btn-quiet" href={RESUME} target="_blank" rel="noopener">Résumé</a><a className="btn btn-quiet" href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a><a className="btn btn-quiet" href={GITHUB} target="_blank" rel="noopener">GitHub</a><Link className="btn btn-quiet" href="/evidence">Evidence</Link></p>
        </div>
        <p className="ov-fine">One account, one Mac. Run Receipt runs {PROTOCOL.period}; Session to Skill sessions recorded {skillDay}. Every finding is a small count, not a measured rate. Built with Claude Code as a coding partner.</p>
      </section>

      <section className="ov-real" aria-label="What's real and what's simulated">
        <details className="rfold">
          <summary><strong>What&apos;s real and what&apos;s simulated</strong><span>Read before you quote a number</span></summary>
          <ul>
            <li><b>Real:</b> the credits, times and results of {h.runs} runs on my own account, {PROTOCOL.period}, and the review counts and quotes from the dashboard ({research.corpus.from} to {research.corpus.to}{research.corpus.iosTo !== research.corpus.to ? `; App Store reviews end ${research.corpus.iosTo}` : ""}).</li>
            <li><b>Real on Perplexity:</b> Session to Skill&apos;s skill was written from two recorded sessions and run on Perplexity&apos;s Agent API.</li>
            <li><b>Simulated:</b> Run Receipt replays recorded runs and does not connect to Perplexity. Its test files are made up. The skill offer inside Computer and the sidebar are my proposal.</li>
            <li><b>Not yet done:</b> testing either prototype with Perplexity users.</li>
          </ul>
        </details>
      </section>
    </main>
  );
}
