"use client";

import { useEffect, useRef, useState } from "react";

export type DemoRun = { runId: string; when: string; credits: string; reported: string };

const STEPS = ["Do the task", "Do it again", "A third time", "Get asked", "Skill is written", "Call it"] as const;
const HOLD = [2600, 2600, 2800, 3200, 5200, 4200]; // ms each step stays up during autoplay

// The proposal as a moving picture: three real sessions, then the offer, the Markdown skill and the slash command.
// Sessions, credits and reported prices are recorded. The offer, the build and the command are the proposal.
export default function Demo({ prompt, runs, file, command, name, checks, cost }: { prompt: string; runs: DemoRun[]; file: string; command: string; name: string; checks: number; cost: string }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const last = STEPS.length - 1;

  // Autoplay starts once, when the panel scrolls into view, unless the reader has asked for less motion.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setPlaying(true);
      seen.disconnect();
    }, { threshold: 0.4 });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => (step === last ? setPlaying(false) : setStep(step + 1)), HOLD[step]);
    return () => clearTimeout(id);
  }, [playing, step, last]);

  const go = (n: number) => { setPlaying(false); setStep(n); };
  const replay = () => { setStep(0); setPlaying(true); };
  const shown = Math.min(step, runs.length - 1);
  const run = runs[shown];
  const first = runs[0];
  const lines = file.split("\n");

  return (
    <div className="demo" ref={root}>
      <ol className="demo-steps" aria-label="Steps in the demo">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined}>
              <span>{i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <div className="demo-window" aria-live="polite">
        <aside className="demo-side">
          <p className="demo-label">Your sessions</p>
          <ul>
            {runs.slice(0, shown + 1).map((r, i) => (
              <li key={r.runId} className={i === shown && step < 3 ? "demo-in now" : "demo-in"}>
                <b>App price comparison</b>
                <span>{r.when}</span>
                <span>{r.credits} credits</span>
              </li>
            ))}
          </ul>
          {step >= 4 && (
            <>
              <p className="demo-label">Your skills</p>
              <ul><li className="demo-in skill"><b>{name}</b><span>{command}</span></li></ul>
            </>
          )}
        </aside>

        <div className="demo-main">
          {step < 3 && (
            <div key={`run-${shown}`} className="demo-in">
              <p className="demo-label">Run {shown + 1} of {runs.length}, recorded as run {run.runId}</p>
              <p className="demo-prompt">{prompt}</p>
              <div className="demo-output">
                <p><b>Output: a one-page comparison</b></p>
                <p>It reported {run.reported}.</p>
                {shown > 0 && run.reported !== first.reported && <p className="demo-flag">Run {first.runId} said something different for the same prompt.</p>}
                {shown > 0 && run.reported === first.reported && <p className="demo-quiet">Same answer as run {first.runId}.</p>}
              </div>
              {shown > 0 && <p className="demo-quiet">Typed out by hand again. Same words as before.</p>}
            </div>
          )}

          {step === 3 && (
            <div key="offer" className="demo-offer demo-in">
              <p className="demo-offer-title">You have run this {runs.length} times.</p>
              <p>Turn it into a skill? It keeps the prompt, the checks your past results failed, and what it cost.</p>
              <p className="demo-offer-actions">
                <button type="button" className="btn" onClick={() => go(4)}>Yes, build the skill</button>
                <button type="button" className="btn btn-quiet" onClick={() => go(0)}>Not now</button>
              </p>
            </div>
          )}

          {step === 4 && (
            <div key="file" className="demo-in">
              <p className="demo-label">skill.md, written from your {runs.length} sessions</p>
              <pre className="demo-file" tabIndex={0} aria-label="The skill file">
                {lines.map((l, i) => <span key={i} style={{ animationDelay: `${Math.min(i * 90, 2600)}ms` }} className={l.startsWith("#") ? "h" : undefined}>{l || " "}{"\n"}</span>)}
              </pre>
              <p className="demo-quiet">Plain Markdown, so anyone can read and edit it.</p>
            </div>
          )}

          {step === 5 && (
            <div key="call" className="demo-in">
              <p className="demo-label">Next time</p>
              <div className="demo-composer"><span className="demo-typed">{command}</span><i aria-hidden="true" /></div>
              <div className="demo-suggest">
                <b>{name}</b>
                <span>Your skill. {checks} checks run on the result. Past runs cost {cost} credits.</span>
              </div>
              <p className="demo-quiet">One command in place of retyping the prompt.</p>
            </div>
          )}
        </div>
      </div>

      <div className="demo-controls">
        <button type="button" className="btn btn-quiet" onClick={() => (playing ? setPlaying(false) : step === last ? replay() : setPlaying(true))}>
          {playing ? "Pause" : step === last ? "Replay" : "Play"}
        </button>
        <p className="small">
          The three sessions, their credits and the price each one reported are recorded. The offer, the one-click build and the slash command are my proposal, shown as an illustration.
        </p>
      </div>
    </div>
  );
}
