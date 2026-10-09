"use client";

import { Chart, registerables, type ChartConfiguration, type Plugin, type TooltipItem } from "chart.js";
import { useEffect, useRef, useState } from "react";

Chart.register(...registerables);

// Charts are built the way the reviews dashboard builds them: Chart.js on a canvas, every colour read from a
// CSS token at draw time so the chart follows the theme, mono tick labels, a shared tooltip, and a table view.
// Every value comes in as data from the server components. Nothing is typed here.

export type ChartSpec =
  | { kind: "bars"; rows: { name: string; value: number; note?: string }[]; unit: string }
  | { kind: "columns"; items: { id: string; pct: number; tip: string }[] }
  | { kind: "pairs"; pairs: { label: string; cloud: number; hybrid: number; local: boolean; tip: string }[]; top: number; wide?: boolean }
  | { kind: "ring"; local: number; total: number }
  | { kind: "slope"; items: { id: string; pct: number; tip: string }[] };

export type ChartTable = { head: string[]; rows: (string | number)[][] };

const css = (token: string) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();
const fade = (color: string, amount: number) => {
  const hex = color.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Number.isNaN(r + g + b) ? color : `rgba(${r}, ${g}, ${b}, ${amount})`;
};
const sans = () => getComputedStyle(document.body).fontFamily;
const mono = () => `${css("--font-figures") || "ui-monospace"}, ui-monospace, Menlo, monospace`;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const theme = () => ({ text1: css("--ink"), text2: css("--soft"), text3: css("--ink2"), border: css("--rule"), surface: css("--sheet"), raised: css("--raised") });
type Theme = ReturnType<typeof theme>;

const tick = (t: Theme) => ({ color: t.text3, font: { family: mono(), size: 11 } });
const catTick = (t: Theme) => ({ color: t.text2, font: { family: sans(), size: 12 }, autoSkip: false });
const tooltip = (t: Theme, callbacks: Record<string, unknown>) => ({
  backgroundColor: t.raised, titleColor: t.text1, bodyColor: t.text2, borderColor: t.border, borderWidth: 1, padding: 10, cornerRadius: 8, boxPadding: 4,
  displayColors: false, titleFont: { family: sans(), size: 12, weight: 600 }, bodyFont: { family: mono(), size: 12 }, callbacks,
});
const base = (animate: boolean, extra: Record<string, unknown>) => ({
  responsive: true, maintainAspectRatio: false, animation: animate && !reduced() ? { duration: 900, easing: "easeOutQuart" } : false, ...extra,
});
const grid = (t: Theme) => ({ color: fade(t.border, 0.7) });

