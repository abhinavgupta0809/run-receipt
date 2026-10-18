# One-minute template, 2026-10-17 (Claude Code)

Abhinav asked for the template used on the Wispr Flow prototypes site: problem, solution with a Desktop/Phone toggle, metrics (north star, guardrails, supporting), trade-offs, research folded at the bottom. "Completely change and deploy."

- **Tabs are now Run Receipt (`/`), Session to Skill (`/skill`), Evidence (`/evidence`).** `/receipt` is gone as a page; `next.config.ts` redirects it to `/#solution` (307).
- **`/`** leads with the problem (the same-prompt 12.14 / 14.29 / 21.96 line, three coloured proof figures, one review quote), then the prototype, then three metric cards, three trade-off cards, and six folds holding the old sections (three problems with charts, what users say, the full metric table, what it could be worth, the film, limits). The animated hero receipt is removed (`app/hero-moments.tsx` deleted).
- **The prototype is one app window** (`app/receipt/replay.tsx`): three moment tabs (Before you send, While it runs, After), a Send button, auto-advance to After 1.6 s after the charge settles, and a side panel with steps, task and mode switches and Reset. It no longer auto-plays on scroll. The wide 12.14 to 21.96 range is a one-line "Why a range" under the Before view; the main range is the replayed run's own.
- **`/skill`** follows the same template; the demo sits in the same window and frame, its six steps moved into the side panel.
- **Desktop / Phone:** `app/device.tsx`; the choice is saved as `run-receipt-device` and applied before paint by the head script (`html[data-device]`). Phone mode uses container queries to stack the window.
- **New copy, for Abhinav to approve:** the problem lines, the metrics headlines, the trade-off cards on both pages, and the Session to Skill metrics. Those metrics (skills run again, offers turned down, a failed check never shown unflagged, offers accepted, slash-command share) are new proposals with no baseline.
- **Verified:** build, lint, 34 of 34 tests. In headless Chrome on the production build: Send to After works with the verdict revealed, phone mode on both pages, light theme, no sideways scroll at 390 on all four routes, no console errors. Not checked: Safari, Firefox, a real phone, a screen reader.

# Third design review, 2026-10-09 (Claude Code)

Branch `design-review-3`. Not committed, not pushed, not deployed. Abhinav asked for every finding from the third review (designer-reviewer brief with the Impeccable, Emil Kowalski and taste skills as lenses) to be built and shown locally.

## What changed

- **Phone first screen.** The header is one row (brand, dashboard link, an icon-only Theme switch) plus the tabs: 117px, was 213px. The tagline and the LinkedIn, GitHub and Email links are hidden under 700px; LinkedIn and GitHub are now in the footer beside the email. The receipt sits above the byline on a phone.
- **Header.** Brand, tabs and page content share one left edge (176px at 1440). Tabs are grey; the current one is ink with a teal underline.
- **Hero.** The lede lost its first sentence, which repeated the headline. The receipt now plays once when it is in view: 9.13 PROVISIONAL holds, counts to 11.87, the chip becomes FINAL, then CAUGHT lands (`app/hero-moments.tsx`). Without scripts it shows the provisional reading as before; with reduced motion it shows the settled state.
- **Users say it too.** The three tiles are 202, 159 and 68. The corpus counts (14,791, 5,115, 1,059) moved into the source line. The dashboard card is solid and teal-tinted when `dashboardUrl` is set; the dashed style is kept for the unpublished case.
- **How I worked** moved from `/` to a fold on `/evidence` ("How I got to this problem, in five steps").
- **Metrics table.** On a phone each metric is a stacked block with "How it is counted" and "The decision it controls" labelled, so the third column is no longer off screen.
- **Evidence.** The bar and column charts animate (they had lost their motion classes in the five-chart rebuild). The baseline of the cost bars is tinted orange and the meter columns are blue; red and green stay the verdict. Two subtitles changed to match ("The first part of each bar is the cheapest run", "Blue is what the panel showed").
- **Chart motion** plays once (no replay on re-entry), bars 0.8s, dots stagger 20ms and start at 60% scale. Empty dots use `--ink2` so they can be seen.
- **Prototype.** Replay 3.5s (was 6s), settle 1.2s (was 2.2s). The big figure and the progress bar are blue while provisional and turn ink at final; the figure is in the reading face so it no longer reads "11 . 87". FINAL fades in. The After verdict is dimmed with its chip hidden until a run has settled once, then the chip fades in. The After section also starts the replay if it is seen first. The receipt runs to the section rule.
- **Session to Skill.** "The solution" band is gone; its title is now the demo's heading. The demo window opens at the top.
- **Small things.** Problem-card figures stay on one line; the path rule stops at the last step; press feedback on switches and demo steps.

## Explainer video on `/`, a trial (same day)

Abhinav asked to see the 24.5 second explainer embedded on the front page. It sits between the hero and "Three problems, measured" as "The study in under half a minute": a plain `<video>` with controls, no autoplay, poster `public/video/run-receipt-explainer.jpg`, file `public/video/run-receipt-explainer.mp4` (1.8 MB). Source and rebuild steps are in PM-OS at `inbox/run-receipt-brag/`. He has not decided whether it stays.

- The video's numbers are typed into its frames, which breaks the rule that every figure comes from `data/` through `lib/`. The caption says so. Re-render it if the data changes.
- It adds about 720px to the page at 1440 and about 420px at 390. At phone width the text inside the frame is small; it needs full screen to read.
- Checked in headless Chrome: loads, plays, 960 by 540 at desktop on the content's left edge, no sideways scroll at 390, no console errors, dark and light.

