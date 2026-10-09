"use client";

import { Bars } from "../charts";
import { credits, span } from "../format";
import { useMemo, useState } from "react";
import { checkSummary, ONE_PAGE_WORDS, renderTemplate, similarity, skillFile, template, type Disagreement } from "@/lib/skill.ts";
import type { Range } from "@/lib/estimate.ts";
import type { Check } from "@/lib/verify.ts";

type Session = { runId: string; when: string; credits: number; seconds: number | null; checks: Check[] };
type Coverage = { inAll: string[]; inSome: { plan: string; runIds: string[] }[] };

const OFFER_AT = 0.6; // share of words in common before a skill is offered
const usd = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

export default function Builder({
  prompt,
  variation,
  sessions,
  disagreements,
  coverage,
  cost,
}: {
  prompt: string;
  variation: string;
  sessions: Session[];
  disagreements: Disagreement[];
  coverage: Coverage;
  cost: Range;
}) {
  const [second, setSecond] = useState(prompt);
  const [names, setNames] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const summary = checkSummary(sessions);

  const match = useMemo(() => similarity(prompt, second), [prompt, second]);
  const segments = useMemo(() => template(prompt, second), [prompt, second]);
  const inputs = segments.filter((s) => s.kind === "input");
  const offered = match >= OFFER_AT;
  const isRealRepeat = second.trim() === prompt.trim();

  const addRule = (r: string) => setRules((rs) => (rs.includes(r) || !r.trim() ? rs : [...rs, r.trim()]));
  const checkNames = sessions[0].checks.map((c) => c.name);
  const outside = [...new Set(sessions.flatMap((s) => s.checks.filter((c) => c.name === "Uses only vendor sites as sources" && !c.passed).map((c) => c.detail.replace("also cites: ", ""))))];

  const suggestions: { key: string; finding: string; rule: string }[] = [
    ...disagreements.map((d) => ({
      key: d.plan + d.field,
      finding: `${d.plan}, billed ${d.field === "monthly" ? "monthly" : "annually"}: ${d.values.map((v) => `run ${v.runId} said ${usd(v.value)}`).join(", ")}.`,
      rule: "Show the month-to-month price and the annual price in separate columns, and say which is which.",
    })),
    ...(coverage.inSome.length
      ? [
          {
            key: "coverage",
            finding: `The runs listed different plans. All ${sessions.length} listed ${coverage.inAll.join(", ")}. Only some listed ${coverage.inSome.map((p) => p.plan).join(", ")}.`,
            rule: "List the lowest paid personal plan for each app I name. Put free and higher plans in a note, not in the table.",
          },
        ]
      : []),
    ...(outside.length
      ? [
          {
            key: "sources",
            finding: `All ${sessions.length} runs took at least one price from a site that is not the vendor's.`,
            rule: "Take prices from the vendor's own site. If a price is not shown there, say so and do not use another site.",
          },
        ]
      : []),
  ];

  const file = skillFile({
    name: "App price comparison",
    template: renderTemplate(segments, names),
    inputs: inputs.map((i) => (i.kind === "input" ? { name: names[i.name] ?? i.name, examples: [i.a, i.b] } : { name: "", examples: [] })),
    rules,
    checks: checkNames,
    cost: `${cost.min.toFixed(2)} to ${cost.max.toFixed(2)} credits, from ${cost.n} measured runs of this prompt.`,
  });

  return (
    <div className="report skill-report">
      <header className="report-head">
        <div>
          <p className="eyebrow">A working prototype / From sessions to instructions</p>
          <h2 data-builder-title>Session to Skill</h2>
          <p className="intro">After you do a task twice, turn the shared prompt, what changed and the checks on your past results into a skill.</p>
        </div>
        <div className="skill-context">
          <p>The same prompt, run {summary.sessions} times on my own Perplexity account in one day.</p>
          <p className="small mt-2">Standalone prototype. Plain code compares words and reads the recorded outputs. No model is called. Nothing connects to Perplexity.</p>
        </div>
      </header>
      <div className="stat-grid skill-stats">
        <Stat value={`${summary.sessions}`} label="Sessions compared" note="One prompt, one account, one day" />
        <Stat value={`${Math.round(match * 100)}%`} label="Words in common" note={isRealRepeat ? "The real repeat, word for word" : "Edited example, not a measured run"} />
        <Stat value={`${disagreements.length}`} label="Price disagreements" note="Across recorded outputs; not fact-checked" />
        <Stat value={`${summary.failed} of ${summary.total}`} label="Test cells failed" note="Handwritten checks on past outputs" />
        <Stat value={span(cost, credits)} label="Credits per run" note="Recorded range, not a forecast" />
      </div>
      <p className="small">The prompt match updates as you edit. The findings, checks and costs always describe the recorded runs.</p>
      <nav aria-label="On this page" className="small flex flex-wrap gap-x-5 gap-y-2 border-y border-rule py-3">
        <a href="#step-1">Compare prompts</a>
        {offered && <><a href="#step-3">Read the differences</a><a href="#step-5">Inspect the test</a><a href="#step-6">Copy the file</a></>}
      </nav>

      <Section n={1} title="You did this twice" meaning="Offer to save the task when the repeat gives the user a reason to keep it." limit="Matching uses word overlap, not meaning. Differently worded versions of the same task can be missed.">
        <div className="grid gap-3 sm:grid-cols-2 skill-prompts">
          <div className="rounded-lg border border-rule p-3 ">
            <p className="mb-1 text-xs text-ink2">
              First session, {sessions[0].when}, {sessions[0].credits.toFixed(2)} credits
            </p>
            <p className="text-sm leading-6">{prompt}</p>
          </div>
          <div className="rounded-lg border border-rule p-3 ">
            <label htmlFor="second" className="mb-1 block text-xs text-ink2">
              {isRealRepeat ? `Second session, ${sessions[1].when}, ${sessions[1].credits.toFixed(2)} credits` : "Second session (edited example, not a measured run)"}
            </label>
            <textarea
              id="second"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
              rows={5}
              className="w-full resize-y rounded border border-rule bg-transparent p-2 text-sm leading-6 "
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => setSecond(prompt)} aria-pressed={isRealRepeat} className={pill(isRealRepeat)}>
            My real repeat
          </button>
          <button onClick={() => setSecond(variation)} aria-pressed={second === variation} className={pill(second === variation)}>
            Try a variation
          </button>
          <span className="text-xs text-ink2">or edit the second prompt yourself</span>
        </div>
        <div className="insight neutral skill-offer">
          <p aria-live="polite"><strong>{Math.round(match * 100)}% of the words match.</strong>{" "}
            {offered ? "This looks like the same job done twice." : "Not similar enough to offer a skill. Try the real repeat or edit the prompt."}
          </p>
          {offered && <><a href="#step-2" className="btn mt-3">Save as a skill: review draft <span aria-hidden="true">→</span></a><p className="small mt-2">Review below, then copy the file to keep it. Nothing is saved to your account.</p></>}
        </div>
      </Section>

      {offered && (
        <>
          <Section n={2} title="Keep the shared words. Name what changed." meaning="Shared words become the fixed prompt. Each changed stretch becomes an input you can rename." limit="The real repeat is identical, so it has no inputs. Try a variation is an example, not a measured run.">
            <p className="rounded-lg border border-rule p-3 text-sm leading-7 ">
              {segments.map((s, i) =>
                s.kind === "text" ? (
                  <span key={i}>{/^[,.;:!?)]/.test(s.text) ? s.text : ` ${s.text}`}</span>
                ) : (
                  <span key={i}>
                    {" "}
                    <mark className="rounded bg-grid px-1.5 py-0.5 font-mono text-xs text-ink ">{`{{${names[s.name] ?? s.name}}}`}</mark>
                  </span>
                ),
              )}
            </p>
            {inputs.length === 0 ? (
              <p className="mt-3 text-sm text-ink2 ">
                No inputs found: the two prompts are word for word the same, so the draft keeps the original prompt. Press &ldquo;Try a variation&rdquo; to see what happens when
                something changes between the two runs.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {inputs.map(
                  (s) =>
                    s.kind === "input" && (
                      <li key={s.name} className="rounded-lg border border-rule p-3 text-sm ">
                        <label className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-ink2">Input name</span>
                          <input
                            value={names[s.name] ?? s.name}
                            onChange={(e) => setNames({ ...names, [s.name]: e.target.value.replace(/\s+/g, "_") })}
                            className="rounded border border-rule bg-transparent px-2 py-1 font-mono text-xs "
                          />
                        </label>
                        <p className="mt-2 text-xs text-ink2">Values from the prompt and edited example:</p>
                        <p className="mt-1">Recorded prompt: {s.a || "(nothing)"}</p>
                        <p>Edited example: {s.b || "(nothing)"}</p>
                      </li>
                    ),
                )}
              </ul>
            )}
          </Section>

          <Section n={3} title="The same prompt left choices unresolved" meaning="Compare past results to choose what the next run should do consistently." limit="Prices were not fact-checked. A disagreement does not tell us which price is right. These suggested rules were written by hand for this task; the prototype does not write rules for a new task.">
            <p className="mb-3 text-sm text-ink2 ">
              Same prompt, {sessions.length} recorded outputs. Review the suggested rules and keep the ones you want. A rule is a choice, not proof that the next answer will be right.
            </p>
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s.key} className="rounded-lg border border-rule p-3 text-sm ">
                  <p>{s.finding}</p>
                  <p className="mt-2 text-xs text-ink2">Suggested rule</p>
                  <p className="mt-0.5 italic">{s.rule}</p>
                  <button onClick={() => addRule(s.rule)} disabled={rules.includes(s.rule)} className="mt-2 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-40">
                    {rules.includes(s.rule) ? "Added" : "Make this a rule"}
                  </button>
                </li>
              ))}
            </ul>
            {!isRealRepeat && <p className="mt-3 text-xs text-ink2">These findings come from the {sessions.length} real runs of the first prompt, not from the edited second prompt.</p>}
          </Section>

          <Section n={4} title="Choose the instructions worth keeping" meaning="Your selected rules and anything you write go into the skill file." limit="Adding a rule does not rerun a session or create a new check. The test below stays fixed.">
            {rules.length === 0 ? (
              <p className="text-sm text-ink2 ">None yet. Add one from step 3 or write your own.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {rules.map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <span className="flex-1">{r}</span>
                    <button onClick={() => setRules(rules.filter((x) => x !== r))} className="text-xs underline underline-offset-4" aria-label={`Remove rule: ${r}`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addRule(draft);
                setDraft("");
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write your own rule"
                aria-label="Write your own rule"
                className="min-w-0 flex-1 rounded border border-rule bg-transparent px-2 py-1.5 text-sm "
              />
              <button className="rounded-md border border-rule px-3 py-1.5 text-sm font-medium ">Add</button>
            </form>
          </Section>

          <Section n={5} title="Your past outputs fail parts of the test" meaning="Use past sessions to see what a saved task needs to check before you trust its next result." limit={`These ${checkNames.length} checks were written by hand for this task. The prototype does not write checks for a new task. “One page” means at most ${ONE_PAGE_WORDS} words because markdown has no pages. Passing does not verify a price.`}>
            <p className="mb-3 text-sm text-ink2 ">
              These checks inspect the {sessions.length} recorded outputs. They do not run the drafted skill or measure whether your new rules improve it.
            </p>
            <div className="insight neutral mb-5"><b>{summary.failed} of {summary.total} test cells failed.</b> Each cell is one check on one past output.</div>
            <p className="small mb-2">Scroll the table to compare every run on a narrow screen.</p>
            <div className="scroll-x" tabIndex={0} role="region" aria-label="Recorded output checks">
              <table className="data skill-test">
                <caption>Recorded outputs against the fixed checks</caption>
                <thead className="text-xs text-ink2">
                  <tr>
                    <th scope="col" className="py-1 font-normal">Check</th>
                    {sessions.map((s) => (
                      <th scope="col" key={s.runId} className="py-1 pl-3 font-normal">
                        Run {s.runId}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule ">
                  {checkNames.map((name, i) => (
                    <tr key={name} className="align-top">
                      <th scope="row" className="skill-check-name">{name}</th>
                      {sessions.map((s) => (
                        <td key={s.runId} className="py-1.5 pl-3">
                          <span className={`stamp ${s.checks[i].passed ? "stamp-pass" : "stamp-fail"}`}>
                            <span aria-hidden="true">{s.checks[i].passed ? "✓ " : "× "}</span>{s.checks[i].passed ? "PASSED" : "FAILED"}
                          </span>
                          <span className="block text-xs text-ink2">{s.checks[i].detail}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section n={6} title="Keep the prompt, rules and test together" meaning="Copy a file you can review and reuse, with the recorded cost range beside it." limit="The file layout is my own, not Perplexity's skill format. The cost range is from the original prompt, not a forecast for your edits. This draft is not saved after a reload.">
            <p className="mb-3 text-sm text-ink2 ">
              Recorded cost for the original prompt: {cost.min.toFixed(2)} to {cost.max.toFixed(2)} credits across {cost.n} runs of this prompt.
            </p>
            <figure className="chart-card skill-cost mb-5">
              <div className="card-heading"><h3>Same prompt. Different charges.</h3></div>
              <div className="chart-body"><Bars label="Recorded pricing prompt runs" unit="credits" rows={sessions.map((s) => ({ name: `Run ${s.runId}`, value: s.credits }))} /></div>
              <figcaption>One bar per recorded run. One prompt, one account, one day.</figcaption>
            </figure>
            <pre className="skill-file rounded-lg border border-rule p-4 font-mono text-xs leading-5" tabIndex={0} aria-label="Skill file text">{file}</pre>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(file);
                  setCopiedFile(file);
                  setCopyError(false);
                } catch {
                  setCopiedFile(null);
                  setCopyError(true);
                }
              }}
              className="mt-3 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper"
            >
              {copiedFile === file ? "Copied" : "Copy skill file"}
            </button>
            <p className="small mt-3" role="status">{copyError ? "Copy was blocked. Select the file text above and copy it manually." : copiedFile === file ? "Copied to your clipboard." : "Copy the file to keep your draft."}</p>
          </Section>
        </>
      )}
    </div>
  );
}

const pill = (on: boolean) => `rounded-full border px-3 py-1 font-medium ${on ? "border-ink bg-ink text-paper" : "border-rule "}`;

function Section({ n, title, children, meaning, limit }: { n: number; title: string; children: React.ReactNode; meaning: string; limit: string }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <header className="exhibit-title neutral">
        <p className="eyebrow">Step {n} / Session to Skill</p>
        <h2 id={`step-${n}`} tabIndex={-1}>{title}</h2>
      </header>
      <div className="evidence-block">
        <div className="evidence-main">{children}</div>
        <aside className="evidence-notes">
          <h3 className="eyebrow">What it means</h3><p>{meaning}</p>
          <h3 className="eyebrow">Limit</h3><p>{limit}</p>
        </aside>
      </div>
    </section>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return <div className="stat neutral"><strong>{value}</strong><h2>{label}</h2><p>{note}</p></div>;
}