function build(spec: ChartSpec, animate: boolean): ChartConfiguration {
  const t = theme();
  if (spec.kind === "bars") {
    const color = css("--cost");
    const ends: Plugin = { id: "ends", afterDatasetsDraw(chart) {
      const { ctx } = chart; ctx.save(); ctx.font = `600 12px ${mono()}`; ctx.fillStyle = t.text1; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      chart.getDatasetMeta(0).data.forEach((bar, i) => ctx.fillText(spec.rows[i].value.toFixed(2), bar.x + 8, bar.y));
      ctx.restore();
    } };
    return { type: "bar", plugins: [ends], data: { labels: spec.rows.map((r) => (r.note ? [r.name, r.note] : r.name)), datasets: [{ data: spec.rows.map((r) => r.value), backgroundColor: color, borderRadius: 4, barThickness: 16 }] },
      options: base(animate, { indexAxis: "y", layout: { padding: { right: 56 } },
        scales: { x: { beginAtZero: true, grid: grid(t), border: { display: false }, ticks: tick(t), title: { display: true, text: `${spec.unit}, final charge`, color: t.text3, font: { family: sans(), size: 11 } } }, y: { grid: { display: false }, border: { display: false }, ticks: catTick(t) } },
        plugins: { legend: { display: false }, tooltip: tooltip(t, { label: (c: TooltipItem<"bar">) => ` ${(c.raw as number).toFixed(2)} ${spec.unit}` }) } }) } as unknown as ChartConfiguration;
  }
  if (spec.kind === "columns") {
    const color = css("--meter");
    const marks: Plugin = { id: "marks", afterDatasetsDraw(chart) {
      const { ctx, chartArea: a, scales } = chart; const y = scales.y.getPixelForValue(100);
      ctx.save(); ctx.strokeStyle = t.text3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `500 11px ${sans()}`; ctx.fillStyle = t.text3; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("100% = the final charge", a.right, y - 5);
      ctx.font = `600 11px ${mono()}`; ctx.fillStyle = t.text1; ctx.textAlign = "center";
      chart.getDatasetMeta(0).data.forEach((bar, i) => { if (spec.items[i].pct < 10) ctx.fillText(`${spec.items[i].pct.toFixed(1)}%`, bar.x, bar.y - 5); });
      ctx.restore();
    } };
    return { type: "bar", plugins: [marks], data: { labels: spec.items.map((i) => i.id), datasets: [{ data: spec.items.map((i) => i.pct), backgroundColor: color, borderRadius: 3, minBarLength: 2, categoryPercentage: 0.7 }] },
      options: base(animate, { layout: { padding: { top: 22 } },
        scales: { y: { min: 0, max: 100, grid: grid(t), border: { display: false }, ticks: { ...tick(t), stepSize: 25, callback: (v: number) => `${v}%` } }, x: { grid: { display: false }, border: { display: false }, ticks: tick(t), title: { display: true, text: "Run", color: t.text3, font: { family: sans(), size: 11 }, align: "start" } } },
        plugins: { legend: { display: false }, tooltip: tooltip(t, { title: (items: TooltipItem<"bar">[]) => `Run ${items[0].label}`, label: (c: TooltipItem<"bar">) => ` ${spec.items[c.dataIndex].tip}` }) } }) } as unknown as ChartConfiguration;
  }
  if (spec.kind === "pairs") {
    const color = css("--hybrid");
    // In the wide form each line is named at its Hybrid end, with near-equal values nudged apart.
    const names: Plugin = { id: "names", afterDatasetsDraw(chart) {
      if (!spec.wide) return;
      const { ctx, chartArea: a } = chart;
      const ends = chart.data.datasets.map((_, d) => ({ p: spec.pairs[d], el: chart.getDatasetMeta(d).data[1] })).sort((x, y) => x.el.y - y.el.y).map((e) => ({ ...e, at: e.el.y }));
      for (let i = 1; i < ends.length; i++) ends[i].at = Math.max(ends[i].at, ends[i - 1].at + 17);
      const over = Math.max(0, ends[ends.length - 1].at - a.bottom);
      ctx.save(); ctx.textBaseline = "middle"; ctx.textAlign = "left";
      for (const e of ends) {
        const y = e.at - over, x = e.el.x;
        ctx.strokeStyle = fade(t.border, 1); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 7, e.el.y); ctx.lineTo(x + 26, y); ctx.stroke();
        ctx.font = `600 12px ${mono()}`; ctx.fillStyle = t.text1; ctx.fillText(e.p.hybrid.toFixed(2), x + 32, y);
        ctx.font = `400 12px ${sans()}`; ctx.fillStyle = t.text3; ctx.fillText(e.p.label, x + 78, y);
      }
      ctx.restore();
    } };
    return { type: "line", plugins: [names], data: { labels: ["Cloud", "Hybrid on"], datasets: spec.pairs.map((p) => ({ label: p.label, data: [p.cloud, p.hybrid], borderColor: color, borderWidth: 2, borderDash: p.local ? [] : [5, 4], pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: color, pointBorderColor: t.surface, pointBorderWidth: 2 })) },
      options: base(animate, { interaction: { mode: "nearest", intersect: false }, layout: { padding: { right: spec.wide ? 260 : 8, top: 8 } },
        scales: { y: { min: 0, max: spec.top, grid: grid(t), border: { display: false }, ticks: { ...tick(t), stepSize: spec.top / 3 } }, x: { offset: true, grid: { display: false }, border: { display: false }, ticks: catTick(t) } },
        plugins: { legend: { display: false }, tooltip: tooltip(t, { title: (items: TooltipItem<"line">[]) => spec.pairs[items[0].datasetIndex].label, label: (c: TooltipItem<"line">) => ` ${spec.pairs[c.datasetIndex].tip}` }) } }) } as unknown as ChartConfiguration;
  }
  if (spec.kind === "ring") {
    const centre: Plugin = { id: "centre", afterDatasetsDraw(chart) {
      const { ctx, chartArea: a } = chart; const x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2;
      ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 22px ${sans()}`; ctx.fillStyle = t.text1; ctx.fillText(`${spec.local} of ${spec.total}`, x, y - 6);
      ctx.font = `400 11px ${sans()}`; ctx.fillStyle = t.text3; ctx.fillText("ran on the Mac", x, y + 14); ctx.restore();
    } };
    return { type: "doughnut", plugins: [centre], data: { labels: ["Ran on the Mac", "Nothing ran locally"], datasets: [{ data: [spec.local, spec.total - spec.local], backgroundColor: [css("--hybrid"), css("--rest")], borderColor: t.surface, borderWidth: 3 }] },
      options: base(animate, { cutout: "70%", plugins: { legend: { display: false }, tooltip: tooltip(t, { label: (c: TooltipItem<"doughnut">) => ` ${c.label}: ${c.raw}` }) } }) } as unknown as ChartConfiguration;
  }
  const color = css("--meter");
  return { type: "line", data: { labels: ["At Finished", "Final charge"], datasets: spec.items.map((i) => ({ label: i.id, data: [i.pct, 100], borderColor: fade(color, 0.6), borderWidth: 1.5, pointRadius: [3, 0], pointHoverRadius: 5, pointBackgroundColor: color, pointBorderWidth: 0 })) },
    options: base(animate, { interaction: { mode: "nearest", intersect: false }, layout: { padding: { top: 8, right: 12 } },
      scales: { y: { min: 0, max: 100, grid: grid(t), border: { display: false }, ticks: { ...tick(t), stepSize: 25, callback: (v: number) => `${v}%` } }, x: { offset: true, grid: { display: false }, border: { display: false }, ticks: catTick(t) } },
      plugins: { legend: { display: false }, tooltip: tooltip(t, { title: (items: TooltipItem<"line">[]) => `Run ${spec.items[items[0].datasetIndex].id}`, label: (c: TooltipItem<"line">) => ` ${spec.items[c.datasetIndex].tip}` }) } }) } as unknown as ChartConfiguration;
}

export default function ChartFrame({ spec, table, label, height, minWidth }: { spec: ChartSpec; table: ChartTable; label: string; height: number; minWidth?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el || asTable) return;
    let chart: Chart | null = null;
    const draw = (animate: boolean) => { chart?.destroy(); chart = new Chart(el, build(spec, animate)); };
    // Drawn when it scrolls into view so the marks animate in, and replayed each time it comes back.
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) { if (!chart) draw(true); else if (el.dataset.away) { chart.reset(); chart.update(); } delete el.dataset.away; }
      else if (!entry.isIntersecting && chart) el.dataset.away = "1";
    }, { threshold: [0, 0.15] });
    seen.observe(el);
    // A theme switch redraws with the new tokens, without replaying the animation.
    const themed = new MutationObserver(() => { if (chart) draw(false); });
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { seen.disconnect(); themed.disconnect(); chart?.destroy(); };
  }, [spec, asTable]);

  return (
    <div className="cj">
      <div className="cj-tools">
        <button type="button" className="table-toggle" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>{asTable ? "View as chart" : "View as table"}</button>
      </div>
      {asTable ? (
        <div className="scroll-x" tabIndex={0} role="region" aria-label={`${label}, as a table`}>
          <table className="data cj-table">
            <thead><tr>{table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === "number" ? "num fig" : undefined}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className={minWidth ? "cj-scroll" : undefined}>
          <div className="cj-canvas" style={{ height, minWidth }}><canvas ref={canvas} role="img" aria-label={label} /></div>
        </div>
      )}
    </div>
  );
}