## Header, Skill colour and the cost example (same day, at Abhinav's request)

- **Header.** "Run Receipt" is larger (32px, was 19px). The dashboard link and Theme sit on the same row at the right; the link now reads "Perplexity reviews dashboard". The byline is on the line below the name, and LinkedIn, GitHub and Email on the line below that. Header is 170px at desktop. On a phone the dashboard link wraps under the name and the three links stay hidden (they are in the footer): 174px.
- **Session to Skill colour.** Unchanged in the end. I tried the brand teal, then a mint green; he disliked both and asked for the original purple back (`#a394ff` dark, `#5b49c9` light). He still finds the purple a poor match for the teal, so this is open.
- **Cost example.** He said 11.77 to 11.87 credits is too small a range to show the problem. The prototype's "Before you send" view now leads with the prompt whose repeat runs moved the most on one setting (12.14 to 21.96 credits, 29 s to 48 s, 3 runs), picked by `widestRepeatRuns` and `estimate`, with its prompt text from `data/skill/sessions.json`. The bank report run that is replayed keeps its own narrow range underneath, labelled as narrow. The home page's "Before you send" proof uses the same wide range.
- **Still shows 11.77 to 11.87:** the hero receipt on `/` and the explainer video. Both are the receipt of recorded run 2, and that is run 2's real range, so swapping in another prompt's range there would mix two runs on one receipt. His call.

## Metrics with numbers, and "What it could be worth" (same day, a draft for Abhinav to read)

He asked for the success metrics to be more number-centric and for a business case, shown locally before deciding. Nothing here is approved.

- **Metrics table** has two new columns: "In my runs" (a baseline from the 27 runs) and "Starting bar" (my proposal). New row: Range width, the counter-metric to hit rate.
- **New numbers, all through `lib/study.ts` with tests (34 pass):** `rangeBacktest` (a range from the other runs of the same prompt and setting held the next run in 2 of 12; widened 20% at each end, 11 of 12; median width 7% and 49%) and `medianGapCredits` (2.64). The bars live in `PROPOSED` in the same file and are proposals, not measurements: 80% hit rate, 20% widening, width under 50%, meter gap under 2%, runs sent no more than 5% lower.
- **"What it could be worth"** sits after the metrics: three per-run sums at the protocol rate of $0.01 a credit ($0.10, $0.03, $2.21 against $0.57), three levers with the inputs only Perplexity has, a break-even line, and a plain statement that I cannot size it.
- **Plan prices** ($20 Pro, $200 Max) are in `data/business.json`. They come from third-party pricing guides found by web search on Oct 9, 2026, not from Perplexity's own plans page, and the page says so. Re-check on Perplexity's site before this ships.
- The 12 backtest runs come from five prompts, so the 2 of 12 and 11 of 12 are counts on a very small sample, and the 20% widening was chosen after seeing the data. Say so if asked; a holdout it has not.
- The home page is longer again: about 9,350px at phone width with the video and this section.

## Verified

`.next` deleted, then build, lint, `tsc` and 32 of 32 tests pass. In headless Chrome on the local build, with motion on:
- Hero: fresh load and arriving by a tab click both go wait, final, caught. Reduced motion shows the settled state.
- Evidence by tab click: bars and columns play; leaving and returning does not replay them.
- Prototype: fresh load and by tab click reach final with the verdict revealed; switching task does not hide the verdict again.
- No sideways scroll at 390 on any of the four tabs; no console errors.
- Looked at: home, prototype After view and the meter chart at 1440 dark; home research and fix sections in light; home first screen, receipt and metrics at 390 dark.

## Not done, and not checked

- Hover styles are still not gated behind `@media (hover:hover)`. Colour-only, so low impact.
- `DESIGN.md` is still out of date.
- Not looked at after this pass: `/skill` and `/evidence` at phone width, `/skill` in light, the folded "How I got to this problem" steps. Not tested: Safari, Firefox, a real phone, a screen reader, a width under 360px.

## For Abhinav to approve

- The shorter lede: "The most expensive run cost 81% more than the cheapest, on the same setting. You can't budget for that, and 202 store reviews are from paying users who ran out of credits."
- New line on the hero receipt after it settles: "The panel showed 9.13 at Finished." and the label "Final charge".
- The 202 / 159 / 68 tiles and the longer source line.
- The two Evidence subtitles, and the fold title "How I got to this problem, in five steps".

# Draft: how the router decides, 2026-10-09 (Claude Code)

A draft section at the bottom of `/receipt`, "How my own router decides". Abhinav asked for it and has not approved the wording.

