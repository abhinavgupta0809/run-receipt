import { blocks, type Inline } from "@/lib/answermd.ts";

// Renders an agent answer from lib/answermd blocks. Used by the demo, the replayed run and the live run.

function Parts({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "bold" ? <b key={i}>{p.text}</b> : p.kind === "link" ? <a key={i} href={p.href} target="_blank" rel="noreferrer">{p.text}</a> : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

export default function AnswerView({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`lv-answer${className ? ` ${className}` : ""}`}>
      {blocks(text).map((b, i) =>
        b.kind === "p" ? (
          <p key={i}><Parts parts={b.parts} /></p>
        ) : b.kind === "list" ? (
          <ul key={i}>{b.items.map((it, j) => <li key={j}><Parts parts={it} /></li>)}</ul>
        ) : (
          <div key={i} className="lv-table" tabIndex={0} role="region" aria-label="Answer table">
            <table>
              <thead><tr>{b.head.map((c, j) => <th key={j} scope="col"><Parts parts={c} /></th>)}</tr></thead>
              <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Parts parts={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}
