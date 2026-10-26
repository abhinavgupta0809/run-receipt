"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DeviceFrame } from "../device";
import AnswerView from "./answer";

export type DemoSession = { label: string; when: string; steps: number; did: string[] };
export type DemoRun = { apps: string; text: string; seconds: number; cost: string; pages: number; ranOn: string };

const STEPS = ["Price two apps", "Price two others", "Get asked", "Skill is written", "Use it on new apps", "Real answer"] as const;
const HOLD = [3400, 3400, 3800, 5200, 3600, 6500]; // ms each step stays up during autoplay

// The proposal as a moving picture: two recorded pricing sessions on different apps, the offer, the general
// skill, then a real run on apps the sessions never touched. Everything but the offer was recorded or run for real.
export default function Demo({ sessions, changed, file, name, command, inputs, checks, run }: {
  sessions: DemoSession[];
  changed: { what: string; values: string[] };
  file: string;
  name: string;
  command: string;
  inputs: string[];
  checks: number;
  run: DemoRun;
}) {
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
  const shown = Math.min(step, sessions.length - 1);
  const session = sessions[shown];
  const lines = file.split("\n");

  return (
    <div className="sk-demo" ref={root}>
      <DeviceFrame>
        <div className="rr-window sk-window">
          <div className="rr-bar" aria-hidden="true"><span className="lights"><span /><span /><span /></span><span className="title">Computer · Sessions</span><span className="rr-tag">Prototype</span></div>
          <div className="demo-window" aria-live="polite">
            <aside className="demo-side">
              <p className="demo-label">Your sessions</p>
              <ul>
                {sessions.slice(0, shown + 1).map((s, i) => (
                  <li key={s.label} className={i === shown && step < 2 ? "demo-in now" : "demo-in"}>
                    <b>Pricing analysis</b>
                    <span>{s.label}</span>
                    <span>{s.when} · {s.steps} steps</span>
                  </li>
                ))}
              </ul>
              {step >= 3 && (
                <>
                  <p className="demo-label">Your skills</p>
                  <ul><li className="demo-in skill"><b>{name}</b><span>{command}</span></li></ul>
                </>
              )}
            </aside>

            <div className="demo-main">
              {step < 2 && (
                <div key={`session-${shown}`} className="demo-in">
                  <p className="demo-label">Session {shown + 1} of {sessions.length} · recorded {session.when}</p>
                  <p className="demo-prompt">Pricing analysis: {session.label}, monthly vs yearly billing</p>
                  <ol className="demo-did">
                    {session.did.map((d, i) => <li key={i} style={{ animationDelay: `${300 + i * 260}ms` }}>{d}</li>)}
                  </ol>
                  {shown > 0 && <p className="demo-quiet">Same method as session 1. Different apps.</p>}
                </div>
              )}

              {step === 2 && (
                <div key="offer" className="demo-offer demo-in">
                  <p className="demo-offer-title">You&apos;ve done a pricing analysis twice, on different apps.</p>
                  <p>Save the method as a skill? What changed between your sessions becomes an input, so it works on any app.</p>
                  <p className="demo-changed"><span>{changed.values.join("  →  ")}</span><b>becomes the input “products”</b></p>
                  <p className="demo-offer-actions">
                    <button type="button" className="btn" onClick={() => go(3)}>Yes, build the skill</button>
                    <button type="button" className="btn btn-quiet" onClick={() => go(0)}>Not now</button>
                  </p>
                </div>
              )}

              {step === 3 && (
                <div key="file" className="demo-in">
                  <p className="demo-label">SKILL.md, written from your {sessions.length} sessions</p>
                  <pre className="demo-file" tabIndex={0} aria-label="The skill file">
                    {lines.map((l, i) => <span key={i} style={{ animationDelay: `${Math.min(i * 70, 2600)}ms` }} className={l.startsWith("#") ? "h" : undefined}>{l || " "}{"\n"}</span>)}
                  </pre>
                  <p className="demo-quiet">No app names in the steps. They only show up as examples.</p>
                </div>
              )}

              {step === 4 && (
                <div key="call" className="demo-in">
                  <p className="demo-label">Next time, on apps you never recorded</p>
                  <div className="demo-composer"><span className="demo-typed" style={{ "--typed": `${command.length}ch` } as CSSProperties}>{command}</span><i aria-hidden="true" /></div>
                  <p className="demo-chips" aria-label="Input: products"><span>products</span>{run.apps.split(", ").map((a) => <b key={a}>{a}</b>)}</p>
                  <div className="demo-suggest">
                    <b>{name}</b>
                    <span>Your skill. Inputs: {inputs.join(", ")}. {checks} checks before it answers.</span>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div key="answer" className="demo-in">
                  <p className="demo-label">Perplexity&apos;s answer, run for real on {run.ranOn}</p>
                  <AnswerView text={run.text} className="demo-answer" />
                  <p className="demo-quiet">{run.seconds} s · {run.cost} · {run.pages} pages read · Agent API with the saved skill</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DeviceFrame>
      <aside className="rr-side">
        <div className="side-block">
          <h3>Steps</h3>
          <ol className="demo-steps" aria-label="Steps in the demo">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined}>
                  <span>{i < step ? "✓" : i + 1}</span>{s}
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => (playing ? setPlaying(false) : step === last ? replay() : setPlaying(true))}>
            {playing ? "Pause" : step === last ? "Replay" : "Play"}
          </button>
        </div>
        <p className="side-note">Real: the two sessions, the skill and the answer, recorded with my extension and run on Perplexity&apos;s Agent API. My proposal: the offer inside Computer.</p>
      </aside>
    </div>
  );
}
