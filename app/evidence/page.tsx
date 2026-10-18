import { readFileSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PROTOCOL, pairs, panelReadings, tally, widestRepeatRuns, type Side } from "@/lib/study.ts";
import { Dots, PanelChart } from "../charts";
import { load } from "../data";
import { credits, duration, money, pct, runs as runCount, span } from "../format";

export const metadata: Metadata = {
  title: "Evidence",
  description: "Five charts behind the Run Receipt case study, in the order of the three problems, with every measured run in a table.",
};

const n = (x: number) => x.toLocaleString("en-US");
const listOf = (values: number[]) => { const parts = values.map(credits); return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join(""); };
// "7/7 totals" reads better as "7 of 7 totals".
const spell = (score: string) => score.replace(/(\d+)\/(\d+)/g, "$1 of $2");
const result = (s: Side) => (s.results.length ? s.results.map(spell).join("; ") : "not graded");
const time = (s: Side) => {
  if (!s.seconds) return "not timed";
  return `${span(s.seconds, duration)}${s.fromScreenshots ? "*" : ""}${s.untimed ? ` (${s.seconds.n} of ${s.runIds.length} timed)` : ""}`;
};

// Five charts in the order of the three problems. Each title is the finding. Red marks what was wrong
// or charged later, green marks what matched, grey is the baseline. Everything else sits behind a fold.
// Built at build time from data/ through lib/. No figure on this page is typed by hand.
export default function Evidence() {
  const { runs, gate, replay: d } = load();
  const h = d.headline;
  const t = tally(runs, gate);
  const ps = pairs(runs, gate);
  const lab = ps.find((p) => p.task === "lab_flags");
  const readings = [...panelReadings(runs)].sort((a, b) => a.shownPct - b.shownPct);
  const labReading = lab ? readings.find((r) => r.id === lab.cloud.runIds[0]) : undefined;
  const repeat = widestRepeatRuns(runs);
  const finals = repeat.runs.map((r) => r.final).sort((a, b) => a - b);
  const cheapest = finals[0], dearest = finals[finals.length - 1];
  const hy = d.hybrid, cl = d.cloud, bh = d.budget.hybrid;
  const research = JSON.parse(readFileSync(path.join(process.cwd(), "data", "research.json"), "utf8")) as { corpus: { reviews: number }; firstRead: { reviews: number; problemStatements: number } };
  const ratio = (r: { reported: number | null; truth: number }) => (r.reported === null ? 0 : Math.min(150, (r.reported / r.truth) * 100));

  return (
    <main className="proto ev mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8">
      <header className="proto-intro">
        <h1>The evidence, in five charts</h1>
        <p>
          {h.runs} runs of Perplexity Computer on my own account, {PROTOCOL.period}. Each chart backs one of the three problems. <b>Red</b> is what was wrong or charged later, <b>green</b> is what matched.
        </p>
      </header>

      <section className="pv cost" aria-labelledby="ev-cost">
        <Side n="1" id="ev-cost" title="Cost is a surprise." note="Counts from my runs, not rates." />
        <div className="ev-stack">
          <Card title={`The same prompt cost ${listOf(finals)} credits`} sub={`${repeat.label}, ${repeat.setting}. The first part of each bar is the cheapest run; red is what the others cost on top.`}
            limit={`${runCount(repeat.runs.length)} of one prompt. It shows the price can move, not how often.`}>
            <ul className="hb" data-chart>
              {[...repeat.runs].sort((a, b) => a.final - b.final).map((r) => (
                <li key={r.id}>
                  <span>Run {r.id}</span>
                  <div className="hb-track">
                    <i className="hb-base m-grow-x" style={{ width: `${(cheapest / dearest) * 100}%` }} />
                    {r.final > cheapest && <i className="hb-over m-grow-x" style={{ width: `${((r.final - cheapest) / dearest) * 100}%`, animationDelay: "250ms" }} />}
                  </div>
                  <b className="fig">{credits(r.final)}</b>
                </li>
              ))}
            </ul>
          </Card>
          {h.effort && (
            <Card title={`One setting took the same prompt from ${credits(h.effort.standard)} to ${credits(h.effort.high)} credits`} sub={`Effort set to High, against Standard, on the web. ${h.effort.times}x the credits.`}
              limit="One run on each setting, web only.">
              <ul className="hb" data-chart>
                {[{ name: "Standard", value: h.effort.standard }, { name: "High", value: h.effort.high }].map((r) => (
                  <li key={r.name}>
                    <span>{r.name}</span>
                    <div className="hb-track">
                      <i className="hb-base m-grow-x" style={{ width: `${(h.effort!.standard / h.effort!.high) * 100}%` }} />
                      {r.value > h.effort!.standard && <i className="hb-over m-grow-x" style={{ width: `${((r.value - h.effort!.standard) / h.effort!.high) * 100}%`, animationDelay: "250ms" }} />}
                    </div>
                    <b className="fig">{credits(r.value)}</b>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </section>

      <section className="pv meter" aria-labelledby="ev-meter">
        <Side n="2" id="ev-meter" title="The credit meter reads low while you watch it." note="The panel does catch up later." />
        <div className="ev-stack">
          <Card title={`At Finished, the meter was below the final charge in ${h.panelLow} of ${h.panelReadings} readings`}
            sub="One column per run, lowest first. Blue is what the panel showed when the run said Finished. Red is the part of the charge that landed later."
            limit="Readings taken at the Finished screenshot. Final charges read from Analytics afterwards.">
            <div className="cols" data-chart role="img" aria-label={`Share of the final charge the panel showed at Finished, for ${readings.length} runs. ${h.panelLow} were below the final charge.`}>
              {readings.map((r, i) => {
                const matched = r.final - r.panel <= 0;
                return (
                  <div key={r.id} className="col" title={`Run ${r.id}, ${r.label}: panel ${credits(r.panel)}, final ${credits(r.final)} (${pct(r.shownPct)} shown)`}>
                    <div className="col-bar m-grow-y" style={{ animationDelay: `${i * 20}ms` }}>
                      {!matched && <i className="col-later" style={{ height: `${100 - Math.min(100, r.shownPct)}%` }} />}
                      <i className={matched ? "col-match" : "col-shown"} style={{ height: `${Math.min(100, r.shownPct)}%` }} />
                    </div>
                    <span className="fig">{r.id}</span>
                  </div>
                );
              })}
            </div>
            <p className="key"><span><i className="k-shown" />Shown at Finished</span><span><i className="k-later" />Charged later</span><span><i className="k-match" />Already matched</span></p>
          </Card>
          {labReading && (
            <Card title={`One run showed ${credits(labReading.panel)} credits at Finished and cost ${credits(labReading.final)}`} sub="The same session, on the Mac app and then on the web about half a minute later.">
              <div className="shots">
                <Shot src="run05-mac-panel-at-finished" w={660} h={456} alt={`Mac app usage panel reading Credits used ${credits(labReading.panel)}.`}>Mac app, at Finished.</Shot>
                <Shot src="run05-web-usage-30s-later" w={660} h={520} alt={`Web session usage panel for the same session reading ${credits(labReading.final)} credits.`}>The web, about half a minute later.</Shot>
              </div>
            </Card>
          )}
        </div>
      </section>

      <section className="pv hybrid" aria-labelledby="ev-hybrid">
        <Side n="3" id="ev-hybrid" title="Hybrid mode is unpredictable." note={`One Mac, one local model (${PROTOCOL.localModel}).`} />
        <div className="ev-stack">
          <Card title={`With Hybrid on, a step ran on my Mac in ${h.hybridRanLocal} of ${h.hybridOn} runs`}
            sub="One dot per run with Hybrid on. Filled means the local model ran. It ran only when Perplexity’s privacy prompt (the Privacy Gate) appeared, and that prompt flagged the bank file and nothing else."
            limit={lab ? `In the other runs nothing ran locally. One of them, ${lab.label.toLowerCase()}, cost ${credits(lab.hybrid.credits.min)} credits with Hybrid on against ${credits(lab.cloud.credits.min)} in the cloud.` : undefined}>
            <Dots tone="hybrid" total={h.hybridOn} on={h.hybridRanLocal} perRow={8} label={`${h.hybridRanLocal} of ${h.hybridOn} runs with Hybrid on ran a step on the Mac`} />
          </Card>
          <Card title={`When it did run locally, ${hy.totalsRight} of ${hy.rows.length} totals matched my file`}
            sub={`Bank report, Hybrid run ${hy.run.id}. Each bar is what the report said, as a share of the real total. The line marks the real total.`}
            limit={`The cloud run of the same task got ${cl.totalsRight} of ${cl.rows.length}. In ${t.localRunsNotFullMarks} of the ${t.localRuns} runs where the local model ran, the result was wrong or incomplete. On the Excel budget, ${bh.completeRows} of ${bh.rowCount} rows came back complete.`}>
            <ul className="hb truth" data-chart>
              {hy.rows.map((r) => (
                <li key={r.category}>
                  <span>{r.category}</span>
                  <div className="hb-track">
                    {r.reported === null ? <i className="hb-held" /> : <i className={`${r.ok ? "hb-match" : "hb-over"} m-grow-x`} style={{ width: `${(ratio(r) / 150) * 100}%` }} />}
                    <i className="hb-mark" />
                  </div>
                  <b className="fig">{r.reported === null ? "left out" : money(r.reported)} <em>of {money(r.truth)}</em></b>
                </li>
              ))}
            </ul>
            <p className="key"><span><i className="k-later" />What the Hybrid report said</span>{hy.rows.some((r) => r.ok) && <span><i className="k-match" />Matches the file</span>}{hy.rows.some((r) => r.reported === null) && <span><i className="k-held" />Left out of the report</span>}<span><i className="k-mark" />The real total</span></p>
          </Card>
          <Card title="The spreadsheet run said so itself: “You need to fill in a few cells”" sub={`Excel budget, Hybrid run ${bh.run.id}. The values it left blank were on the Mac the whole time.`}>
            <Shot src="run22-reply-fill-in-cells" w={1411} h={392} alt="The run's reply: You need to fill in a few cells.">The run&apos;s own reply.</Shot>
          </Card>
        </div>
      </section>

      <section className="proto-try" aria-labelledby="ev-all">
        <h2 id="ev-all">Everything behind the charts</h2>
        <details className="fold">
          <summary>All {ps.length} tasks run both ways: credits, time and results</summary>
          <div className="scroll-x mt-4" tabIndex={0} role="region" aria-label="Paired runs table">
            <table className="data min-w-[66rem] [&_th]:whitespace-nowrap">
              <thead>
                <tr><th>Task</th><th>Privacy Gate</th><th>Ran on the Mac</th><th className="num">Cloud credits</th><th className="num">Hybrid credits</th><th className="num">Cloud time</th><th className="num">Hybrid time</th><th>Cloud result</th><th>Hybrid result</th></tr>
              </thead>
              <tbody>
                {ps.map((p) => (
                  <tr key={p.task}>
                    <td className="font-semibold whitespace-nowrap">{p.label}</td>
                    <td>{p.gate}</td>
                    <td>{p.ranLocal ? "yes" : "no"}</td>
                    <td className="num fig">{span(p.cloud.credits, credits)}</td>
                    <td className="num fig">{span(p.hybrid.credits, credits)}</td>
                    <td className="num fig">{time(p.cloud)}</td>
                    <td className="num fig">{time(p.hybrid)}</td>
                    <td className="min-w-[9rem]">{result(p.cloud)}</td>
                    <td className={`min-w-[9rem] ${p.hybrid.fullMarks === false ? "bad" : ""}`}>{result(p.hybrid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small mt-3">* Includes times read from screenshot timestamps, not a stopwatch.</p>
        </details>
        <details className="fold">
          <summary>All {readings.length} meter readings, run by run</summary>
          <div className="mt-4 max-w-[52rem]"><PanelChart readings={panelReadings(runs)} /></div>
        </details>
        <details className="fold">
          <summary>How I got to this problem, in five steps</summary>
          <ol className="sum-path mt-6">
            <li><span>1</span><h3>Read what users say</h3><p>{n(research.firstRead.reviews)} recent App Store reviews, Reddit threads and press coverage. Later, {n(research.corpus.reviews)} store reviews in a dashboard.</p></li>
            <li><span>2</span><h3>Framed the problems</h3><p>{research.firstRead.problemStatements} problem statements. The largest group was about credits. I ruled out exporters, browser clones and UI redesigns.</p></li>
            <li><span>3</span><h3>Used the product</h3><p>I walked through Computer, Hybrid and Skills on my own account.</p></li>
            <li><span>4</span><h3>Measured it</h3><p>{h.runs} runs with made-up files and answer keys, {PROTOCOL.period}.</p></li>
            <li><span>5</span><h3>Built the fix</h3><p>Run Receipt first, then Session to Skill.</p></li>
          </ol>
        </details>
        <details className="fold">
          <summary>How I ran the experiment, and what it cannot tell you</summary>
          <div className="prose mt-4 max-w-[46rem]">
            <p>Every file is made up: a bank export of {d.txnCount} transactions, an invoice list and a set of lab results. Each has an answer key, kept out of the test folder so it could not be attached by mistake.</p>
            <p>For each run I recorded the panel reading when it said Finished, the final charge from Analytics, the time, the files it produced, and whether the Privacy Gate appeared. I graded each output against its key afterwards.</p>
            <p>&ldquo;Hybrid&rdquo; means the Hybrid toggle was on, with {PROTOCOL.localModel} as the local model. &ldquo;Cloud&rdquo; means it was off. {t.planned} planned tasks and {t.earlyTests} early tests, {credits(t.totalCredits)} credits ({money(t.totalUsd)}) in total. Task types: {t.taskLabels.join("; ")}.</p>
            <p>Small numbers. Most comparisons are one run on each side, on one account, one Mac and one local model, in one week. Nothing here is a rate.</p>
          </div>
        </details>
        <p className="sum-actions mt-8">
          <Link href="/receipt#solution" className="btn">See the fix on these runs</Link>
          <Link href="/" className="btn btn-quiet">Back to the problem</Link>
        </p>
      </section>
    </main>
  );
}

function Side({ n, id, title, note }: { n: string; id: string; title: string; note: string }) {
  return (
    <div className="pv-problem">
      <p className="pv-n" aria-hidden="true">{n}</p>
      <h2 id={id}>{title}</h2>
      <p className="pv-answer">{note}</p>
    </div>
  );
}

function Card({ title, sub, limit, children }: { title: string; sub: string; limit?: string; children: React.ReactNode }) {
  return (
    <article className="ev-card">
      <h3>{title}</h3>
      <p className="ev-sub">{sub}</p>
      <div className="ev-chart">{children}</div>
      {limit && <p className="ev-limit">{limit}</p>}
    </article>
  );
}

function Shot({ src, w, h, alt, children }: { src: string; w: number; h: number; alt: string; children: React.ReactNode }) {
  return (
    <figure className="shot">
      <div className="frame">
        <Image src={`/evidence/${src}.webp`} width={w} height={h} alt={alt} sizes="(min-width: 700px) 640px, 100vw" />
      </div>
      <figcaption>Screenshot. {children}</figcaption>
    </figure>
  );
}
