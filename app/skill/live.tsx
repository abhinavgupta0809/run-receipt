"use client";

import { useEffect, useState } from "react";
import AnswerView from "./answer";

type Result = { question: string; model: string; text: string; citations: { url: string; title?: string }[]; searched: { url: string; title?: string }[]; costUsd: number | null; seconds: number };

const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

// Runs the saved skill for real. The passcode keeps strangers from spending my API credit.
export default function LiveRun({ example, skill }: { example: string; skill: string }) {
  const [question, setQuestion] = useState(example);
  const [passcode, setPasscode] = useState("");
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state !== "running") return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setState("running");
    setElapsed(0);
    setError("");
    try {
      const res = await fetch("/api/skill-run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, passcode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data as Result);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  // One link per site, so a run that read three Canva pages doesn't list canva.com three times.
  const sources = result ? (result.citations.length ? result.citations : result.searched).filter((c, i, all) => all.findIndex((x) => host(x.url) === host(c.url)) === i).slice(0, 8) : [];

  return (
    <div className="lv-live">
      <form onSubmit={run} className="lv-form">
        <label htmlFor="lv-q">Ask the skill about any apps</label>
        <textarea id="lv-q" value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} maxLength={300} />
        <div className="lv-form-row">
          <div>
            <label htmlFor="lv-pass">Passcode</label>
            <input id="lv-pass" type="password" autoComplete="off" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Ask me for one" />
          </div>
          <button type="submit" className="btn" disabled={state === "running" || !passcode}>
            {state === "running" ? `Running on Perplexity… ${elapsed}s` : `Run /${skill}`}
          </button>
        </div>
        <p className="lv-note">Each run calls Perplexity&apos;s Agent API with the saved skill and costs me about $0.04, so it needs a passcode. Runs take 30 to 90 seconds.</p>
      </form>
      <div aria-live="polite">
        {state === "error" && <p className="lv-error">{error}</p>}
        {state === "done" && result && (
          <div className="lv-result demo-in">
            <p className="lv-meta">
              <span>Live run</span><span>{result.seconds} s</span>{result.costUsd !== null && <span>${result.costUsd.toFixed(3)}</span>}<span>{result.model} via Perplexity&apos;s Agent API</span>
            </p>
            <AnswerView text={result.text} />
            {sources.length > 0 && (
              <p className="lv-sources">
                <b>{result.citations.length ? "Cited" : "Pages it read"}:</b>{" "}
                {sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noreferrer">{host(s.url)}</a></span>)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
