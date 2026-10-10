"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Range } from "@/lib/estimate.ts";
import type { Lane, ReplayData, TotalRow } from "@/lib/replay.ts";
import type { PanelRun, SheetLane } from "@/lib/sheet.ts";
import type { Check } from "@/lib/verify.ts";
import { credits, duration, money, pct, signed, span } from "../format";

type Mode = "cloud" | "hybrid";
type Task = "report" | "budget";
type Stage = "plan" | "running" | "finished" | "final";
type Route = "Search" | "Your Mac" | "Cloud";

const REPLAY_MS = 3500;
const SETTLE_MS = 1200;
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

const PROBLEMS = {
  cost: { n: "1", title: "Cost is a surprise.", answer: "Before you send, the receipt gives a credit range and a time range taken from past runs of the same prompt." },
  meter: { n: "2", title: "The credit meter reads low while you watch it.", answer: "While it runs, the count is marked provisional until the final charge lands." },
  hybrid: { n: "3", title: "Hybrid mode is unpredictable.", answer: "After, the receipt says where each step ran, checks the numbers with code and offers a repair." },
} as const;

export type WideExample = { label: string; setting: string; prompt: string | null; credits: Range; seconds: Range | null };

export default function Replay({ data, wide }: { data: ReplayData; wide: WideExample }) {
  const [task, setTask] = useState<Task>("report");
  const [mode, setMode] = useState<Mode>("hybrid");
  const [stage, setStage] = useState<Stage>("plan");
  const [progress, setProgress] = useState(0);
  const [showWithheld, setShowWithheld] = useState(false);
  const [rerun, setRerun] = useState(false);
  // The After view holds its verdict back until a run has settled once, so the catch is seen to happen.
  const [revealed, setRevealed] = useState(false);
  const meterRef = useRef<HTMLElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  const autoPlayed = useRef(false);
  const lane = task === "report" ? data[mode] : data.budget[mode];
  const steps = STEPS[task];

  useEffect(() => {
    if (stage === "running") {
      const start = performance.now();
      let id = requestAnimationFrame(function tick(now) {
        const p = Math.min(1, Math.max(0, now - start) / REPLAY_MS);
        setProgress(p);
        if (p === 1) setStage("finished");
        else id = requestAnimationFrame(tick);
      });
      return () => cancelAnimationFrame(id);
    }
    if (stage === "finished") {
      const id = setTimeout(() => setStage("final"), SETTLE_MS);
      return () => clearTimeout(id);
    }
    if (stage === "final") {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
  }, [stage]);

  // With reduced motion the count does not animate: it goes straight to the settled reading.
  const start = () => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setProgress(still ? 1 : 0);
    setStage(still ? "final" : "running");
  };

  // The meter is the thing to remember, so it plays once by itself when it scrolls into view. If a reader
  // lands on the After view first, that starts it too, so the verdict is never left waiting.
  useEffect(() => {
    const el = meterRef.current;
    if (!el || autoPlayed.current) return;
    const seen = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !autoPlayed.current) {
          autoPlayed.current = true;
          start();
        }
      },
      { threshold: 0.35 },
    );
    seen.observe(el);
    if (afterRef.current) seen.observe(afterRef.current);
    return () => seen.disconnect();
  }, []);

  const reset = (next: Mode = mode, nextTask: Task = task) => {
    setTask(nextTask);
    setMode(next);
    setStage("plan");
    setProgress(0);
    setShowWithheld(false);
    setRerun(false);
  };
  const play = () => {
    autoPlayed.current = true;
    start();
    meterRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
  };

  const ranOn = (["Your Mac", "Cloud", "Search"] as Route[]).map((route) => ({ route, count: steps.filter((s) => s.route[mode] === route).length })).filter((r) => r.count > 0);

  return (
    <main className="proto mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8">
      <header className="proto-intro">
        <h1>One receipt, three moments</h1>
        <p>
          Each part of the receipt answers one of the three problems. Below is a recorded run of mine, replayed: <b>{TASKS[task].label}</b>, {mode === "hybrid" ? "with Hybrid on and the private steps on my Mac" : "run fully in the cloud for comparison"}, run {lane.run.id}.
        </p>
      </header>

      <section className="pv cost" aria-labelledby="pv-cost">
        <ProblemSide id="pv-cost" {...PROBLEMS.cost} />
        <div className="tape">
          <Head>Before you send</Head>
          <p className="pv-prompt">&ldquo;{wide.prompt ?? wide.label}&rdquo;</p>
          <dl className="mt-4 space-y-2">
            <Item label="This run will cost" value={`${span(wide.credits, credits)} credits`} note={`from ${wide.credits.n} measured runs of this prompt, ${wide.setting}`} strong />
            {wide.seconds && <Item label="It will take" value={span(wide.seconds, duration)} note="timed on the same runs" />}
          </dl>
          <p className="pv-fact">This is the widest range I measured for one prompt on one setting. Without the receipt, nothing on screen says which end you will get.</p>
          <hr className="tear" />
          <Head>The run replayed below</Head>
          <p className="pv-prompt">&ldquo;{TASKS[task].prompt}&rdquo;</p>
          {lane.estimate ? (
            <p className="pv-fact">
              Its range is narrow because the past runs landed close together: <b className="fig">{span(lane.estimate.credits, credits)} credits</b>
              {lane.estimate.seconds ? <>, <b className="fig">{span(lane.estimate.seconds, duration)}</b></> : null}, from {lane.estimate.credits.n} measured {lane.estimate.credits.n === 1 ? "run" : "runs"} of this task.
            </p>
          ) : (
            <p className="small mt-3">No past runs of this task, so no range yet.</p>
          )}
          <button type="button" onClick={play} className="btn mt-5">
            {stage === "plan" ? "Send this run" : "Send it again"}
          </button>
          <details className="fold">
            <summary>Where each step will run</summary>
            <ol className="mt-2">
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
            <p className="small mt-3">The plan is the prototype&apos;s own. Perplexity shows one total per run, so the range is for the whole run, not per step.</p>
          </details>
        </div>
      </section>

      <section className="pv meter" aria-labelledby="pv-meter" ref={meterRef}>
        <ProblemSide id="pv-meter" {...PROBLEMS.meter} />
        <div className="tape">
          <Head>While it runs</Head>
          <Meter lane={lane} steps={steps} stage={stage} progress={progress} />
          {lane.estimate?.undercountPct && (
            <p className="pv-fact">
              On past runs of this task, the count at Finished was <b className="fig">{span(lane.estimate.undercountPct, pct)}</b> below the final charge.
            </p>
          )}
          {stage === "final" && (
            <button type="button" onClick={play} className="btn btn-quiet mt-4">
              Play it again
            </button>
          )}
        </div>
      </section>

      <section className="pv hybrid" aria-labelledby="pv-hybrid" ref={afterRef} data-pending={revealed ? "false" : "true"}>
        <ProblemSide id="pv-hybrid" {...PROBLEMS.hybrid} answer={mode === "hybrid" ? PROBLEMS.hybrid.answer : "This is the comparison run: the same task done fully in the cloud, with nothing on the Mac. The receipt runs the same checks."} />
        <div className="tape">
          <Head>After</Head>
          <p className="pv-ran">
            <span>Where the steps ran</span>
            {ranOn.map((r) => (
              <span key={r.route} className={ROUTE_CHIP[r.route]}>
                {r.route} · {r.count}
              </span>
            ))}
          </p>
          {task === "report" ? (
            <Receipt data={data} lane={data[mode]} showWithheld={showWithheld} onShowWithheld={() => setShowWithheld((v) => !v)} rerun={rerun} onRerun={() => setRerun((v) => !v)} />
          ) : (
            <BudgetReceipt lane={data.budget[mode]} other={data.budget[mode === "hybrid" ? "cloud" : "hybrid"]} filled={showWithheld} onFill={() => setShowWithheld((v) => !v)} />
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
        </div>
      </section>

      <section className="proto-try" aria-labelledby="pv-try">
        <h2 id="pv-try">Try another recorded run</h2>
        <div className="proto-switches">
          <fieldset>
            <legend className="small mb-1.5 font-semibold">Task</legend>
            <div className="switch">
              {(Object.keys(TASKS) as Task[]).map((t) => (
                <button key={t} type="button" onClick={() => reset(mode, t)} aria-pressed={task === t}>
                  {TASKS[t].label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="small mb-1.5 font-semibold">Private steps ran on</legend>
            <div className="switch">
              {(["hybrid", "cloud"] as const).map((m) => (
                <button key={m} type="button" onClick={() => reset(m)} aria-pressed={mode === m}>
                  {m === "hybrid" ? "My Mac (Hybrid)" : "Cloud, for comparison"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="small mt-5 max-w-[70ch]">
          A replay of recorded runs. Credit and time figures were measured on my own Perplexity account, on a made-up bank file ({data.txnCount} rows). This is a standalone prototype and does not hook into Perplexity&apos;s product.
        </p>
        <p className="small mt-2">
          <Link href="/evidence">The measured runs behind these numbers</Link> · <Link href="/router">How my own router splits the work</Link>
        </p>
      </section>
    </main>
  );
}

function ProblemSide({ id, n, title, answer }: { id: string; n: string; title: string; answer: string }) {
  return (
    <div className="pv-problem">
      <p className="pv-n" aria-hidden="true">{n}</p>
      <h2 id={id}>{title}</h2>
      <p className="pv-answer">{answer}</p>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <h3 className="tape-head">{children}</h3>;
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

// The headline of the After view: one count, one stamp, one plain sentence.
function Verdict({ right, total, what, ok, note }: { right: number; total: number; what: string; ok: boolean; note: string }) {
  return (
    <div className="pv-verdict">
      <p className="pv-verdict-line">
        <span className="fig">{right} of {total}</span> {what}
        <span className={`pv-chip ${ok ? "good" : "bad"}`}>{ok ? "All match" : "Caught by the receipt"}</span>
      </p>
      <p className="small">{note}</p>
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
          <span className="meter-figure text-[clamp(3.5rem,17vw,6rem)] leading-[0.95] font-bold tracking-[-0.04em] tabular-nums" data-final={final}>
            {credits(shown)}
          </span>
          <span className="ml-2 text-base text-ink2">credits</span>
        </p>
        {final ? (
          <span key="final" className="stamp settle settle-in mb-2 text-sm! text-ink">
            FINAL
          </span>
        ) : (
          <span key="prov" className={`chip mark-prov mb-2 text-[0.8125rem]! ${stage === "finished" ? "pulse" : ""}`}>
            {stage === "plan" ? "PROVISIONAL" : "PROVISIONAL, still counting"}
          </span>
        )}
      </div>

      <div className="relative mt-4 h-2 bg-grid" role="progressbar" aria-label="Replay progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="meter-fill h-full w-full origin-left" data-final={final} style={{ transform: `scaleX(${progress})` }} />
        {steps.slice(1).map((s, i) => (
          <span key={s.name} aria-hidden className="absolute inset-y-0 w-[2px] bg-sheet" style={{ left: `${((i + 1) / steps.length) * 100}%` }} />
        ))}
      </div>

      <p className="mt-3 min-h-[3.2em] text-[0.9375rem]" aria-live="polite">
        {stage === "plan" ? (
          <>The count starts when you press &ldquo;Send this run&rdquo; above.</>
        ) : stage === "running" ? (
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
        Replayed in {REPLAY_MS / 1000} s. {run.seconds === null ? `The real run was not timed${run.secondsNote ? ` (${run.secondsNote})` : ""}.` : `The real run took ${run.secondsNote && /^(about|\d)/.test(run.secondsNote) ? run.secondsNote : `${duration(run.seconds)}${run.secondsNote ? ` (${run.secondsNote})` : ""}`}.`}
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
    <div className="mt-4 space-y-5">
      <Verdict
        right={lane.totalsRight}
        total={lane.rows.length}
        what="category totals match your file"
        ok={failed === 0}
        note={failed === 0 ? "Code recomputed every total from your file and compared it with the report." : "Code recomputed every total from your file. The numbers in the report did not match, and the receipt says so."}
      />

      {lane.withheld.length > 0 && (
        <div className="pv-box">
          <p>
            <strong>{lane.withheld.map((w) => w.category).join(", ")}</strong> {lane.withheld.length === 1 ? "was" : "were"} kept off the cloud, so {lane.withheld.length === 1 ? "it is" : "they are"} missing from your own report.
          </p>
          {showWithheld && (
            <ul className="line-in mt-2">
              {lane.withheld.map((w) => (
                <li key={w.category}>
                  {w.category}: <span className="fig font-bold">{money(w.value)}</span> <span className="small">computed from the file on this device</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onShowWithheld} className="btn btn-quiet mt-3" aria-expanded={showWithheld}>
            {showWithheld ? "Hide the withheld values" : "Show them here, on this Mac only"}
          </button>
        </div>
      )}

      {lane.mode === "hybrid" && failed > 0 && data.rerunGap && (
        <div className="pv-box pv-repair">
          <p className="font-semibold">
            Repair it for about <span className="fig">{span(data.rerunGap, credits)}</span> more credits.
          </p>
          <p className="small mt-1">
            This replay shows my recorded cloud run of the same task. The price is the measured gap between cloud and Hybrid runs, {data.rerunGap.n} runs each; a single-step rerun was not measured.
          </p>
          <button type="button" onClick={onRerun} className="btn mt-3" aria-expanded={rerun}>
            {rerun ? "Hide the cloud result" : "Rerun in the cloud"}
          </button>
          {rerun && (
            <div className="line-in mt-4">
              <p className="mb-3 font-semibold">
                Recorded cloud run of the same task: {data.cloud.totalsRight} of {data.cloud.rows.length} totals match, <span className="fig">{credits(data.cloud.run.final)}</span> credits.
              </p>
              <Totals rows={data.cloud.rows} heading="Totals in the cloud run" />
            </div>
          )}
        </div>
      )}

      <details className="fold">
        <summary>
          The {lane.checks.length} checks behind this, and every total
        </summary>
        <div className="mt-3 space-y-6">
          <div>
            <ChecksHeading failed={failed} total={lane.checks.length} />
            <CheckList checks={lane.checks} />
            <p className="small mt-2">This is a test file with a known answer, so the recorded report is graded against totals recomputed in code. Perplexity does not expose the row labels of its own run.</p>
          </div>
          <Totals rows={lane.rows} heading="Totals in the report" />
          <dl className="space-y-2">
            {lane.mode === "hybrid" ? (
              <>
                <Item label="Credits against the cloud run" value={`${credits(other.run.final - lane.run.final)} fewer`} note={`the recorded cloud run cost ${credits(other.run.final)}`} />
                <Item label="Time added by the local step" value={duration(lane.run.seconds - other.run.seconds)} note="at least; cloud time is an upper bound" />
              </>
            ) : (
              <Item label="Credits against the Hybrid run" value={`${credits(lane.run.final - other.run.final)} more`} note={`the recorded Hybrid run cost ${credits(other.run.final)}`} />
            )}
          </dl>
        </div>
      </details>

      {lane.mode === "hybrid" && (
        <details className="fold">
          <summary>What changes when code does the sums</summary>
          <div className="mt-3 text-[0.9375rem]">
            <p className="small">
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
        </details>
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
  const hasGaps = lane.gaps.length + lane.missingDates > 0;
  return (
    <div className="mt-4 space-y-5">
      <Verdict
        right={lane.completeRows}
        total={lane.rowCount}
        what="rows are complete"
        ok={failed === 0}
        note={failed === 0 ? "Every date, description and amount in the spreadsheet matches your file." : "Code compared the spreadsheet with your file, row by row. Some cells came back blank or changed."}
      />

      {hasGaps && (
        <div className="pv-box pv-repair">
          <p>
            Withheld from the cloud, and left blank in your own spreadsheet: <strong>{blanks.length} amounts</strong>, <strong>{lane.missingDates} dates</strong>
            {short.length > 0 && (
              <>
                {" "}
                and <strong>{short.length} shortened descriptions</strong>
              </>
            )}
            . {lane.disclosed ? "The run did say so in its reply and highlighted the cells." : "The run did not mention it."}
          </p>
          <button type="button" onClick={onFill} className="btn mt-3" aria-expanded={filled}>
            {filled ? "Hide the filled-in values" : "Repair: fill them in here, on this Mac only"}
          </button>
          {filled && (
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
          )}
        </div>
      )}

      <details className="fold">
        <summary>
          The {lane.checks.length} checks behind this, and the summary sheet
        </summary>
        <div className="mt-3 space-y-6">
          <div>
            <ChecksHeading failed={failed} total={lane.checks.length} />
            <CheckList checks={lane.checks} />
            <p className="small mt-2">No answer key is used here. Each check compares the spreadsheet the run produced with the file it was built from, row by row.</p>
          </div>
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
          <dl className="space-y-2">
            <Item
              label={lane.mode === "hybrid" ? "Credits against the cloud run" : "Credits against the Hybrid run"}
              value={`${credits(Math.abs(diff))} ${diff > 0 ? "more" : "fewer"}`}
              note={`the other run cost ${credits(other.run.final)}${lane.run.seconds !== null && other.run.seconds === null ? `; this one took ${duration(lane.run.seconds)}` : ""}`}
            />
          </dl>
        </div>
      </details>
    </div>
  );
}

// The moment a check fails is the second thing a viewer should remember, so the count leads.
function ChecksHeading({ failed, total }: { failed: number; total: number }) {
  return (
    <h4 className="mb-2 text-base leading-tight font-bold">
      {failed === 0 ? (
        <span className="good">All {total} checks matched your file</span>
      ) : (
        <span className="bad">
          {failed} of {total} checks found a mismatch
        </span>
      )}
    </h4>
  );
}

function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="border-y border-ink">
      {checks.map((c, i) => (
        <li key={c.name} className="line-in grid grid-cols-[4.75rem_minmax(0,1fr)] items-baseline gap-x-2 border-b border-grid py-2 text-[0.9375rem] last:border-b-0" style={{ "--i": i } as React.CSSProperties}>
          <span>
            <span className={`stamp ${c.passed ? "stamp-pass" : "stamp-fail"}`}>{c.passed ? "MATCH" : "MISMATCH"}</span>
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