- Built from `data/router.json`, which I wrote from `~/Desktop/Projects/local-agents-mcp` (README, `config/agents.json`, `ISSUES.md` dated 2026-10-03) and from `local-run-log.md` in job-search-os. Component: `app/receipt/routing.tsx`.
- Seven decisions, each tagged with who makes it (me, code, a cloud model, a local model), drawn in two lanes: cloud and the Mac. Then the fixed limits and four things that broke.
- Two honesty notes are on the page: the recorded bank run bypassed the routing step after the routed attempt hung for 593 seconds, and the caller is Claude Code, so the hand-off content has already been seen by a cloud assistant.
- Not verified: I did not rerun the router or its tests (the repo's virtual environment has no pytest and `uv` was not on my path). The issue log is six days old. Check the limits and the worker list against the running gateway before this ships.
- Verified: lint, `tsc`, build, no console errors, no sideways scroll on `/receipt` in both themes at 1440 and 390. Looked at the section at desktop width in both themes, not at phone width.

# Themes, chart rebuild and text hierarchy, 2026-10-09 (Claude Code)

Not committed, not pushed, not deployed. Backup before this pass: `.impeccable/backup/before-theme-chartjs-pass-2026-10-09.tgz`.

## What changed

- **Light theme**, with a Theme switch in the header. Dark stays the default; the choice is remembered. Tokens match the reviews dashboard (cream page, near-black text; charcoal page in dark).
- **Charts rebuilt the way the reviews dashboard builds them**: Chart.js 4.4.1 on a canvas, colours read from CSS tokens at draw time, mono tick labels, a shared tooltip on hover, and a "View as table" button on every chart. Rebuilt: the run bars, the meter columns, the Hybrid ring, the cloud-against-Hybrid lines and the panel slope lines (`app/chartjs.tsx`, used through `app/charts.tsx`). Charts draw when they scroll into view, replay when they come back, and redraw on a theme switch. The dot counts, the readings table and the small bars on `/` stay as they were.
- **Text hierarchy**: page and section headings and links in the brand teal; headings inside cards, figures and bold text in the strongest ink; running text one step softer; labels and captions softer again; source and limit lines softest. Roles are documented at the top of `app/globals.css`.
- **Header**: LinkedIn, GitHub and Email links, plus a "Reviews dashboard: link coming" slot that becomes a link when `dashboardUrl` is set in `data/research.json`.
- Finding colours for light theme (`#b87700`, `#2a78d6`, `#12936a`) pass the dataviz palette validator on the cream surface.
- New dependency: `chart.js@4.4.1`.

## Verified

- 32 tests pass, lint and `tsc` clean, default build passes, no hydration errors on the four routes.
- `.impeccable/review/qa-theme.mjs`: all four routes in dark and light at 1440 and 390 have no sideways scroll and no console errors; all 8 charts on `/evidence` draw in both themes; the Theme switch flips; "View as table" shows 25 rows for the meter chart and returns to the chart.
- Looked at light-theme screenshots of `/`, `/evidence` and `/receipt`, and dark-theme screenshots of the `/evidence` charts, after the charts had finished animating (`qa-view.mjs`).
- Not looked at: `/skill` in light theme, phone-width screenshots in light theme, hover tooltips. Not tested: Safari, Firefox, a real phone, a screen reader.

## For Abhinav

- The heading colour is the reviews dashboard's teal (`#1a6f7a` light, `#4fb8c6` dark), so the two sites match. It is close to Perplexity's teal, not copied from their brand assets. `PRODUCT.md` says no imitation of Perplexity's brand; a heading colour alone does not cross that, but it is your call.
- Full-page screenshots catch the charts mid-animation, because they replay on re-entry. Use `qa-view.mjs`, which scrolls to a chart and waits.

# Research now comes from the reviews dashboard, 2026-10-09 (Claude Code)

- `data/research.json` is generated by `scripts/sync-research.mjs` from `~/Desktop/Projects/perplexity-reviews/site/data` (summary, insights, reviews). Rerun it after the dashboard data changes: `node scripts/sync-research.mjs`. It fails if a quoted excerpt is not word for word in the stored review.
- "What users say" on `/` now shows 14,791 reviews, 5,115 substantive, 1,059 about credits, limits, pricing or billing, then the two credit clusters (202 and 68), four quotes with app version and UTC date, and the label check (117 of 120).
- New framing, needs Abhinav's approval: "This is not the largest complaint. Free question limits and upgrade prompts (507) and Wrong or invented answers (444) are bigger. Run Receipt is aimed at paying Computer users."
- The Reddit thread titles from the earlier memo are no longer shown, so the section has one source.
- Two quote dates moved by a day against the earlier memo (Aug 15 and Sep 7), because the dashboard stores UTC dates.
- The dashboard slot reads "Built, not yet published". Set `dashboardUrl` in `scripts/sync-research.mjs` output (or in the JSON) once it is hosted and the slot becomes a link.
- "A keyword search found no review about the meter reading low" rests on one regex search over the review text and translations (meter, usage panel, credits used, final charge and similar). It is not a labelled category.
- Verified: 32 tests pass, lint and `tsc` clean, default build passes, no hydration errors, no sideways scroll at 1440 or 390 for this section.

# Chart motion fix, 2026-10-09 (Claude Code)

Abhinav reported the motion graphs were not working. He was right.

- **Cause:** the motion only worked on a fresh page load. After arriving by a tab click, the previous page's observer armed the new page's charts and was then disconnected, so the charts stayed armed with nothing watching them. Bars, columns and dots were left collapsed at zero.
- **Fix (`app/motion.tsx`):** every chart is re-observed by the current page's observer, and anything still waiting is un-armed on cleanup so it falls back to fully drawn.
- **Also changed:** charts now replay each time they come back into view, and the animations run a little longer (1.3s for bars and columns, 1.5s for lines).
- **Verified** with `.impeccable/review/qa-motion.mjs` in headless Chrome: on a fresh load a bar measures 0, then about 0.55 of its width at 180ms, then full; after a tab click to `/evidence` the chart in view plays; scrolling away and back replays it. 32 tests pass, lint clean, no hydration errors.
- **My earlier check was too weak:** it only confirmed the charts reached the "played" state on a fresh load. It never tested tab navigation.
- Full-page screenshots taken without scrolling now show charts below the fold as collapsed, because they have not played yet. Use `qa-motion.mjs` or scroll first.

# Research, path and motion pass, 2026-10-09 (Claude Code)

Not committed, not pushed, not deployed. Backup before this pass: `.impeccable/backup/before-research-motion-pass-2026-10-09.tgz`.

## What changed

- **Intro**: the "in place of a cover letter" line is gone from `/` and `/evidence`. It now reads "I am a product manager with six years of experience, now studying at Carnegie Mellon University."
- **"How I got to this problem"** on `/`: five steps from reading reviews to building the fix.
- **"What users say"** on `/`: counts from 500 App Store reviews, four verbatim review quotes with stars, app version and date, two Reddit thread titles, and a reserved dashed slot for the reviews dashboard marked "In progress".
- The research lives in `data/research.json`, copied from `job-search-os/applications/perplexity-pm-2026-10/problem-statements-claude.md`. Only items that memo marks as re-checked are included. A test checks the file is consistent.
- **"Proposed success metrics"** is the new heading for the metrics table.
- **Motion on every chart** on `/`, `/evidence` and inside the skill builder: bars grow, columns rise, dots pop in one by one, slope lines draw. Each chart plays once when it scrolls into view (`app/motion.tsx`). Charts are fully drawn without JavaScript and under reduced motion.
- The skill file now says "The sessions used the same words" (was "The two sessions").

## Verified

- 32 of 32 tests pass. Lint and `tsc` clean. Default build passes from a clean `.next`. No hydration errors on the four routes.
- Headless Chrome: no sideways scroll at 1440 or 390 on `/`, `/evidence`, `/skill`; after scrolling each page every armed chart had played (the one chart inside the closed builder waits until it is opened); no console errors.
- Not tested: how the motion feels at real scroll speed, Safari, Firefox, a real phone, a screen reader.

## Check before this ships

- **"Nothing estimates the cost before you send"** may be contradicted. The research memo says Perplexity shipped Plan Previews on 05/04/26 and marks as Uncertain whether the preview shows a credit estimate. Confirm in the product, then keep or reword the claim on `/`, `/evidence` and `/receipt`.
- The quotes were re-checked on Oct 2, 2026 according to the memo. I copied them from the memo and did not open the App Store or Reddit again.
- The path section says I walked through Computer, Hybrid and Skills. `product-walkthrough.md` mentions all three; confirm the wording matches what you did.
- New copy to approve: the intro line, the five path steps, the research captions and the dashboard slot text.

# Summary pass, 2026-10-09 (Claude Code)

Not committed, not pushed, not deployed. Backup of the build before this pass: `.impeccable/backup/before-summary-pass-2026-10-09.tgz`.

Abhinav's feedback: the case study is too dense and nobody will read it; the design is too text-heavy, plain and muted; Session to Skill is not clear and should be the need, the solution, and a moving panel.

## What changed

- **`/` is now a two-minute PM summary**: the claim and one receipt, three problems (one figure, one visual, one sentence and one limit each), the fix at three moments, what I would measure, and what this cannot tell you. About 330 words.
- **`/evidence` is new** and holds the whole former case study unchanged apart from its title and opening line. It is the second tab.
- **`/skill` is rebuilt** as The need, The solution, and "Watch it happen": a six-step animated panel (three recorded sessions, the offer, the Markdown skill being written, the slash command). It plays when scrolled into view, each step is clickable, and it does not autoplay under reduced motion. The six-step working builder is still there, closed by default under "The working builder".
- **Design**: tinted colour panels per finding, large coloured figures, a three-colour rule as the site's signature, bigger serif headlines, dot-count visuals for small counts, and a violet accent that belongs to Session to Skill only.
- New tested helper `medianLowPct` in `lib/study.ts`. New `Dots` chart in `app/charts.tsx`.

## Verified

- 31 of 31 tests pass. Lint and `tsc` clean. Default build passes from a clean `.next`. No hydration errors on any of the four routes.
- Headless Chrome (`.impeccable/review/qa-shots.mjs`): no sideways scroll on `/`, `/evidence` or `/skill` at 1440 and 390; all six demo steps render; the builder opens; no console errors. `/receipt` click-through still passes (`qa-cdp.mjs`).
- Looked at the screenshots `new-*.png` in `.impeccable/review/`.
- Not tested: the demo's autoplay timing by eye in a real browser, keyboard-only use, Safari, Firefox, a real phone, a screen reader. `qa-skill.mjs` now needs the builder opened first and was not rerun.

## New copy that needs Abhinav's approval

- `/`: the section "What I would measure if Perplexity shipped it" (four proposed metrics and the decision each controls), and the limit "I have not interviewed Perplexity users, so how much these problems matter to them is still a hypothesis."
- `/skill`: everything under The need and The solution, the demo's offer text ("You have run this 3 times. Turn it into a skill?"), and the caption that separates recorded data from the proposal.

## Things that look off

- The skill file's Inputs line says "The two sessions used the same words" while the demo shows three sessions. The sentence comes from `lib/skill.ts` and I did not change it.
- The need section states two beliefs about users (people do not know which skill they need; writing one is hard for people outside AI). They are labelled as my read, with no user interviews behind them.
- Perplexity's own article on Skills is still unread. Read it before this ships.
- With four tabs, the tab labels wrap to two lines on a phone.

# Review of the Session to Skill pass, 2026-10-08 (Claude Code, after Codex)

Not committed, not pushed, not deployed.

- `npm test`: 30 of 30 pass. `npm run lint`: clean. Default `npm run build` on a clean `.next`: passes. No hydration errors on `/`, `/receipt` or `/skill`.
- `.impeccable/review/qa-skill.mjs` in headless Chrome: third tab present and marked current on `/skill`; no sideways page scroll at 1440 or 390; the offer shows for the real repeat, hides for an unrelated prompt and returns; the example variation adds an input to the skill file; a suggested rule and a typed rule both reach the file; a rule can be removed; the old text link is gone from `/receipt`. No console errors.
- Looked at the `/skill` screenshots at 1440 and 390. No overlap or clipped text found. No code changes were needed in this review.
- Not verified: the "Copy skill file" button's success and failure messages (headless Chrome does not grant clipboard access), keyboard-only use, Safari, Firefox, a real phone, a screen reader.

# Session to Skill finishing report, 2026-10-08

Implemented locally. Not committed, pushed or deployed. Browser acceptance remains open as specified in the handoff.

## What changed

- `/skill` is the third tab, labelled Session to Skill. Removed only the named text-link line in `app/receipt/replay.tsx`; its empty paragraph wrapper remains to respect the literal one-line constraint.
- Replaced the narrow single column with the site's report header, stat tiles, numbered exhibits, working areas and adjacent What it means / Limit panels. Shared styles were appended, not rewritten. No chart library or dependency was added.
- The five tiles show 3 sessions, 100% word overlap for the real repeat, 1 price disagreement, 4 of 15 failed test cells and 12.14 to 21.96 credits. The price count is explicitly a count of price disagreements, not a count of every kind of finding. Only overlap updates with prompt edits; the other figures describe the recorded runs.
- Added a prominent “Save as a skill: review draft” action that moves to the draft. It says that nothing is saved to the account and that copying the file keeps it. All six steps remain visible for a matching prompt, in the same order.
- Reused `Bars` for the three final charges. Used neutral check/cross marks with PASSED/FAILED labels and outlined failures in the table. Added row/column headers, a table caption, a focusable scroll region and a narrow-screen scrolling hint.
- Preserved real repeat, example variation, free prompt edits, no offer for an unrelated prompt, input renaming, rule addition/removal and file generation. Copy now gives a manual-copy fallback message if the clipboard call fails. Copied refers to the exact current file, so editing the file does not leave a stale success label.
- Added `checkSummary` in `lib/skill.ts`, tested against the real outputs plus empty and all-pass inputs. Existing library logic and all evidence files are unchanged. No model was called. No deferred feature was built.

## Verification and actual output

- `npm test`: `tests 30`, `pass 30`, `fail 0`, `duration_ms 179.531208`. This includes real-repeat, variation, renaming via template rendering, unrelated-prompt, price-disagreement, coverage, vendor-source and new cell-count tests. Node emits the existing MODULE_TYPELESS_PACKAGE_JSON warning; package metadata was outside scope and unchanged.
- `npm run lint`: exit 0, no diagnostics.
- `npx tsc --noEmit`: exit 0, no diagnostics.
- `npm run build -- --webpack`: final build exit 0; `Compiled successfully in 900ms`, TypeScript finished in 680ms, `Generating static pages ... (6/6) in 337ms`. `/`, `/receipt` and `/skill` are prerendered. Deleted `.next` after inspecting the output, as required to avoid mixing Webpack and Turbopack artifacts.
- Parsed production `/skill` HTML: all six step anchors present, no duplicate IDs, page title and all three SVG titles nonempty, expected figures and verdict labels present. This verifies rendered structure, not layout or client interactions.
- Compared shared files with their pre-edit snapshots: exactly one added tab line, one removed receipt link line, and appended CSS only. `git diff --check` reports an existing trailing-space line in untouched `app/page.tsx:544`; left it alone. Changed files contain no em dash or en dash characters.

## What could not be tested

The handoff says this sandbox cannot bind ports or launch Chrome and assigns browser QA to Claude Code. I did not repeat those blocked attempts. No new screenshots, browser click-through, hydration check, keyboard-only session, clipboard permission test, or real 390px overflow measurement was completed. Default Turbopack was not run. Do not treat earlier screenshots as evidence for this revision.

Use `.impeccable/review/qa-cdp.mjs` in the follow-up session and extend its checks for this page: third-tab navigation and active state; draft action anchor and focus; the real repeat with no inputs; the example variation with its label; free edits and an unrelated prompt hiding the offer and later steps; restoring the repeat; input renaming; adding a suggestion, removing it and adding it again; a typed rule reaching the file; copying before and after an edit; clipboard denial; and scrolling the test table with a keyboard. Inspect 1440px and 390px screenshots, including long rule text and input names, 16px phone gutters and no page-level sideways scroll. Check hydration and console errors on all three routes after adding the shared tab.

## Self-critique as a Perplexity PM with two minutes

Fixed in this pass:

- The old opening explained too much before showing evidence. The new one-sentence idea and tiles establish the proposal and its small sample immediately. A contents strip gives a direct route to the test.
- A save offer without an action was incomplete. The draft action now provides a next step and states that account persistence is absent.
- Rule controls beside a test can imply that new rules improve the score. Adjacent copy now says the fixed checks inspect old outputs and adding rules does not rerun anything.
- A coloured verdict is easy to miss and would misuse the site's finding colours. The grid now has marks, words and outlines.
- The edited prompt can be mistaken for recorded evidence. Its label, input example labels, summary note and findings note distinguish the example from the real runs.

Still open:

- The real repeat has no input variation. That is honest but does not validate the central input-discovery use case.
- The suggested billing-column rule does not establish which Notion price is right. It is a handwritten choice, not an explanation of the disagreement or a proven repair. The page says prices were not fact-checked and passing does not verify a price.
- These checks do not prove a saved skill improves future outputs, and they are not generated from the user's new rules. A later measured rerun would be needed to assess improvement.
- This remains a long hands-on builder for a two-minute reader. The summary and test shortcut help, but actual reading time and phone usability need the browser review.
- No current-product gap claim was added. The unchecked answer menu, unread Perplexity Skills article and changes since the earlier walkthrough remain unverified. Abhinav should review those before public release.

## Data and logic observations

No new data or logic bug was found. The test grid has 4 failures: the vendor-only check fails in all 3 runs and the check-date test fails in run 16. The one price disagreement is Notion Plus billed monthly. Different plan coverage is shown separately; it is not pooled into the price-disagreement tile. The 450-word stand-in is imported from the existing library constant. Credits still come from `data/runs.json` joined to the run IDs in `data/skill/sessions.json`, through the existing range helper. No values were changed to improve the result.

## New copy for Abhinav's editorial approval

No approval was needed to complete the authorized local edits. Before publication, review these choices:

- Opening: “After you do a task twice, turn the shared prompt, what changed and the checks on your past results into a skill.”
- Action: “Save as a skill: review draft”, qualified by “Nothing is saved to your account.”
- Exhibit claims: “The same prompt left choices unresolved” and “Your past outputs fail parts of the test”.
- Limits: “A rule is a choice, not proof that the next answer will be right”; “Passing does not verify a price”; and the explicit distinction between checking old outputs and measuring a new skill's improvement.
- The tile label “Price disagreements” deliberately narrows what the count means.

## Four undecided items, left unbuilt

1. **Where the offer appears in the product.** Session list, end of the second run, or weekly digest remain undecided. Recommendation: explore the end of the second run first, when the repeated task and its result are fresh.
2. **A second example with real inputs.** Existing repeated deck and note-app prompts are identical too; a genuine variation needs a new measured session. Recommendation: have Abhinav run one real variation before extending the builder's evidence.
3. **Corrections as rules.** There are no recorded follow-up corrections. Recommendation: leave this out until a real correction session can show the prompt, correction and resulting output.
4. **Using a model.** Semantic matching and checks/rules for unseen tasks would expand the scope and require model disclosure. Recommendation: keep this version deterministic until real variation and correction examples define what a model must add.

---

# Review of the rebuild, 2026-10-08 (Claude Code, after Codex)

Not committed, not pushed, not deployed.

## Checked outside Codex's sandbox

- `npm test`: 29 of 29 pass. `npm run lint`: clean. Default `npm run build` (Turbopack): passes on a clean `.next`.
- Headless Chrome through `.impeccable/review/qa-cdp.mjs` (no Playwright needed): `/`, `/receipt` and `/skill` at 1440 and 390 wide have no sideways page scroll. Prototype click-through works: replay to PROVISIONAL then FINAL, show withheld, show the cloud result, start over, Excel budget replay, fill blanks, Cloud route. No console errors.
- Looked at the `report-*.png` screenshots in `.impeccable/review/` for `/` (full page, desktop and phone), `/receipt` (start, finished, phone) and `/skill`.

## Fixed in this pass

1. **Hydration error on `/` in the production build** (React error 418). Every chart tooltip `<title>` was written with several children, which React renders as an empty `<title>` on the server. Each is now one template string. `.impeccable/review/qa-hydration.mjs` reports all three routes clean.
2. **Exhibit 1 line chart was stretched to twice its size**, with oversized axis text and dots. `PairsChart` now has a `wide` form drawn at true scale, with each task named at its Hybrid end.

## Still open

- Hover tooltips are native SVG titles. They work with a mouse and are read out, but there is no styled tooltip and nothing on touch.
- On a phone the meter bar chart scrolls sideways inside its card. Nothing tells the reader it scrolls.
- The side panel beside "How I ran the experiment" is headed "Limit" but holds the task list and the Hybrid definition. "Notes" would fit better.
- Not tested: Safari, Firefox, a real phone, a screen reader, keyboard-only use.
- `.impeccable/review/report-qa.cjs` (Codex's runner) needs Playwright and has never completed a run. `qa-cdp.mjs` covers the same ground.

# Visual rebuild report, 2026-10-08

## Status

The dark visual rebuild is implemented. Browser verification is incomplete because this session cannot bind server ports or launch headless Chrome. No commit, push or deployment was made. Older screenshots already in `.impeccable/review/` describe the previous build, not this revision.

## What changed

- Used H for the dashboard: six stat tiles, the meter chart beside the recorded receipt, cost bars, a count ring and a cloud/Hybrid slope chart. Added insight callouts and adjacent limits.
- Used G for the lower evidence: numbered exhibits, serif claim headlines, open charts and tables, and side panels headed What it means, How to read it where relevant, and Limit. All existing sections, anchors and six screenshots remain.
- Used a sticky horizontal contents strip instead of a vertical rail to leave room for the evidence. It becomes static on phones.
- Replaced the notebook palette, torn tape and shadows with the specified dark tokens, ruled receipts and 8px cards. All finding colours are the exact requested hex values. Verdicts and wrong figures use neutral marks.
- Added Libre Baskerville (SIL OFL, license included) for the site name, h1 and exhibit titles. Kept the self-hosted Atkinson body and mono fonts. No remote font requests at build or runtime.
- Restyled the receipt's before, during and after moments. The existing task, route, replay and repair handlers remain. Reduced-motion users no longer get smooth automatic meter scrolling.
- Mapped `/skill` onto the shared tokens, including inputs, offered-skill notice, placeholders and buttons. Its behavior and tabs are unchanged.
- Rewrote `DESIGN.md`. Added `.impeccable/review/report-qa.cjs` to capture full-page screenshots at 1440 and 390 and check both tasks, both routes, provisional/final replay, withheld values, cloud result, fill blanks, start over, page overflow and runtime errors.
- `data/` and `lib/` were not edited. The existing tested helpers supplied every new measured figure. No chart library or runtime dependency was added.

## Verification and real output

- `npm test`: **29 tests, 29 pass, 0 fail**, duration 138.838875 ms in the final test run. Log: `.impeccable/review/report-tests.log`.
- `npm run lint`: **passed**, no diagnostics after fixing the standalone CommonJS QA runner's lint configuration. Log: `.impeccable/review/report-lint.log`.
- `npx tsc --noEmit`: **passed**. The subsequent production build also passed TypeScript.
- `npm run build`: **failed in the environment**, not a successful default build. Turbopack reported `Failed to write app endpoint /page`, with the cause `app/globals.css` -> `creating new process` -> `binding to a port` -> `Operation not permitted (os error 1)`. Full output: `.impeccable/review/report-turbopack.log`.
- `npm run build -- --webpack`: **passed**, compiled successfully, TypeScript passed, generated 6/6 static pages; `/`, `/receipt` and `/skill` are prerendered. Final output: `.impeccable/review/report-webpack.log`. The package build script is unchanged.
- Inspected the production HTML with an HTML parser: original section anchors present, all six evidence images have alt text, eight SVG charts rendered, no duplicate IDs. This checks generated structure, not browser layout.
- `npm run dev -- --port 3010`: failed with `listen EPERM: operation not permitted 0.0.0.0:3010`.
- Playwright's headless Google Chrome launch failed before opening a page, with `Target page, context or browser has been closed`, Chrome `SIGABRT` and `EPERM`. Consequently **no new screenshots were captured or visually reviewed**, and no overlap, clipping or page-overflow claim is made.

## Not tested

The new browser QA script has not completed a run. Actual 1440px and 390px layout, hover tooltips, keyboard interaction, client replay/repair paths, skill interactions, reduced-motion rendering, Safari, Firefox, a real phone and a screen reader remain unverified. CSS and component review cannot replace those checks. The handoff's screenshot requirement and default-build requirement therefore remain open.

To finish browser QA in a normal local session, build and start the site, make Playwright available to the QA runner, then run `REVIEW_URL=http://localhost:3000 node .impeccable/review/report-qa.cjs`. It uses installed Google Chrome and writes `report-*.png` beside the script. Inspect those images before approving the visual result.

## Data and copy observations

- The earlier 694.46 vs 694.47 total discrepancy remains documented below; no data was changed.
- The headline receipt retains the existing check count, including per-category checks. The earlier concern that this can read as inflated remains open.
- Cloud/Hybrid slopes use the minimum recorded charge on each side, exactly as H does. The full ranges, times, settings and results remain in the open table. Dashed lines identify tasks where nothing ran locally. They do not represent dates or repeated time samples.
- Some older prototype copy still contains typed protocol/task facts (for example the transaction count in step labels). This rebuild did not rewrite those facts or the replay's plan. New dashboard measurements use the existing data helpers.
- Kept the full existing introduction, which is longer than the static comp. Added existing-claim paraphrases in the exhibit side panels; they should receive the same editorial review as the limit lines.

## Open items for Abhinav

1. Approve the new research-report kicker. The build uses `Research report / Oct 2 to Oct 8, 2026` from the existing protocol period rather than introducing a separate typed `October 2026` date.
2. Approve the new **The fix** tag on the recorded receipt.
3. Approve the per-finding **Limit.** sentences, reworded from existing limits: repeated runs of one prompt on one account; readings at Finished that catch up later; Hybrid runs on one Mac with one local model. Counts are filled from the data.
4. Approve **Libre Baskerville** with **Atkinson Hyperlegible Next**. The serif is self-hosted and its license is included.
5. Confirm the brief's **H top / G evidence** combination. That is the implemented choice; there is no separate G version of the opening screen.
6. Complete the blocked browser review and default Turbopack build in an unrestricted local session. Do not treat the previous screenshots as evidence for this revision.

---

# Redesign notes, 2026-10-08

Not committed, not pushed, not deployed. Ask before the first commit.

## What changed
- Two tabs with their own URLs: `/` (case study) and `/receipt` (prototype, moved from `/`).
- Case study built from `data/` through `lib/`: seven sections in the brief's order, three charts, six cropped screenshots, limits in the margin beside each claim.
- Prototype: same behaviours, laid out as one receipt tape. The credit figure is the largest thing on the page, amber while provisional, stamped FINAL when it settles. Failed checks are stamped in red as they print.
- New code: `lib/study.ts`, `tests/study.test.ts`, `data/gate.json`, `app/charts.tsx`, `app/data.ts`, `app/format.ts`, `app/tabs.tsx`. Existing `lib/` logic and `data/` values are unchanged.
- Fonts are self-hosted (Atkinson Hyperlegible Next and Mono, OFL), so the build no longer needs Google Fonts.

## Verified
- 29 tests pass (the original 18, 6 from the `/skill` work, 5 new). `npm run build` and `npm run lint` are clean.
- Headless Chrome at 1440 and 390 px, light and dark: no console errors, no sideways scroll. Clicked: both tasks, both routes, replay to final, show withheld, show cloud result, fill blanks, start over.
- No em or en dashes in any file I wrote.
- Not tested: Safari, Firefox, a real phone, a screen reader.

## Things I was unsure about
1. **Typed protocol facts.** The 300-credit stop rule, the date range, the account type and the model name are not measurements, so they sit as constants in `lib/study.ts` (`PROTOCOL`). The older measured-runs note on `/receipt` still has the date typed in the component.
2. **`data/gate.json` is new data.** I copied Privacy Gate status per run from `runs.csv`. Please check it against your memory of the runs.
3. **"Fell short" is computed from the `correct` field.** A run counts as short of full marks if any "a/b" score in it has a below b. That is how "3 of 3" is derived.
4. **No screenshot of the open Hybrid spreadsheet exists.** The blank cells are drawn from the recorded rows. The screenshot used is the run's reply.
5. **The hero receipt says "9 of 9 checks failed".** True for run 2, but seven of the nine are per-category total checks. A sceptical reader may read it as inflated.
6. **`/skill` is not a tab and still has its old styling** inside the new header. Your call whether it becomes a third tab.
7. **Favicon** is still the create-next-app default.
8. **Reading time.** About 900 words plus tables and a 25-row chart. Closer to four minutes than three if the reader studies the tables.

## Things in the data or the write-ups that looked off
1. **`hybrid-vs-cloud-cases.md` says the gate appeared with Hybrid off "in run 24".** `runs.csv` shows it also appeared on cloud runs 0b and 1. The page says 3 runs.
2. **The same file's limits say the step log was not expanded in runs 4 and 23.** `runs.csv` and the screenshot `04_.../8_step-log-no-local-step...png` show run 4's log was expanded. The page says one run.
3. **`BUILD-PLAN.md` said 26 runs in one place.** `runs.json` has 27 (run 24 was added later).
4. **Run finals now sum to 694.46.** `runs.csv` gives 694.47 for the Analytics cycle total, the same one-cent gap as before.
5. **Bank report cloud time "30 to 60 s".** The 60 is an upper bound from screenshot timestamps (run 1). The page marks it with an asterisk.
6. **Budget Hybrid check shows 18 summary formulas**, cloud run 11 shows 33 and run 24's note says 20. Not wrong, just different each run.

## Critique pass (as a Perplexity PM with two minutes)
Fixed after the pass:
- Heading "Hybrid did nothing, or it ran and broke the answer" now starts "In these runs" and says "fell short".
- "Hybrid was a label on a cloud run" became "the answers matched and the cost did not".
- "The gate, not the toggle, decides" became "In these runs, local work followed the gate, not the toggle".

Left for you:
- The page states problems and a fix but never says what you would measure if Perplexity shipped it. One line on that would help a Growth reader.
- The prototype tab opens on the plan. A reader who does not press "Replay this run" never sees the meter. Consider auto-playing once on first load.

## 2026-10-09: restructure after the designer review

Abhinav's brief: a visitor should see the problem, why it is a problem, and the fix, in that order.

- **Home (`/`):** the hero now states the problem with numbers (the three prices for one prompt), then
  why it matters (meter, Hybrid, 202 reviews), then the fix. The bio is a byline. Sections run:
  problems, users say it too, the fix, metrics, how I worked, limits. The hero avoids the claim
  "nothing estimates the cost before you send", which is still unconfirmed against Plan Previews
  (see the note above). Problem card 1 still carries that sentence.
- **Tabs:** "The problem / Evidence / Prototype / Session to Skill". The reviews dashboard link is live
  (`dashboardUrl` in `data/research.json` and `scripts/sync-research.mjs`).
- **Prototype (`/receipt`):** three stacked views, each headed by its problem: Before you send, While
  it runs, After. The meter plays once by itself when it scrolls into view. Checks, tables, the step
  plan and the code-checked local step sit behind folds. The task and mode switches moved to "Try
  another recorded run" at the bottom. The runs table left this page; the router notes moved to
  `/router`, linked from the bottom.
- **Wording:** the same run reads "0 of 8 totals match" with a CAUGHT stamp everywhere. "9 of 9
  failed" read as if the receipt had failed.
- **Colour:** red means caught or wrong, green means matched (`--wrong`, `--right`). Hybrid's own tone
  moved from green to violet so green is free to mean "matched".
- **Evidence (`/evidence`):** five charts in problem order, each titled with its finding, plus two
  screenshot cards. Tables and method sit behind folds. The old page is in git history (5a9332b).
- **Session to Skill (`/skill`):** the working builder is replaced by "From 3 runs to one skill": the
  three runs on the left, the skill they become on the right, the Markdown file behind a fold.
  `app/skill/builder.tsx` is no longer used.

## 2026-10-09: fixes after the second designer review

- Hero lede cut to two short paragraphs; "dearest" became "most expensive".
- Home problem card 1 now says "Nothing on my screen said which price I would get." in place of the
  unconfirmed "Nothing estimates the cost before you send." "Panel" became "meter" on the home page.
- Prototype: the Cloud runs are labelled as comparison runs (intro, view 3, and the switch). One
  button starts the replay. The verdict chip reads "Caught by the receipt"; check rows read MATCH or
  MISMATCH; the repair button reads "Rerun in the cloud". With reduced motion the count goes straight
  to the settled reading. The "Problem N" labels above the headings are gone (the badge says it).
- Evidence chart 5: the left-out bar stops short of the real-total line, the legend lists only what
  is drawn plus the real-total mark, and the cloud result moved from the title to the note. On phones
  its rows stack so the line stays in one place.
- Contrast: `--ink3` raised in both themes; light-theme tones, red and green darkened to pass 4.5:1.
- Phones: the fourth tab reads "Skill".

Left for Abhinav to decide: whether Session to Skill stays a top tab, whether "The solution" strip on
that page goes (it repeats the demo), and whether "Users say it too" should lead with 202 / 159 / 68.
