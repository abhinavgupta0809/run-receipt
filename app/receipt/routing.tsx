import { readFileSync } from "node:fs";
import path from "node:path";

type Step = { name: string; by: "person" | "code" | "cloud" | "local"; where: "mac" | "cloud"; what: string };
type Router = {
  steps: Step[];
  workers: { role: string; model: string }[];
  limits: { routerTimeoutSeconds: number; workerTimeoutSeconds: number; maxWorkerAttempts: number };
  broke: { what: string; status: string }[];
  issues: { logged: number; fixed: number; asOf: string };
  recordedRun: string;
  callerNote: string;
};

const BY = { person: "Me", code: "Code", cloud: "Cloud model", local: "Local model" } as const;

// Who decides what when a task is handed to a local model. Built from data/router.json.
export default function Routing() {
  const r = JSON.parse(readFileSync(path.join(process.cwd(), "data", "router.json"), "utf8")) as Router;
  return (
    <section className="rt" aria-labelledby="routing">
      <h2 id="routing" className="sum-h2">How my own router decides</h2>
      <p className="sk-intro">
        The local step in this prototype runs through a small gateway I built. Seven decisions sit between a task and an answer. One is made by me, one by a cloud model, one by a local model, and four by plain code.
      </p>

      <ul className="rt-key" aria-label="Who decides">
        {(Object.keys(BY) as (keyof typeof BY)[]).map((k) => <li key={k}><span className={`rt-by ${k}`}>{BY[k]}</span></li>)}
      </ul>

      <div className="rt-map">
        <p className="rt-lane-name cloud">Cloud <span>the routing model sees the task text only</span></p>
        <p className="rt-lane-name mac">On my Mac <span>the gateway, the checks and the models</span></p>
        <div className="rt-mac" aria-hidden="true" />
        <ol className="rt-steps">
          {r.steps.map((s, i) => (
            <li key={s.name} className={`rt-step ${s.where}`} style={{ gridColumn: i + 1 }}>
              <span className="rt-n">{i + 1}</span>
              <h3>{s.name}</h3>
              <span className={`rt-by ${s.by}`}>{BY[s.by]}</span>
              <span className="rt-where">{s.where === "cloud" ? "In the cloud" : "On my Mac"}</span>
              <p>{s.what}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rt-notes">
        <div>
          <h3>Fixed limits</h3>
          <ul>
            <li>The router gets <b>{r.limits.routerTimeoutSeconds} seconds</b> to answer before the fallback takes over.</li>
            <li>A worker gets <b>{r.limits.workerTimeoutSeconds} seconds</b>, and at most <b>{r.limits.maxWorkerAttempts} workers</b> are tried.</li>
            <li>Workers: {r.workers.map((w) => `${w.role} (${w.model})`).join(", ")}.</li>
          </ul>
        </div>
        <div>
          <h3>What broke</h3>
          <ul className="rt-broke">
            {r.broke.map((b) => <li key={b.what}><b>{b.what}</b> {b.status}</li>)}
          </ul>
          <p className="sum-source">{r.issues.logged} issues logged as of {r.issues.asOf}. {r.issues.fixed} fixed.</p>
        </div>
      </div>
      <p className="sum-note rt-honest">{r.recordedRun}</p>
      <p className="sum-note rt-honest">{r.callerNote}</p>
    </section>
  );
}
