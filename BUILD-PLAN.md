# Run Receipt: build plan

Prototype for the Perplexity PM applications. Design: `job-search-os/applications/perplexity-pm-2026-10/prototype-1-design.md`.
Standalone; does not hook into Perplexity's product. Credit figures come from measured runs (`data/runs.json`).

## Done (2026-10-03)
- Next.js 16 scaffold (Tailwind, App Router). Read `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).
- `lib/verify.ts`: deterministic checks: every row has one category, only allowed categories, income vs refund, category totals add up to the file, model-reported totals vs recomputed, duplicate finder.
- `tests/verify.test.ts`: 6 tests pass (`npm test`), including **catching the real Hybrid run's totals (1 of 6 right)**.

## Done (2026-10-08)
- **Replay mode (the hosted default):** `app/page.tsx` builds the page at build time from `data/`; `app/replay.tsx` is the three moments (plan, live meter with "provisional" then "final", receipt). Static page, no keys, works with the Mac off.
- `lib/estimate.ts`: credit, time and panel-undercount ranges as min and max of measured runs, plus the cloud-over-Hybrid gap used for the rerun offer.
- `lib/answerKey.ts`: answer key and label-accuracy eval. `lib/replay.ts`: grades the recorded reports with the checker.
- `data/runs.json` now has runs 1 and 2; `data/recordings.json` holds the totals each recorded report stated; the router output of 2026-10-03 is copied into `data/`.
- **12 tests pass** (`npm test`), `npm run build` and `npm run lint` are clean. Clicked through both replays in headless Chromium: no console errors, no sideways scroll at 390 px.
- Finding from the label eval: the router run passes all 4 structural checks, yet 2 of 40 rows are mislabelled (T-Mobile; Equinox is a judgement call), so 5 of 8 totals match the strict key. The older note said only T-Mobile.

## Done (2026-10-08, evening): all measured runs fed in
- `data/runs.json` now holds all **26 runs** (23 planned plus the 3 early tests) across 11 task types, copied from `Run Test Kit/runs.csv`. New fields: `surface` (web), `effort` (standard, high), `ranLocal`. `panelAtFinish` and `seconds` are `null` where the reading was not captured.
- `lib/summary.ts`: one row per task and setting, plus headline counts. Runs are never pooled across Mac and web, effort levels, or whether a local step ran. `lib/estimate.ts` handles missing readings and keeps web runs out of the Mac estimate.
- The page has a new section, "The measured runs behind these numbers": 4 headline figures and the full table.
- **15 tests pass**, build and lint clean, page checked in headless Chromium (no console errors, no sideways scroll at 390 px).
- The run finals add up to 681.83 credits; Perplexity Analytics showed 681.84 for the cycle.
- Known limit: a row's "Runs" count is the number of runs, but its time or panel range can rest on fewer (run 10 has neither reading).

## Done (2026-10-08, late): Excel budget replay (runs 11 and 22)
- The page has a **task switch**: Bank report or Excel budget. Each has its own plan steps, meter and receipt.
- `lib/sheet.ts`: checks a spreadsheet a run produced against the source file, row by row, with **no answer key**: rows present, dates, amounts, descriptions, net on the summary, formulas, chart, duplicate flag.
- `data/recordings-budget.json`: every row of both delivered spreadsheets, read out of the `.xlsx` files.
- Hybrid run 22: 0 of 40 rows complete, 4 of 8 checks failed, net shows -$1,291.26 against +$873.74. The receipt offers "Fill them in here, on this Mac only", which restores the 3 amounts and 40 dates for 0 credits and shows the summary before and after.
- Cloud run 11: 40 of 40 rows complete, all 8 checks passed.
- Run 24 (a timed cloud repeat of run 11, 12.63 credits, 32 s) is in `data/runs.json`, so the cloud estimate for this task now rests on 2 runs. The replay still shows run 11.
- **18 tests pass**, build and lint clean, both tasks clicked through in headless Chromium in both modes.
- Limit: the "fill in" is computed from the test file bundled with the page; nothing runs on the viewer's machine. The page says so.

## Done (2026-10-08, night): Prototype 2, Session to Skill, at `/skill`
- Idea: a user only knows a task is worth saving after doing it twice, so the offer to save comes at the second run and the skill is built from the two runs.
- `lib/skill.ts` (plain code, no model): prompt similarity, a template with inputs taken from what changed between two prompts, price-table reading, disagreements and plan coverage across runs, output checks, and the skill file text.
- Data: three real sessions of the same pricing prompt (runs 7, 15, 16), outputs copied unchanged into `data/skill/`.
- Page steps: you did this twice, the drafted skill, where the runs disagreed (each with a one-click rule), rules, the test run against the three outputs, the skill file with a copy button.
- Real findings it surfaces: Notion Plus monthly was $10 in run 7 and $12 in runs 15 and 16; all 3 runs cited a non-vendor site; run 16 gave no check date; cost 12.14 to 21.96 credits.
- Tests pass, build and lint clean, clicked through in headless Chromium (real repeat, a variation, an unrelated prompt, phone width).
- Limits: the "variation" prompt is an example, not a measured run. The checks and suggested rules are written for this one task; the prototype does not write them for a new task. Session matching is word overlap, not meaning. The skill file layout is not Perplexity's format.

## Done (2026-10-08, late night): two-tab redesign
- `/` is the case study, `/receipt` is the prototype (was `/`). `/skill` is untouched and still linked from `/receipt`.
- New: `lib/study.ts` (paired runs, panel readings, tallies), `data/gate.json` (Privacy Gate status per run, copied from `runs.csv`), `tests/study.test.ts`, `app/charts.tsx`, `app/data.ts`, `app/format.ts`, `app/tabs.tsx`, six cropped screenshots in `public/evidence/`, self-hosted fonts in `app/fonts/`.
- No change to existing `lib/` logic or `data/` values. 29 tests pass, build and lint clean, both tabs clicked through in headless Chrome at 1440 and 390 px, light and dark.
- Notes, open questions and data oddities: `REDESIGN-NOTES.md`. Design record: `DESIGN.md`. Product facts: `PRODUCT.md`.

## Not built yet, and limits of the replay
- Per-step credits are not shown because Perplexity exposes only a per-run total. The step list is the prototype's own plan.
- The rerun offer's cost is the measured cloud-minus-Hybrid gap (2 runs each), not a measured single-step rerun.
- No budget cap. No live mode. Two tasks have a replay (bank report, Excel budget); the other nine appear in the measured-runs table only.

## Next milestones
1. **Engine API routes**
   - `/api/plan`: LLM call that turns a task into steps.
   - `/api/route`: Perplexity Decisions API (`pplx-decider-v1-27b`) scores each step (needs web? private? arithmetic?).
   - `/api/local`: calls the local worker through the `local-agents-mcp` gateway (mcp.ag-mcp.xyz, bearer token from env, never committed).
2. **Estimator:** done for measured ranges 2026-10-08. `lib/estimate.ts` gives credit and time ranges per task type from `data/runs.json` (filled from the 20-run measurement plan).
3. **UI:** Run Plan card (routes, ranges, check badges, cap, flip a step), live meter ("provisional" until final), Receipt (final credits, saved-by-local, time added, checks, rerun-in-cloud offer, withheld values shown locally).
4. **Demo mode:** done 2026-10-08 (see above). Add more task types as the measurement runs come in.
5. **Deploy:** Vercel; keys in Vercel env vars only.

## Secrets
Perplexity API key, Anthropic key, and gateway token go in `.env.local` (gitignored by the Next scaffold) and in Vercel env vars. Never in code or commits.

## Done (2026-10-08): Session to Skill report pass

- Added the Session to Skill tab and removed the named receipt text link. Built the `/skill` header, five data-backed tiles, six exhibit sections with adjacent limits, save-to-draft action, marked test grid and recorded-credit bars using existing components and tokens.
- Preserved prompt editing, real repeat, example variation, input renaming, rule controls and file copying. Copy now reports failure and compares the copied text with the current file before showing Copied.
- Added and tested `checkSummary` without changing existing parsing, matching, checking or file-generation logic. Data files are unchanged.
- `npm test`: 30 passed, 0 failed. Lint, TypeScript and Webpack production build passed. Removed `.next` after verification as instructed. Default Turbopack and browser checks remain for the follow-up session.
- Full report, copy review, self-critique and four deferred decisions: top section of `REDESIGN-NOTES.md`. No commit, push or deployment.
