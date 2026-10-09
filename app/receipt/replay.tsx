"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lane, ReplayData, TotalRow } from "@/lib/replay.ts";
import type { PanelRun, SheetLane } from "@/lib/sheet.ts";
import type { Group, Headline } from "@/lib/summary.ts";
import type { Check } from "@/lib/verify.ts";
import { credits, duration, money, pct, signed, span } from "../format";

type Mode = "cloud" | "hybrid";
type Task = "report" | "budget";
type Stage = "plan" | "running" | "finished" | "final";
type Route = "Search" | "Your Mac" | "Cloud";

const REPLAY_MS = 6000;
const SETTLE_MS = 2200;
const COUNT_MS = 900;

type Step = { name: string; route: Record<Mode, Route>; reason: Record<Mode, string>; check?: string };

const TASKS: Record<Task, { label: string; prompt: string }> = {
  report: { label: "Bank report", prompt: "Categorize my September bank export, total each category, flag duplicates and refunds, price-check my top 3 subscriptions, one-page report." },
  budget: { label: "Excel budget", prompt: "Turn my September bank export into an Excel budget: a transactions sheet with categories, a summary sheet with formulas, and a chart." },
};

// The prototype's own plan for each task. Perplexity shows no per-step cost, so ranges are per run.
const STEPS: Record<Task, Step[]> = {
  report: [
    { name: "Read your bank file", route: { hybrid: "Your Mac", cloud: "Cloud" }, reason: { hybrid: "private file stays on the device", cloud: "file is uploaded" } },
    {
      name: "Categorize 40 transactions",
      route: { hybrid: "Your Mac", cloud: "Cloud" },
      reason: { hybrid: "private rows, local model", cloud: "cloud model" },
      check: "Every row gets one category",
    },
    {
      name: "Add up totals",
      route: { hybrid: "Your Mac", cloud: "Cloud" },
      reason: { hybrid: "arithmetic on private rows", cloud: "cloud model" },
      check: "Totals are checked against the file",
    },
    { name: "Look up 3 subscription prices", route: { hybrid: "Search", cloud: "Search" }, reason: { hybrid: "needs live prices", cloud: "needs live prices" } },
    { name: "Write the report", route: { hybrid: "Cloud", cloud: "Cloud" }, reason: { hybrid: "no private values needed", cloud: "cloud model" } },
  ],
  budget: [
    { name: "Read your bank file", route: { hybrid: "Your Mac", cloud: "Cloud" }, reason: { hybrid: "private file stays on the device", cloud: "file is uploaded" } },
    { name: "Categorize 40 transactions", route: { hybrid: "Your Mac", cloud: "Cloud" }, reason: { hybrid: "private rows, local model", cloud: "cloud model" } },
    {
      name: "Build the transactions sheet",
      route: { hybrid: "Cloud", cloud: "Cloud" },
      reason: { hybrid: "flagged values are withheld from this step", cloud: "cloud model" },
      check: "Every row is compared with your file",
    },
    {
      name: "Build the summary sheet and chart",
      route: { hybrid: "Cloud", cloud: "Cloud" },
      reason: { hybrid: "formulas only", cloud: "cloud model" },
      check: "Net is checked against your file",
    },
  ],
};

const ROUTE_CHIP: Record<Route, string> = { Search: "chip chip-search", "Your Mac": "chip chip-mac", Cloud: "chip chip-cloud" };

