import Image from "next/image";
import Link from "next/link";
import { PROTOCOL, pairs, panelReadings, settingsFor, tally, widestRepeatRuns, type Side } from "@/lib/study.ts";
import type { ReplayData } from "@/lib/replay.ts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evidence",
  description: "Every table, chart and screenshot behind the Run Receipt case study: 27 measured runs of Perplexity Computer.",
};
import { Bars, PairsChart, PanelChart, MeterColumns, HybridRing, PanelSlope } from "../charts";
import { load } from "../data";
import { credits, duration, money, runs as runCount, signed, signedPct, span } from "../format";

// "7/7 totals" reads better as "7 of 7 totals".
const spell = (score: string) => score.replace(/(\d+)\/(\d+)/g, "$1 of $2");
const result = (s: Side) => (s.results.length ? s.results.map(spell).join("; ") : "not graded");
const time = (s: Side) => {
  if (!s.seconds) return "not timed";
  return `${span(s.seconds, duration)}${s.fromScreenshots ? "*" : ""}${s.untimed ? ` (${s.seconds.n} of ${s.runIds.length} timed)` : ""}`;
};

// Built at build time from data/ through lib/. No figure on this page is typed by hand.
export default function Evidence() {
  const { runs, rec, budget, gate, txns, replay: d } = load();
  const h = d.headline;
  const t = tally(runs, gate);
  const ps = pairs(runs, gate);
  const idle = ps.filter((p) => !p.ranLocal);
  const bank = ps.find((p) => p.task === "file_report")!;
  const sheet = ps.find((p) => p.task === "budget_spreadsheet")!;
  const lab = ps.find((p) => p.task === "lab_flags")!;
  const readings = panelReadings(runs);
  const emptiest = readings.reduce((a, b) => (b.final - b.panel > 0 && b.shownPct < a.shownPct ? b : a));
  const labReading = readings.find((r) => r.id === lab.cloud.runIds[0])!;
  const repeat = widestRepeatRuns(runs);
  const samePrompt = settingsFor(runs, "note_apps");
  const firstPair = { cloud: runs.find((r) => r.id === bank.cloud.runIds[0])!, hybrid: runs.find((r) => r.id === bank.hybrid.runIds[0])! };
  const bh = d.budget.hybrid;
  const bc = d.budget.cloud;
  const blankAmounts = bh.gaps.filter((g) => g.field === "amount");
  const shortened = bh.gaps.filter((g) => g.field === "description");
  const gapIds = new Set(bh.gaps.map((g) => g.id));
  const sample = [...budget.hybrid.rows.filter((r) => gapIds.has(r.id)), ...budget.hybrid.rows.filter((r) => !gapIds.has(r.id)).slice(0, 2)].sort((a, b) => a.id - b.id);
  const failed = d.hybrid.checks.filter((c) => !c.passed).length;

  return (
    <main className="report">
      <div className="report-head">
        <div><p className="eyebrow">Research report / {PROTOCOL.period}</p>
          <h1>The evidence, run by run</h1>
          <p className="meta"><strong>Abhinav Gupta</strong><span>/</span> one account <span>/</span> {PROTOCOL.period}</p>
        </div>
        <p id="goal" className="intro">I am a product manager with six years of experience, now studying at Carnegie Mellon University. I measured Perplexity Computer. I ran {t.planned} tasks and {t.earlyTests} early tests on my own account, and I logged the cost, time and accuracy of each. I found three problems and built a fix. This page holds every table, chart and screenshot behind the summary.</p>
      </div>
      <div className="stat-grid">
        <Stat value={`${h.runs}`} label="Runs measured" note={`${t.planned} tasks, ${t.earlyTests} early tests`} />
        <Stat value={`${h.taskTypes}`} label="Task types" note={`across ${h.runs} runs`} />
        <Stat value={credits(t.totalCredits)} label="Credits spent" note={`${money(t.totalUsd)} in total`} />
        <Stat tone="cost" value={span(h.widestRepeat.credits, credits)} label={`Same prompt, ${runCount(repeat.runs.length)}`} note="credits, same setting" />
        <Stat tone="meter" value={`${h.panelLow} of ${h.panelReadings}`} label="Meter readings low" note="at Finished; it catches up later" />
        <Stat tone="hybrid" value={`${h.hybridRanLocal} of ${h.hybridOn}`} label="Hybrid ran locally" note="with Hybrid on, one Mac" />
      </div>
      <div className="dashboard-main">
        <ChartCard tone="meter" finding="2" title="Share of the final charge the panel showed at Finished" subtitle="One bar per run with a panel reading. A full bar means the panel already showed the charge." callout={<><b>The meter reads low while you watch it.</b> The panel was below the final charge in {h.panelLow} of {h.panelReadings} readings.</>} limit="Read when the run said Finished. The panel does catch up later.">
          <MeterColumns readings={readings} />
        </ChartCard>
        <div className="chart-card receipt-card"><div className="card-heading"><h2>One run, as its receipt</h2><Link href="/receipt" className="eyebrow">The fix</Link></div><MiniReceipt d={d} failed={failed} /><Link href="/receipt" className="receipt-link">Open the prototype →</Link></div>
      </div>
      <div className="dashboard-secondary">
        <ChartCard tone="cost" finding="1" title={`Same prompt, ${runCount(repeat.runs.length)}`} subtitle={`${repeat.label}. ${repeat.setting}.`} callout={<><b>Cost is a surprise.</b> The dearest run cost {h.widestRepeat.spreadPct}% more than the cheapest. Nothing estimates the cost before you send.</>} limit={`${runCount(repeat.runs.length)} of one prompt on one account. A count, not a rate.`}>
          <Bars label="Final credits for repeated runs of the same prompt and setting" unit="credits" rows={repeat.runs.map(r => ({name:`Run ${r.id}`, value:r.final}))} />
        </ChartCard>
        <ChartCard tone="hybrid" finding="3" title="Did the local model run?" subtitle={`${h.hybridOn} runs with Hybrid on`} callout={<><b>Hybrid mode is unpredictable.</b> The local model ran in {h.hybridRanLocal} of {h.hybridOn} runs. In {t.localRunsNotFullMarks} of those {t.localRuns}, the result fell short.</>} limit={`${h.hybridOn} Hybrid runs on one Mac with one local model.`}>
          <HybridRing local={h.hybridRanLocal} total={h.hybridOn} />
        </ChartCard>
        <ChartCard tone="hybrid" finding="3" title="Cloud against Hybrid, by task" subtitle={`Credits, lowest run on each side, ${t.pairs} tasks`} callout={<><b>Cost moved both ways.</b> Hybrid cost less in {t.pairsHybridLower} of {t.pairs} tasks and more in {t.pairsHybridHigher}.</>} limit="Most pairs are one run on each side. These are separate tasks, not a time series.">
          <PairsChart pairs={ps} />
        </ChartCard>
      </div>
      <p className="source">Source: {h.runs} runs logged on one account, {PROTOCOL.period}. Counts, not rates. Most pairs are one run on each side.</p>
      <section className="what-section">          <h2 id="what" className="mt-12 text-2xl font-bold tracking-tight">
            What Run Receipt is
          </h2>
          <div className="prose mt-3">
            <p>A receipt for one run, shown at three moments.</p>
            <dl className="space-y-2">
              <Moment when="Before you send" what="The plan, where each step will run, and a credit range taken from past runs." />
              <Moment when="While it runs" what="The credit count, marked provisional until the charge settles." />
              <Moment when="After" what="Checks done by code, what was withheld from the result, and a way to repair it." />
            </dl>
            <p className="pt-2">
              <Link href="/receipt" className="btn">
                Open the prototype
              </Link>
            </p>
          </div>
</section>
      <nav aria-label="On this page" className="small mt-12 flex flex-wrap gap-x-5 gap-y-1 border-y border-rule py-3">
        <a href="#why">Why it is needed</a>
        <a href="#method">How I ran the experiment</a>
        <a href="#observed">What I observed</a>
        <a href="#cost" className="cost toc-finding">Cost</a><a href="#meter" className="meter toc-finding">The meter</a><a href="#hybrid" className="hybrid toc-finding">Hybrid</a>
        <a href="#limits">Limits</a>
        <Link href="/receipt">The prototype</Link>
      </nav>

      <H2 id="why">Why it is needed</H2>
      <Block
        notes={
          <p>
            Counts, not rates. This is {h.runs} runs on one account. Each number says what happened in these runs.
          </p>
        }
      >
        <ol className="space-y-6">
          <Problem
            title="Cost is a surprise."
            figure={`${span(h.widestRepeat.credits, credits)} credits`}
            body={`Nothing estimates the cost before you send. The same prompt on the same setting cost ${span(h.widestRepeat.credits, credits)} credits across ${runCount(h.widestRepeat.credits.n)}.`}
          />
          <Problem
            title="The credit meter reads low while you watch it."
            figure={`${h.panelLow} of ${h.panelReadings} readings`}
            body={`When the run said Finished, the panel was below the final charge in ${h.panelLow} of ${h.panelReadings} readings.`}
          />
          <Problem
            title="Hybrid mode is unpredictable."
            figure={`${h.hybridRanLocal} of ${h.hybridOn} runs`}
            body={`Hybrid is meant to run private steps on your Mac. With it on, the local model ran in ${h.hybridRanLocal} of ${h.hybridOn} runs. In ${t.localRunsNotFullMarks} of those ${t.localRuns}, the result was wrong or incomplete.`}
          />
        </ol>
      </Block>

      <H2 id="method">How I ran the experiment</H2>
      <Block
        notes={
          <>
            <p>Task types: {t.taskLabels.join("; ")}.</p>
            <p className="mt-3">
              &ldquo;Hybrid&rdquo; means the Hybrid toggle was on, with {PROTOCOL.localModel} as the local model. &ldquo;Cloud&rdquo; means it was off.
            </p>
          </>
        }
      >
        <div className="prose">
          <p>
            Every file is made up: a bank export of {d.txnCount} transactions, an invoice list and a set of lab results. Each has an answer key. I kept the keys out of the test folder so they could not be attached by mistake.
          </p>
          <p>For each run I recorded the panel reading when it said Finished, the final charge from Analytics, the time, the files it produced, and whether the Privacy Gate appeared. I graded each output against its key afterwards.</p>
        </div>
        <dl className="mt-6 max-w-[34rem] space-y-1.5 text-[0.9375rem]">
          <Line label="Runs" value={`${t.planned} planned, ${t.earlyTests} early tests`} />
          <Line label="Task types" value={`${h.taskTypes}`} />
          <Line label="Where" value={`Mac app, plus ${runCount(t.webRuns)} on the web`} />
          <Line label="When" value={PROTOCOL.period} />
          <Line label="Account" value={`one, ${PROTOCOL.account}`} />
          <Line label="Stop rule" value={`stop any run past ${PROTOCOL.stopRuleCredits} credits`} />
          <Line label="Highest run" value={`${credits(t.highestFinal)} credits`} />
          <Line label="Total spent" value={`${credits(t.totalCredits)} credits, ${money(t.totalUsd)}`} />
        </dl>
        <p className="prose mt-6">It is one account, one Mac and one week. Most settings have a single run.</p>
      </Block>

      <H2 id="observed">What I observed</H2>

      <H3 id="hybrid" exhibit="1" finding="3" tone="hybrid">In these runs, Hybrid did nothing, or it ran and the result fell short</H3>
      <Block meaning="The app did not say beforehand whether a step would run on the Mac." reading="Each line compares the lowest cloud and Hybrid charge for one task. A dashed line means nothing ran locally."
        notes={
          <>
            <p>* Includes times read from screenshot timestamps, not a stopwatch.</p>
            <p className="mt-3">
              More than one run on each side: {t.pairsWithRepeats.join(", ")}. Every other row has one Hybrid run.
            </p>
            <p className="mt-3">Results are scores against the answer key. The app comparison has no key, so it was not graded.</p>
          </>
        }
      >
        <div className="prose">
          <p>
            {t.pairs} tasks were run both ways. In {t.pairsLocal} of them the Privacy Gate appeared and the local model ran. In the other {idle.length}, Hybrid was on and nothing ran on the Mac. The app did not say beforehand which it would be.
          </p>
        </div>
        <figure className="mt-6">
          <PairsChart pairs={ps} wide />
          <figcaption>
            Lowest credits per side for each task; the table keeps the full ranges. Hybrid cost less in {t.pairsHybridLower} of {t.pairs} tasks and more in {t.pairsHybridHigher}.
          </figcaption>
        </figure>
      </Block>
      <div className="scroll-x mt-8" tabIndex={0} role="region" aria-label="Paired runs table">
          <table className="data min-w-[66rem] [&_th]:whitespace-nowrap">
            <thead>
              <tr>
                <th>Task</th>
                <th>Privacy Gate</th>
                <th>Ran on the Mac</th>
                <th className="num">Cloud credits</th>
                <th className="num">Hybrid credits</th>
                <th className="num">Cloud time</th>
                <th className="num">Hybrid time</th>
                <th>Cloud result</th>
                <th>Hybrid result</th>
              </tr>
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

      <H3 id="local" exhibit="2" finding="3" tone="hybrid">
        When the local model ran, the result fell short in {t.localRunsNotFullMarks} of {t.localRuns} runs
      </H3>
      <Block meaning="The local totals did not match the file. The spreadsheet left values for me to fill in."
        notes={
          <>
            <p>The gate flagged the bank file, which these tasks use: {t.fileTasksGated.join("; ")}. It did not flag the invoice file or the lab results.</p>
            <p className="mt-3">It also appeared on {runCount(t.gateWithHybridOff.length)} with Hybrid off. In these runs, local work followed the gate, not the toggle.</p>
            <p className="mt-3">* Includes times read from screenshot timestamps, not a stopwatch.</p>
          </>
        }
      >
        <Shot src="run22-privacy-gate" w={1371} h={811} alt="Privacy Gate dialog: found personal information in september_2026_transactions.csv. Option 1, Process on my Mac, is marked Recommended. Option 2 is Upload anyway.">
          The Privacy Gate on the bank file, before the Excel budget run. I picked &ldquo;Process on my Mac&rdquo;.
        </Shot>

        <h4 className="mt-10 text-[1.0625rem] font-bold">Bank report: category totals</h4>
        <div className="prose mt-2">
          <p>
            The cloud run got {d.cloud.totalsRight} of {d.cloud.rows.length} totals right. The Hybrid run got {d.hybrid.totalsRight} of {d.hybrid.rows.length}. {d.hybrid.withheld.map((w) => w.category).join(", ")} was left out of my own report, and {money(rec.hybrid.uncategorized)} was left uncategorized. It did say the result was incomplete. It did not say the totals it printed were wrong.
          </p>
        </div>
        <div className="scroll-x mt-4">
          <table className="data max-w-[34rem]">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">File says</th>
                <th className="num">Cloud, run {d.cloud.run.id}</th>
                <th className="num">Hybrid, run {d.hybrid.run.id}</th>
              </tr>
            </thead>
            <tbody>
              {d.cloud.rows.map((c, i) => {
                const y = d.hybrid.rows[i];
                return (
                  <tr key={c.category}>
                    <td>{c.category}</td>
                    <td className="num fig">{money(c.truth)}</td>
                    <td className={`num fig ${c.ok ? "" : "bad"}`}>{c.reported === null ? "withheld" : money(c.reported)}</td>
                    <td className={`num fig ${y.ok ? "" : "bad"}`}>{y.reported === null ? "withheld" : money(y.reported)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="prose mt-4">
          <p>
            The first pair of runs went the same way: {spell(firstPair.cloud.correct ?? "")} totals in the cloud, {spell(firstPair.hybrid.correct ?? "")} in Hybrid.
          </p>
          <p>
            The trade: Hybrid cost {Math.abs(bank.hybridVsCloudPct.max)}% to {Math.abs(bank.hybridVsCloudPct.min)}% fewer credits{d.rerunGap ? `, which is ${span(d.rerunGap, credits)} credits` : ""}. It took {span(bank.hybrid.seconds!, duration)} against {span(bank.cloud.seconds!, duration)}.*
          </p>
        </div>

        <h4 className="mt-10 text-[1.0625rem] font-bold">Excel budget: blank cells</h4>
        <div className="prose mt-2">
          <p>
            The Hybrid spreadsheet came back with {bh.missingDates} of {bh.rowCount} dates blank, {blankAmounts.length} amounts blank and {shortened.length} descriptions cut short. Rows complete: {bh.completeRows} of {bh.rowCount}, against {bc.completeRows} of {bc.rowCount} in the cloud run.
          </p>
        </div>
        <div className="scroll-x mt-4">
          <table className="data min-w-[30rem]">
            <caption className="small font-normal!">Rows from the Hybrid spreadsheet, as delivered. Highlighted cells were blank.</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th>The file says</th>
              </tr>
            </thead>
            <tbody>
              {sample.map((r) => {
                const f = txns.find((x) => x.id === r.id)!;
                return (
                  <tr key={r.id}>
                    <td className={r.date === null ? "blank fig" : "fig"}>{r.date ?? "blank"}</td>
                    <td className={r.description !== f.description ? "bad" : ""}>{r.description}</td>
                    <td className={`num fig ${r.amount === null ? "blank" : ""}`}>{r.amount === null ? "blank" : signed(r.amount)}</td>
                    <td className="fig text-ink2">
                      {f.date}, {f.description}, {signed(f.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="prose mt-4">
          <p>
            With those cells blank, the summary sheet opened showing a net of <span className="fig bad">{signed(bh.shown.net)}</span> for the month. The file says <span className="fig">{signed(bh.repaired.net)}</span>, which is what the cloud run showed.
          </p>
          <p>
            This run was honest about it. The reply listed the gaps and highlighted the cells. But I paid {credits(sheet.hybrid.credits.min)} credits against {span(sheet.cloud.credits, credits)}, waited {span(sheet.hybrid.seconds!, duration)}* against {span(sheet.cloud.seconds!, duration)}, and got a budget that asks me to type my own rent and salary back in. Those values were on my Mac the whole time.
          </p>
        </div>
        <Shot src="run22-reply-fill-in-cells" w={1411} h={392} alt="The run's reply: You need to fill in a few cells. Because you chose to keep the file on your device, some details were hidden when the data came back to me. It lists the date for every transaction, the rent amount, the salary amount and the Equinox Gym amount.">
          The reply from Hybrid run {bh.run.id}.
        </Shot>
      </Block>

      <H3 id="idle" exhibit="3" finding="3" tone="hybrid">
        When nothing ran locally, the answers matched and the cost did not
      </H3>
      <Block meaning="The answers matched the key in the graded runs, but cost moved both ways."
        notes={
          <p>
            &ldquo;Nothing ran on the Mac&rdquo; is read from the step log and the usage panel. In one of these runs the log was not expanded, so that one rests on its speed and on the missing local-token line.
          </p>
        }
      >
        <div className="prose">
          <p>
            In these {idle.length} tasks the Privacy Gate did not appear and no step was marked local. {t.hybridNotLocalFullMarks} of the {t.hybridNotLocalGraded} graded runs matched the answer key, the same as their cloud runs. Cost moved both ways.
          </p>
        </div>
        <ul className="mt-5 max-w-[40rem] space-y-2 text-[0.9375rem]">
          {idle.map((p) => (
            <li key={p.task} className="leader stack">
              <span>
                {p.label}
                <span className="small"> ({p.gate === "no file" ? "no file" : "file, gate did not appear"})</span>
              </span>
              <span className="dots" />
              <span className="fig">
                {span(p.cloud.credits, credits)} <span className="text-ink2">cloud,</span> {span(p.hybrid.credits, credits)} <span className="text-ink2">Hybrid</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="prose mt-6">
          <p>
            The lab results run is the one to look at. The file holds health data and the gate did not flag it. With Hybrid on it cost {credits(lab.hybrid.credits.min)} credits against {credits(lab.cloud.credits.min)}, which is {signedPct(lab.hybridVsCloudPct.max)}. The step log shows the file being read from a folder under <code className="fig">~/.perplexity/attachments/</code>. That folder does not exist on my Mac. A later cloud run showed the same folder under <code className="fig">/home/user/</code>, a Linux path. So with Hybrid on and no Privacy Gate, the step log read the file from a cloud sandbox path.
          </p>
        </div>
        <Shot src="run06-step-log-path" w={1407} h={272} alt="Step log of the Hybrid lab results run. Finished 19s. A terminal step runs cat on a path under ~/.perplexity/attachments/ ending in lab_results_2026-09.csv.">
          Step log of the Hybrid lab results run.
        </Shot>
      </Block>

      <H3 id="cost" exhibit="4" finding="1" tone="cost">
        The same prompt cost {repeat.runs.map((r) => credits(r.final)).join(", ").replace(/, ([^,]*)$/, " and $1")} credits
      </H3>
      <Block meaning="Nothing on screen before sending said which cost I would get." reading="Each bar is a separate run of the same prompt on the same setting." notes={<p>The prices in these outputs were not checked. This section is about cost only.</p>}>
        <div className="prose">
          <p>
            Task: {repeat.label}. Setting: {repeat.setting}. {runCount(repeat.runs.length)}. The dearest run cost {h.widestRepeat.spreadPct}% more than the cheapest. Nothing on screen before sending said which one I would get.
          </p>
        </div>
        <figure className="mt-5 max-w-[40rem]">
          <Bars label="Credits for three runs of one prompt" unit="credits" rows={repeat.runs.map((r) => ({ name: `Run ${r.id}`, value: r.final }))} />
        </figure>
      </Block>

      {h.effort && (
        <>
          <H3 id="effort" exhibit="5" finding="1" tone="cost">
            Effort: {credits(h.effort.standard)} credits on Standard, {credits(h.effort.high)} on High
          </H3>
          <Block meaning="The only warning before sending was the words “Higher usage”." reading="Each bar is one setting. The Mac and web rows are kept separate."
            notes={
              <p>
                One run per row. The Mac rows and the web rows are not an effort comparison, because the Mac app&apos;s effort level is unknown.
              </p>
            }
          >
            <div className="prose">
              <p>
                One prompt, a comparison of note-taking apps, under every setting I could reach. On the web, High effort cost {h.effort.times} times what Standard did. The only warning before sending was the words &ldquo;Higher usage&rdquo;.
              </p>
              <p>The effort control exists on perplexity.ai in Computer mode. The Mac app does not have one, and I could not find what effort it uses.</p>
            </div>
            <figure className="mt-5 max-w-[40rem]">
              <Bars label="Credits for one prompt under four settings" unit="credits" rows={samePrompt.map((g) => ({ name: g.setting, note: runCount(g.credits.n), value: g.credits.min }))} />
            </figure>
          </Block>
        </>
      )}

      <H3 id="meter" exhibit="6" finding="2" tone="meter">
        At Finished, the panel was below the final charge in {h.panelLow} of {h.panelReadings} readings
      </H3>
      <Block meaning="When the run says Finished, the number is not the charge yet." reading="A rising line means the panel under-read. A flat line already showed the final charge."
        notes={
          <>
            <p>A full bar means the panel already showed the final charge. That happened in {h.panelReadings - h.panelLow} readings. For those, the delay between Finished and the screenshot is unknown.</p>
            <p className="mt-3">The delay varies for the other readings too. The panel does catch up later.</p>
          </>
        }
      >
        <div className="prose">
          <p>
            The run panel shows credits used. When the run says Finished, that number is not the charge yet. In the lab results run it showed {credits(labReading.panel)} credits for a run that cost {credits(labReading.final)}. The lowest reading of all was {credits(emptiest.panel)} for a run that cost {credits(emptiest.final)}.
          </p>
        </div>
        <div className="mt-5 grid max-w-[40rem] gap-4 sm:grid-cols-2">
          <Shot src="run05-mac-panel-at-finished" w={660} h={456} alt="Mac app usage panel reading Credits used 0.02." flush>
            Mac app, at Finished.
          </Shot>
          <Shot src="run05-web-usage-30s-later" w={660} h={520} alt="Web session usage panel for the same session reading 3.92 credits." flush>
            The same session on the web, about half a minute later.
          </Shot>
        </div>
        <figure className="mt-8">
          <PanelSlope readings={readings} />
          <PanelChart readings={readings} />
        </figure>
      </Block>

      <H3 id="source" exhibit="7" finding="" tone="neutral">One source problem</H3>
      <Block meaning="The citation used a different domain from the real site." notes={<p>I did not open the link, so I do not know whether it is a look-alike site or a typo. Standard effort, on the web.</p>}>
        <div className="prose">
          <p>
            One run cited <code className="fig">obsldian.com</code> for Obsidian&apos;s prices. The real site is obsidian.md. The same prompt at High effort cited vendor domains only.
          </p>
        </div>
        <Shot src="run19-obsldian-citation" w={1421} h={170} alt="Answer text about Obsidian followed by a citation chip that reads obsldian, with an L where the first i should be.">
          The citation chip reads &ldquo;obsldian&rdquo;.
        </Shot>
      </Block>

      <H2 id="limits">Limits</H2>
      <Block>
        <ul className="prose list-disc space-y-2 pl-5 marker:text-ink3">
          <li>Small numbers. Most pairs are one run on each side. Nothing here is a rate.</li>
          <li>
            One account, one Mac, one local model ({PROTOCOL.localModel}), one week ({PROTOCOL.period}).
          </li>
          <li>Web answers were not fact-checked. I did not check any price in any output.</li>
          <li>
            Times for {runCount(t.screenshotTimed.length)} come from screenshot timestamps, not a stopwatch. {runCount(t.untimed.length)} were not timed at all.
          </li>
          <li>Perplexity shows one total per run. I have no per-step cost, and I do not quote one.</li>
          <li>The Mac app&apos;s effort level is unknown, so Mac and web runs are never pooled.</li>
          <li>The Privacy Gate was not captured on {runCount(t.gateNotCaptured.length)} that used the bank file.</li>
          <li>The prototype is standalone. It does not hook into Perplexity&apos;s product. It replays recorded runs.</li>
        </ul>
      </Block>

      <section className="mt-16 border-t border-rule pt-10">
        <h2 className="text-2xl font-bold tracking-tight">See the fix on the same runs</h2>
        <p className="prose mt-3">The prototype replays the bank report and the Excel budget, with the meter and the checks.</p>
        <p className="mt-5">
          <Link href="/receipt" className="btn">
            Open the prototype
          </Link>
        </p>
      </section>
    </main>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-20 mb-5 scroll-mt-6 text-[1.75rem] leading-tight font-bold tracking-tight">
      {children}
    </h2>
  );
}

function H3({ children, id, exhibit, finding, tone }: { children: React.ReactNode; id: string; exhibit: string; finding: string; tone: string }) {
  return <header id={id} className={`exhibit-title ${tone}`}><p className="eyebrow">Exhibit {exhibit}{finding && ` / Finding ${finding}`}</p><h3>{children}</h3></header>;
}

function Block({ children, notes, meaning, reading }: { children: React.ReactNode; notes?: React.ReactNode; meaning?: string; reading?: string }) {
  return <div className="evidence-block"><div className="evidence-main">{children}</div>{notes && <aside className="evidence-notes">{meaning && <><h4 className="eyebrow">What it means</h4><p>{meaning}</p></>}{reading && <><h4 className="eyebrow">How to read it</h4><p>{reading}</p></>}<h4 className="eyebrow">Limit</h4>{notes}</aside>}</div>;
}

function Stat({ value, label, note, tone = "neutral" }: { value: string; label: string; note: string; tone?: string }) {
  return <div className={`stat ${tone}`}><strong>{value}</strong><h2>{label}</h2><p>{note}</p></div>;
}
function ChartCard({ title, subtitle, finding, tone, children, callout, limit }: { title: string; subtitle: string; finding: string; tone: string; children: React.ReactNode; callout: React.ReactNode; limit: string }) {
  return <section className={`chart-card ${tone}`}><div className="card-heading"><h2>{title}</h2><span className="finding"><i />Finding {finding}</span></div><p className="chart-subtitle">{subtitle}</p><div className="chart-body">{children}</div><div className="insight">{callout}</div><p className="chart-limit"><b>Limit.</b> {limit}</p></section>;
}

function Moment({ when, what }: { when: string; what: string }) {
  return (
    <div className="grid gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="font-bold">{when}</dt>
      <dd>{what}</dd>
    </div>
  );
}

function Problem({ title, figure, body }: { title: string; figure: string; body: string }) {
  return (
    <li>
      <div className="leader stack text-[1.1875rem] leading-snug font-bold">
        <span>{title}</span>
        <span className="dots" />
        <span className="fig">{figure}</span>
      </div>
      <p className="prose mt-1.5 text-ink2">{body}</p>
    </li>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="leader">
      <dt className="text-ink2">{label}</dt>
      <span className="dots" />
      <dd className="fig">{value}</dd>
    </div>
  );
}

function Shot({ src, w, h, alt, children, flush }: { src: string; w: number; h: number; alt: string; children: React.ReactNode; flush?: boolean }) {
  return (
    <figure className={`shot max-w-[40rem] ${flush ? "" : "mt-6"}`}>
      <div className="frame">
        <Image src={`/evidence/${src}.webp`} width={w} height={h} alt={alt} sizes="(min-width: 700px) 640px, 100vw" />
      </div>
      <figcaption>Screenshot. {children}</figcaption>
    </figure>
  );
}

// The one visual for "what it is": a real Hybrid bank run, laid out as its receipt.
function MiniReceipt({ d, failed }: { d: ReplayData; failed: number }) {
  const lane = d.hybrid;
  return (
    <div className="mini-receipt">
      <div className="tape text-[0.875rem]" role="img" aria-label={`Example receipt for recorded Hybrid run ${lane.run.id}: estimate ${lane.estimate ? span(lane.estimate.credits, credits) : ""} credits, panel at Finished ${credits(lane.run.panelAtFinish)}, ${failed} of ${lane.checks.length} checks failed, final ${credits(lane.run.final)} credits.`}>
        
        <p className="small">Bank report, private steps on your Mac. Recorded run {lane.run.id}.</p>
        <hr className="tear" />
        <p className="tape-head">Before you send</p>
        <div className="mt-2 space-y-1">
          {lane.estimate && (
            <>
              <Row label="Credits" value={span(lane.estimate.credits, credits)} />
              {lane.estimate.seconds && <Row label="Time" value={span(lane.estimate.seconds, duration)} />}
              <Row label="Based on" value={`${runCount(lane.estimate.credits.n)}`} />
            </>
          )}
        </div>
        <hr className="tear" />
        <p className="tape-head">While it runs</p>
        <div className="mt-2 space-y-1">
          <div className="leader">
            <span>Credits so far</span>
            <span className="dots" />
            <span className="fig">
              {credits(lane.run.panelAtFinish)} <span className="chip mark-prov">PROVISIONAL</span>
            </span>
          </div>
        </div>
        <hr className="tear" />
        <p className="tape-head">After</p>
        <div className="mt-2 space-y-1">
          <div className="leader">
            <span>Checks by code</span>
            <span className="dots" />
            <span className="fig">
              {failed} of {lane.checks.length} <span className="stamp text-fail">FAILED</span>
            </span>
          </div>
          <Row label="Withheld" value={lane.withheld.map((w) => w.category).join(", ")} />
          {d.rerunGap && <Row label="Cloud rerun" value={`${span(d.rerunGap, credits)} more`} />}
        </div>
        <hr className="tear" />
        <div className="leader text-base font-bold">
          <span>TOTAL</span>
          <span className="dots" />
          <span className="fig">{credits(lane.run.final)} credits</span>
        </div>
        <p className="small mt-3">Figures from a recorded run. The rerun cost is an estimate.</p>
      </div>
    </div>
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
