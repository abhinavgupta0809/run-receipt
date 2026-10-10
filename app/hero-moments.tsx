"use client";

import { useEffect, useRef, useState } from "react";
import { credits } from "./format";

type Phase = "wait" | "counting" | "final" | "caught";
const HOLD_MS = 1400;
const COUNT_MS = 700;
const CAUGHT_MS = 350;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

// The two moments a reader should remember, played once on the hero receipt: the count going from the
// provisional panel reading to the final charge, then the check being caught. The server renders the
// provisional reading, which is what the page shows without scripts. With reduced motion it goes straight
// to the settled state.
export default function HeroMoments({ panel, final, totals, withheld }: { panel: number; final: number; totals: string; withheld: string }) {
  const [phase, setPhase] = useState<Phase>("wait");
  const [p, setP] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => { setP(1); setPhase("caught"); });
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const play = () => {
      timers.push(setTimeout(() => {
        setPhase("counting");
        const start = performance.now();
        frame = requestAnimationFrame(function tick(now) {
          const x = Math.min(1, Math.max(0, now - start) / COUNT_MS);
          setP(x);
          if (x < 1) { frame = requestAnimationFrame(tick); return; }
          setPhase("final");
          timers.push(setTimeout(() => setPhase("caught"), CAUGHT_MS));
        });
      }, HOLD_MS));
    };
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.disconnect();
      play();
    }, { threshold: 0.5 });
    seen.observe(el);
    return () => { seen.disconnect(); cancelAnimationFrame(frame); timers.forEach(clearTimeout); };
  }, []);

  const settled = phase === "final" || phase === "caught";
  const shown = panel + (final - panel) * easeOut(p);
  return (
    <div ref={root} className="grid gap-[10px]">
      <div className="sum-moment meter line-in" data-phase={phase} style={{ animationDelay: "0.35s" }}>
        <p className="tape-head">While it runs</p>
        <div className="leader">
          <span>{settled ? "Final charge" : "Credits so far"}</span>
          <span className="dots" />
          <span className="fig">
            <span className="hero-count">{credits(shown)}</span>{" "}
            {settled ? <span key="final" className="chip-final settle-in">FINAL</span> : <span key="prov" className="chip mark-prov">PROVISIONAL</span>}
          </span>
        </div>
        <p className="hero-note" aria-hidden={!settled}>The panel showed <span className="fig">{credits(panel)}</span> at Finished.</p>
      </div>
      <div className="sum-moment hybrid hero-after line-in" data-phase={phase} style={{ animationDelay: "0.6s" }}>
        <p className="tape-head">After</p>
        <div className="leader">
          <span>Totals that match the file</span>
          <span className="dots" />
          <span className="fig">{totals} <span key={phase === "caught" ? "caught" : "pending"} className={`stamp text-fail ${phase === "caught" ? "settle-in" : ""}`}>CAUGHT</span></span>
        </div>
        <div className="leader">
          <span>Left out of the report</span>
          <span className="dots" />
          <span className="fig">{withheld}</span>
        </div>
      </div>
    </div>
  );
}