export default function Replay({ data }: { data: ReplayData }) {
  const [task, setTask] = useState<Task>("report");
  const [mode, setMode] = useState<Mode>("hybrid");
  const [stage, setStage] = useState<Stage>("plan");
  const [progress, setProgress] = useState(0);
  const [showWithheld, setShowWithheld] = useState(false);
  const [rerun, setRerun] = useState(false);
  const meterRef = useRef<HTMLDivElement>(null);
  const lane = task === "report" ? data[mode] : data.budget[mode];
  const steps = STEPS[task];

  useEffect(() => {
    if (stage === "running") {
      meterRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      const start = performance.now();
      const id = setInterval(() => {
        const p = Math.min(1, (performance.now() - start) / REPLAY_MS);
        setProgress(p);
        if (p === 1) setStage("finished");
      }, 50);
      return () => clearInterval(id);
    }
    if (stage === "finished") {
      const id = setTimeout(() => setStage("final"), SETTLE_MS);
      return () => clearTimeout(id);
    }
  }, [stage]);

  const reset = (next: Mode = mode, nextTask: Task = task) => {
    setTask(nextTask);
    setMode(next);
    setStage("plan");
    setProgress(0);
    setShowWithheld(false);
    setRerun(false);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8">
      <div className="grid gap-x-14 gap-y-8 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,17rem)_minmax(0,42rem)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <h1 className="text-[2rem] leading-[1.1] font-bold tracking-tight">The prototype</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink2">One run, printed as a receipt: the plan before, the credit count during, the checks after.</p>

          <fieldset className="mt-6">
            <legend className="small mb-1.5 font-semibold">Task</legend>
            <div className="switch">
              {(Object.keys(TASKS) as Task[]).map((t) => (
                <button key={t} type="button" onClick={() => reset(mode, t)} aria-pressed={task === t}>
                  {TASKS[t].label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="small mb-1.5 font-semibold">Run the private steps on</legend>
            <div className="switch">
              {(["hybrid", "cloud"] as const).map((m) => (
                <button key={m} type="button" onClick={() => reset(m)} aria-pressed={mode === m}>
                  {m === "hybrid" ? "Your Mac" : "Cloud"}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="small mt-6 border-t border-rule pt-3">
            Replay of recorded runs. Credit and time figures were measured on my own Perplexity account on a made-up bank file ({data.txnCount} rows). This is a standalone prototype and does not hook into Perplexity&apos;s product.
          </p>
          <p className="small mt-2">
            <Link href="/">Read the case study</Link>
          </p>
          <p className="small mt-1">
          </p>
        </div>

        <div className="tape-wrap min-w-0">
          <div className="tape">
            <p className="font-mono text-lg font-bold tracking-tight">RUN RECEIPT</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink2">&ldquo;{TASKS[task].prompt}&rdquo;</p>
            <p className="small mt-1">
              {TASKS[task].label}, private steps on {mode === "hybrid" ? "your Mac" : "the cloud"}. Recorded run {lane.run.id}.
            </p>

            <hr className="tear" />
            <section className="receipt-before"><Head>Before: the run plan</Head>
            <ol className="mt-3">
              {steps.map((s, i) => (
                <li key={s.name} className="grid grid-cols-[1.5rem_minmax(0,1fr)] border-b border-grid py-2.5 last:border-b-0">
                  <span className="fig text-ink3">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-semibold">{s.name}</span>
                      <span className={ROUTE_CHIP[s.route[mode]]}>{s.route[mode]}</span>
                    </div>
                    <p className="small">
                      {s.reason[mode]}
                      {s.check && <span className="text-ink">. Check: {s.check}.</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {lane.estimate && (
              <dl className="mt-4 space-y-2">
                <Item label="Credits for the run" value={span(lane.estimate.credits, credits)} note={`${lane.estimate.credits.n} measured ${lane.estimate.credits.n === 1 ? "run" : "runs"}`} strong />
                <Item label="Time" value={lane.estimate.seconds ? span(lane.estimate.seconds, duration) : "not timed"} note={lane.run.secondsNote ?? "from the app or screenshot timestamps"} />
                <Item label="Panel reads low at Finished by" value={lane.estimate.undercountPct ? span(lane.estimate.undercountPct, pct) : "no reading"} note="final charge lands later" />
              </dl>
            )}
            <p className="small mt-3">The plan is the prototype&apos;s own. Perplexity shows one total per run, so the range is for the whole run, not per step.</p>
            {stage === "plan" && (
              <button type="button" onClick={() => setStage("running")} className="btn mt-5">
                Replay this run
              </button>
            )}

            </section>
            {stage !== "plan" && (
              <div ref={meterRef} className="print receipt-during scroll-mt-6 scroll-mb-6">
                <hr className="tear" />
                <Head>While it runs: the meter</Head>
                <Meter lane={lane} steps={steps} stage={stage} progress={progress} />
              </div>
            )}

            {stage === "final" && (
              <div className="print receipt-after">
                <hr className="tear" />
                <Head>After: the receipt</Head>
                {task === "report" ? (
                  <Receipt data={data} lane={data[mode]} showWithheld={showWithheld} onShowWithheld={() => setShowWithheld(true)} rerun={rerun} onRerun={() => setRerun(true)} />
                ) : (
                  <BudgetReceipt lane={data.budget[mode]} other={data.budget[mode === "hybrid" ? "cloud" : "hybrid"]} filled={showWithheld} onFill={() => setShowWithheld(true)} />
                )}
                <hr className="tear" />
                <div className="leader text-xl font-bold">
                  <span>TOTAL</span>
                  <span className="dots" />
                  <span className="fig">{credits(lane.run.final)} credits</span>
                </div>
                <p className="small mt-1 text-right">
                  about {money(lane.run.final / 100)}, {lane.finalReadNote}
                </p>
                <button type="button" onClick={() => reset()} className="btn btn-quiet mt-5">
                  Start over
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="mb-5 text-[1.75rem] leading-tight font-bold tracking-tight">The measured runs behind these numbers</h2>
        <Measured groups={data.groups} headline={data.headline} />
      </section>
    </main>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <h2 className="tape-head">{children}</h2>;
}

// Label ..... figure, with a line of small print under it.
function Item({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div>
      <div className={`leader ${strong ? "font-bold" : ""}`}>
        <dt>{label}</dt>
        <span className="dots" />
        <dd className="fig">{value}</dd>
      </div>
      {note && <dd className="small text-right">{note}</dd>}
    </div>
  );
}

function Measured({ groups, headline: h }: { groups: Group[]; headline: Headline }) {
  return (
    <div>
      <dl className="grid max-w-[60rem] gap-x-14 gap-y-3 md:grid-cols-2">
        <Item label="Panel read below the final charge" value={`${h.panelLow} of ${h.panelReadings} runs`} note={`by ${span(h.panelLowPct, pct)} at the Finished screenshot`} strong />
        <Item label="Hybrid on, something ran on the Mac" value={`${h.hybridRanLocal} of ${h.hybridOn} runs`} note="only when the Privacy Gate appeared" strong />
        <Item
          label="Same prompt, same setting"
          value={`${span(h.widestRepeat.credits, credits)} credits`}
          note={`${h.widestRepeat.label}, ${h.widestRepeat.credits.n} runs, ${h.widestRepeat.spreadPct}% apart`}
          strong
        />
        {h.effort && <Item label="High effort vs Standard, same prompt" value={`${h.effort.times}x the credits`} note={`${credits(h.effort.high)} vs ${credits(h.effort.standard)}, one run each, web only`} strong />}
      </dl>
      <div className="scroll-x mt-8" tabIndex={0} role="region" aria-label="Measured runs table">
        <table className="data min-w-[40rem]">
          <thead>
            <tr>
              <th>Task</th>
              <th>Setting</th>
              <th className="num">Runs</th>
              <th className="num">Credits</th>
              <th className="num">Time</th>
              <th className="num">Panel low by</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => (
              <tr key={g.task + g.setting}>
                <td className="font-semibold">{groups[i - 1]?.task === g.task ? "" : g.label}</td>
                <td className="text-ink2">{g.setting}</td>
                <td className="num fig">{g.credits.n}</td>
                <td className="num fig">{span(g.credits, credits)}</td>
                <td className="num fig">{g.seconds ? span(g.seconds, duration) : "not timed"}</td>
                <td className="num fig">{g.undercountPct ? span(g.undercountPct, pct) : "no reading"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small mt-4 max-w-[70ch]">
        {h.runs} runs across {h.taskTypes} task types, measured Oct 2 to Oct 8, 2026 on one account. A range is the lowest and highest value seen, so a row with one run has no spread yet. Runs are never pooled across the Mac app and the web, across effort levels, or across whether a local step ran. Most times come from the app; a few come from screenshot timestamps.
      </p>
    </div>
  );
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 4);

function Meter({ lane, steps, stage, progress }: { lane: { mode: Mode; run: PanelRun; finalReadNote: string }; steps: Step[]; stage: Stage; progress: number }) {
  const { run } = lane;
  const [settled, setSettled] = useState(0);
  const final = stage === "final";

  // The count climbs from the panel reading to the final charge once the charge lands.
  useEffect(() => {
    if (!final) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      const p = still ? 1 : Math.min(1, Math.max(0, now - start) / COUNT_MS);
      setSettled(p);
      if (p < 1) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [final]);

  const shown = final ? run.panelAtFinish + (run.final - run.panelAtFinish) * easeOut(settled) : run.panelAtFinish * progress;
  const step = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p className="leading-none">
          <span
            className="fig text-[clamp(3.5rem,17vw,6rem)] leading-[0.95] font-bold tracking-[-0.04em] transition-[background-size] duration-500"
            
          >
            {credits(shown)}
          </span>
          <span className="ml-2 text-base text-ink2">credits</span>
        </p>
        {final ? (
          <span key="final" className="stamp settle mb-2 text-sm! text-ink">
            FINAL
          </span>
        ) : (
          <span key="prov" className={`chip mark-prov mb-2 text-[0.8125rem]! ${stage === "finished" ? "pulse" : ""}`}>
            PROVISIONAL, still counting
          </span>
        )}
      </div>

      <div className="relative mt-4 h-2 bg-grid" role="progressbar" aria-label="Replay progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-ink" style={{ width: `${progress * 100}%` }} />
        {steps.slice(1).map((s, i) => (
          <span key={s.name} aria-hidden className="absolute inset-y-0 w-[2px] bg-sheet" style={{ left: `${((i + 1) / steps.length) * 100}%` }} />
        ))}
      </div>

      <p className="mt-3 min-h-[3.2em] text-[0.9375rem]" aria-live="polite">
        {stage === "running" ? (
          <>
            <span className="fig text-ink3">
              {step + 1}/{steps.length}
            </span>{" "}
            {steps[step].name} <span className={`ml-1 ${ROUTE_CHIP[steps[step].route[lane.mode]]}`}>{steps[step].route[lane.mode]}</span>
          </>
        ) : stage === "finished" ? (
          <>
            The run says Finished at <span className="fig font-bold">{credits(run.panelAtFinish)}</span> credits. The charge is not final yet.
          </>
        ) : (
          <>
            The panel showed <span className="fig">{credits(run.panelAtFinish)}</span> at Finished. The final charge was <span className="fig">{credits(run.final)}</span>, which is{" "}
            <strong className="fig">{credits(run.final - run.panelAtFinish)} more</strong>. Final, {lane.finalReadNote}.
          </>
        )}
      </p>
      <p className="small mt-2">
        Replayed in {REPLAY_MS / 1000} s. The real run took {run.secondsNote ?? (run.seconds === null ? "an unrecorded time" : duration(run.seconds))}.
        {run.localTokens ? ` Local model used about ${(run.localTokens / 1000).toFixed(1)}K tokens on the Mac.` : ""} Step order during the replay is illustrative; only the run totals were measured.
      </p>
    </div>
  );
}

function Receipt({
  data,
  lane,
  showWithheld,
  onShowWithheld,
  rerun,
  onRerun,
}: {
  data: ReplayData;
  lane: Lane;
  showWithheld: boolean;
  onShowWithheld: () => void;
  rerun: boolean;
  onRerun: () => void;
}) {
  const other = lane.mode === "hybrid" ? data.cloud : data.hybrid;
  const failed = lane.checks.filter((c) => !c.passed).length;
  return (
    <div className="mt-3 space-y-7">
      <dl className="space-y-2">
        <Item label="Final credits" value={credits(lane.run.final)} note={`about ${money(lane.run.final / 100)}`} strong />
        {lane.mode === "hybrid" ? (
          <>
            <Item label="Saved by local work" value={credits(other.run.final - lane.run.final)} note={`vs the recorded cloud run (${credits(other.run.final)})`} />
            <Item label="Time added by local work" value={duration(lane.run.seconds - other.run.seconds)} note="at least; cloud time is an upper bound" />
          </>
        ) : (
          <>
            <Item label="Extra vs running on your Mac" value={credits(lane.run.final - other.run.final)} note={`recorded Hybrid run cost ${credits(other.run.final)}`} />
            <Item label="Totals right" value={`${lane.totalsRight} of ${lane.rows.length}`} note="graded against the answer key" />
          </>
        )}
      </dl>

      <div>
        <ChecksHeading failed={failed} total={lane.checks.length} />
        <CheckList checks={lane.checks} />
        <p className="small mt-2">This is a test file with a known answer, so the recorded report is graded against totals recomputed in code. Perplexity does not expose the row labels of its own run.</p>
      </div>

      <Totals rows={lane.rows} heading="Totals in the report" />

      {lane.withheld.length > 0 && (
        <div className="border border-dashed border-ink3 p-3.5 text-[0.9375rem]">
          <p>
            Withheld from the cloud and missing from your own report: <strong>{lane.withheld.map((w) => w.category).join(", ")}</strong>.
          </p>
          {showWithheld ? (
            <ul className="line-in mt-2">
              {lane.withheld.map((w) => (
                <li key={w.category}>
                  {w.category}: <span className="fig font-bold">{money(w.value)}</span> <span className="small">computed from the file on this device</span>
                </li>
              ))}
            </ul>
          ) : (
            <button type="button" onClick={onShowWithheld} className="btn btn-quiet mt-3">
              Show withheld values here, on this Mac only
            </button>
          )}
        </div>
      )}

      {lane.mode === "hybrid" && failed > 0 && data.rerunGap && (
        <div className="bg-[color-mix(in_oklab,var(--prov)_28%,var(--sheet))] p-3.5 text-[0.9375rem]">
          {rerun ? (
            <div className="line-in">
              <p className="mb-3 font-semibold">
                Recorded cloud run of the same task: {data.cloud.totalsRight} of {data.cloud.rows.length} totals right, <span className="fig">{credits(data.cloud.run.final)}</span> credits.
              </p>
              <Totals rows={data.cloud.rows} heading="Totals after the cloud rerun" />
            </div>
          ) : (
            <>
              <p className="font-semibold">
                The local totals do not match the file. Rerun in the cloud for about <span className="fig">{span(data.rerunGap, credits)}</span> more credits?
              </p>
              <p className="small mt-1">
                Estimate: the measured gap between cloud and Hybrid runs of this task, {data.rerunGap.n} runs each. A single-step rerun was not measured.
              </p>
              <button type="button" onClick={onRerun} className="btn mt-3">
                Show the cloud result
              </button>
            </>
          )}
        </div>
      )}

      {lane.mode === "hybrid" && (
        <div className="border-t border-rule pt-5 text-[0.9375rem]">
          <h3 className="font-bold">The same local step, with totals computed by code</h3>
          <p className="small mt-1">
            Recorded {data.router.date} on my own router: {data.router.worker}, {data.router.seconds} s. One recorded run, so read it as an illustration. The model only assigns categories; code adds them up. Categorize step only, so it has no Perplexity credit figure.
          </p>
          <div className="mt-3">
            <CheckList checks={data.router.checks} />
          </div>
          <p className="mt-3">
            Totals add up to the file, yet only {data.router.totalsRight} of {data.router.rows.length} category totals match the key, because {data.router.labels.mislabels.length} of {data.router.labels.total} rows are in the wrong category. A sum check alone does not catch this, so the receipt lists rows to confirm:
          </p>
          <ul className="mt-2 space-y-1">
            {data.router.labels.mislabels.map((m) => (
              <li key={m.id}>
                {m.description}, <span className="fig">{money(Math.abs(m.amount))}</span>: filed under {m.got}, key says {m.expected}
                {m.judgementCall && <span className="small"> (judgement call: Perplexity&apos;s cloud run also chose {m.got} once)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BudgetReceipt({ lane, other, filled, onFill }: { lane: SheetLane; other: SheetLane; filled: boolean; onFill: () => void }) {
  const failed = lane.checks.filter((c) => !c.passed).length;
  const blanks = lane.gaps.filter((g) => g.field === "amount");
  const short = lane.gaps.filter((g) => g.field === "description");
  const diff = lane.run.final - other.run.final;
  const now = filled ? lane.repaired : lane.shown;
  return (
    <div className="mt-3 space-y-7">
      <dl className="space-y-2">
        <Item label="Final credits" value={credits(lane.run.final)} note={`about ${money(lane.run.final / 100)}`} strong />
        <Item
          label={lane.mode === "hybrid" ? "Vs the recorded cloud run" : "Vs the recorded Hybrid run"}
          value={`${diff > 0 ? "+" : "-"}${credits(Math.abs(diff))} credits`}
          note={`the other run cost ${credits(other.run.final)}${lane.run.seconds !== null && other.run.seconds === null ? `; this one took ${duration(lane.run.seconds)}` : ""}`}
        />
        <Item label="Rows complete" value={`${lane.completeRows} of ${lane.rowCount}`} note="date, description and amount all match the file" />
      </dl>

      <div>
        <ChecksHeading failed={failed} total={lane.checks.length} />
        <CheckList checks={lane.checks} />
        <p className="small mt-2">No answer key is used here. Each check compares the spreadsheet the run produced with the file it was built from, row by row.</p>
      </div>

      {lane.gaps.length + lane.missingDates > 0 && (
        <div className="bg-[color-mix(in_oklab,var(--prov)_28%,var(--sheet))] p-3.5 text-[0.9375rem]">
          <p>
            Withheld from the cloud and left blank in your own spreadsheet: <strong>{blanks.length} amounts</strong>, <strong>{lane.missingDates} dates</strong>
            {short.length > 0 && (
              <>
                {" "}
                and <strong>{short.length} shortened descriptions</strong>
              </>
            )}
            . {lane.disclosed ? "The run did say so in its reply and highlighted the cells." : "The run did not mention it."}
          </p>
          {filled ? (
            <div className="line-in">
              <ul className="mt-3 space-y-1">
                {blanks.map((g) => (
                  <li key={g.id} className="fig">
                    Row {g.id}: {g.fileValue}
                  </li>
                ))}
                <li>All {lane.missingDates} dates restored from the file.</li>
              </ul>
              <p className="small mt-2">Filled in for 0 Perplexity credits: the values come from the file the run started with. In this replay that is the test file bundled with the page.</p>
            </div>
          ) : (
            <button type="button" onClick={onFill} className="btn mt-3">
              Fill them in here, on this Mac only
            </button>
          )}
        </div>
      )}

      <div className="scroll-x">
        <table className="data">
          <caption>{filled ? "Summary sheet, before and after filling the blanks" : "Summary sheet as it opens"}</caption>
          <thead>
            <tr>
              <th>Category (the run&apos;s own labels)</th>
              <th className="num">As delivered</th>
              {filled && <th className="num">With your file&apos;s values</th>}
            </tr>
          </thead>
          <tbody>
            {lane.totals.map((t) => {
              const changed = t.shown !== t.repaired;
              return (
                <tr key={t.category}>
                  <td>{t.category}</td>
                  <td className={`num fig ${changed ? "bad" : ""}`}>{signed(t.shown)}</td>
                  {filled && <td className={`num fig ${changed ? "font-bold" : ""}`}>{signed(t.repaired)}</td>}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Net for the month</td>
              <td className={`num fig ${lane.shown.net !== lane.repaired.net ? "bad" : ""}`}>{signed(lane.shown.net)}</td>
              {filled && <td className="num fig">{signed(lane.repaired.net)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="small">
        Money in {money(now.moneyIn)}, money out {money(now.moneyOut)}. The file itself says {money(lane.repaired.moneyIn)} in and {money(lane.repaired.moneyOut)} out.
      </p>
    </div>
  );
}

// The moment a check fails is the second thing a viewer should remember, so the count leads.
function ChecksHeading({ failed, total }: { failed: number; total: number }) {
  return (
    <h3 className="mb-2 text-xl leading-tight font-bold">
      Checks:{" "}
      {failed === 0 ? (
        <span className="good">all {total} passed</span>
      ) : (
        <span className="bad">
          {failed} of {total} failed
        </span>
      )}
    </h3>
  );
}

function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="border-y border-ink">
      {checks.map((c, i) => (
        <li key={c.name} className="line-in grid grid-cols-[4.75rem_minmax(0,1fr)] items-baseline gap-x-2 border-b border-grid py-2 text-[0.9375rem] last:border-b-0" style={{ "--i": i } as React.CSSProperties}>
          <span>
            <span className={`stamp ${c.passed ? "stamp-pass" : "stamp-fail"}`}>{c.passed ? "PASSED" : "FAILED"}</span>
          </span>
          <span className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className={c.passed ? "" : "font-semibold"}>{c.name}</span>
            <span className={`fig text-[0.8125rem] ${c.passed ? "text-ink2" : "text-fail"}`}>{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Totals({ rows, heading }: { rows: TotalRow[]; heading: string }) {
  return (
    <div className="scroll-x">
      <table className="data">
        <caption>{heading}</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th className="num">Report says</th>
            <th className="num">File says</th>
            <th className="num">Match</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td>{r.category}</td>
              <td className={`num fig ${r.ok ? "" : "bad"}`}>{r.reported === null ? "withheld" : money(r.reported)}</td>
              <td className="num fig">{money(r.truth)}</td>
              <td className={`num ${r.ok ? "good" : "bad"}`}>{r.ok ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
