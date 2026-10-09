import type { Range } from "@/lib/estimate.ts";

export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const signed = (n: number) => `${n < 0 ? "-" : n > 0 ? "+" : ""}${money(Math.abs(n))}`;
export const duration = (s: number) => (s < 90 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`);
export const span = (r: Range, fmt: (n: number) => string) => (r.min === r.max ? fmt(r.min) : `${fmt(r.min)} to ${fmt(r.max)}`);
export const credits = (n: number) => n.toFixed(2);
// 99.7% must not print as 100%: the panel was never at exactly zero.
export const pct = (n: number) => (n > 99 && n < 100 ? "over 99%" : `${n.toFixed(0)}%`);
export const signedPct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;
export const runs = (n: number) => `${n} ${n === 1 ? "run" : "runs"}`;
