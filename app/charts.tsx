import type { Pair, PanelReading } from "@/lib/study.ts";
import ChartFrame from "./chartjs";
import { credits, pct, span } from "./format";

// Plain charts, one point each. Marks carry the colour; every label stays in ink.

export function Bars({ rows, unit, label }: { rows: { name: string; note?: string; value: number }[]; unit: string; label: string }) {
  return <ChartFrame label={`${label}. ${rows.map(r => `${r.name}${r.note ? `, ${r.note}` : ""}: ${credits(r.value)} ${unit}`).join(". ")}`} height={rows.length * 46 + 56}
    spec={{ kind: "bars", rows, unit }}
    table={{ head: ["Run or setting", `Final charge, ${unit}`], rows: rows.map(r => [r.note ? `${r.name}, ${r.note}` : r.name, credits(r.value)]) }} />;
}

const SETTING_SHORT: Record<string, string> = {
  "Mac app, cloud": "cloud",
  "Mac app, Hybrid, ran locally": "Hybrid, ran locally",
  "Mac app, Hybrid on, nothing ran locally": "Hybrid on, nothing local",
  "Web, Standard effort": "web, Standard",
  "Web, High effort": "web, High",
};

// One row per reading: how much of the final charge the panel showed when the run said Finished.
export function PanelChart({ readings }: { readings: PanelReading[] }) {
  return (
    <div data-chart role="table" aria-label="Panel at Finished as a share of the final charge, one row per run">
      <div role="row" className="small grid grid-cols-[minmax(0,8.25rem)_minmax(2.5rem,1fr)_auto] gap-x-3 border-b border-ink pb-1.5 sm:grid-cols-[14rem_minmax(0,1fr)_10rem]">
        <span role="columnheader">Run and setting</span>
        <span role="columnheader">Share shown</span>
        <span role="columnheader" className="w-[6.9rem] text-right sm:w-auto">
          Panel / final
        </span>
      </div>
      {readings.map((r, i) => {
        const first = readings[i - 1]?.label !== r.label;
        return (
          <div key={r.id} role="row" className={`grid grid-cols-[minmax(0,8.25rem)_minmax(2.5rem,1fr)_auto] items-center gap-x-3 py-[0.3rem] sm:grid-cols-[14rem_minmax(0,1fr)_10rem] ${first && i > 0 ? "mt-1.5 border-t border-grid pt-2" : ""}`}>
            <span role="cell" className="text-[0.8125rem] leading-tight">
              {first && <span className="block font-semibold">{r.label}</span>}
              <span className="text-ink2">
                <span className="fig">{r.id}</span> {SETTING_SHORT[r.setting] ?? r.setting}
              </span>
            </span>
            <span role="cell" className={`track ${first ? "self-end mb-1" : ""}`} title={`Run ${r.id}: panel showed ${pct(r.shownPct)} of the final charge`}>
              <span className="fill m-grow-x" style={{ width: `${r.shownPct}%`, animationDelay: `${i * 30}ms` }} />
            </span>
            <span role="cell" className={`fig w-[6.9rem] text-right text-[0.75rem] whitespace-nowrap sm:w-auto sm:text-[0.8125rem] ${first ? "self-end" : ""}`}>
              {credits(r.panel)} <span className="text-ink2">/</span> {credits(r.final)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Cloud against Hybrid credits for each paired task, on one shared scale.
// `wide` is the exhibit size: each task is named at its Hybrid end.
export function PairsChart({ pairs, wide }: { pairs: Pair[]; wide?: boolean }) {
  const top = Math.ceil(Math.max(...pairs.flatMap(p => [p.cloud.credits.min, p.hybrid.credits.min])) / 15) * 15;
  return <div className={wide ? "pairs-wide" : undefined}>
    <ChartFrame label={`Credits, lowest run on each side for separate tasks. ${pairs.map(p => `${p.label}: cloud ${credits(p.cloud.credits.min)}, Hybrid ${credits(p.hybrid.credits.min)}, ${p.ranLocal ? "ran on the Mac" : "nothing ran locally"}`).join(". ")}`} height={wide ? 340 : 230}
      spec={{ kind: "pairs", top, wide, pairs: pairs.map(p => ({ label: p.label, cloud: p.cloud.credits.min, hybrid: p.hybrid.credits.min, local: p.ranLocal, tip: `cloud ${span(p.cloud.credits, credits)}, Hybrid ${span(p.hybrid.credits, credits)} credits; ${p.ranLocal ? "ran on the Mac" : "nothing ran locally"}` })) }}
      table={{ head: ["Task", "Cloud credits", "Hybrid credits", "Ran on the Mac"], rows: pairs.map(p => [p.label, span(p.cloud.credits, credits), span(p.hybrid.credits, credits), p.ranLocal ? "yes" : "no"]) }} />
    <p className="chart-legend"><span><i className="line-key"/>Ran on the Mac</span><span><i className="line-key dashed"/>Nothing ran locally</span></p>
  </div>;
}

export function MeterColumns({ readings }: { readings: PanelReading[] }) {
  return <ChartFrame label={`Share of final charge shown at Finished, one bar per run. ${readings.map(r => `Run ${r.id}: ${pct(r.shownPct)}, panel ${credits(r.panel)}, final ${credits(r.final)} credits`).join(". ")}`} height={330} minWidth={680}
    spec={{ kind: "columns", items: readings.map(r => ({ id: r.id, pct: r.shownPct, tip: `${r.label}, ${r.setting}: ${credits(r.panel)} of ${credits(r.final)} credits, ${pct(r.shownPct)} shown` })) }}
    table={{ head: ["Run", "Task", "Setting", "Panel at Finished", "Final charge", "Share shown"], rows: readings.map(r => [r.id, r.label, r.setting, credits(r.panel), credits(r.final), pct(r.shownPct)]) }} />;
}

export function HybridRing({ local, total }: { local:number; total:number }) {
  return <div className="ring-wrap"><div className="ring-chart">
    <ChartFrame label={`${local} of ${total} Hybrid runs ran on the Mac. ${total-local} ran nothing locally.`} height={170}
      spec={{ kind: "ring", local, total }}
      table={{ head: ["Runs with Hybrid on", "Count"], rows: [["Ran on the Mac", local], ["Nothing ran locally", total - local]] }} />
  </div><div className="ring-legend"><p><i />Ran on the Mac <b>{local}</b></p><p><i />Nothing ran locally <b>{total-local}</b></p></div></div>;
}

export function PanelSlope({ readings }: { readings: PanelReading[] }) {
  return <figure className="panel-slope"><p className="chart-subtitle">Each line is one run, from the reading at Finished to its final charge.</p>
    <ChartFrame label={`Panel readings as a share of the final charge. ${readings.map(r=>`Run ${r.id}: ${pct(r.shownPct)} at Finished to 100% final`).join(". ")}`} height={370}
      spec={{ kind: "slope", items: readings.map(r => ({ id: r.id, pct: r.shownPct, tip: `${credits(r.panel)} at Finished, ${credits(r.final)} final credits` })) }}
      table={{ head: ["Run", "Panel at Finished", "Final charge", "Share shown"], rows: readings.map(r => [r.id, credits(r.panel), credits(r.final), pct(r.shownPct)]) }} />
    <figcaption>A rising line is an under-read. A flat line already showed the charge. The full readings stay open below.</figcaption></figure>;
}

// A count drawn as dots: `on` of `total` filled. For small counts that must not read as a rate.
export function Dots({ total, on, tone, label, perRow = 10 }: { total: number; on: number; tone: "cost" | "meter" | "hybrid"; label: string; perRow?: number }) {
  const step = 26, r = 9, rows = Math.ceil(total / perRow), w = Math.min(total, perRow) * step, h = rows * step;
  return <svg data-chart className="dots-chart" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
    {Array.from({ length: total }, (_, i) => <circle key={i} cx={(i % perRow) * step + step / 2} cy={Math.floor(i / perRow) * step + step / 2} r={r} fill={i < on ? `var(--${tone})` : "none"} stroke={i < on ? "none" : "var(--ink2)"} strokeWidth="2" className="m-pop" style={{ animationDelay: `${i * 20}ms` }} />)}
  </svg>;
}
