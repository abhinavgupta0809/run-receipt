# Handoff to Codex: rebuild the Run Receipt site in the dark research-report look

Written 2026-10-08 by Claude Code for Abhinav Gupta. Read this whole file, then `AGENTS.md`, `PRODUCT.md` and `REDESIGN-NOTES.md`, before editing.

## What this is

Run Receipt is Abhinav's PM application piece for Perplexity: a case study of 27 measured runs of Perplexity Computer (`/`) and a working prototype of the fix (`/receipt`). The reader is a Perplexity PM or hiring manager with about two minutes who will distrust anything inflated.

The site works today in an older "lab notebook" look (pale green paper, receipt tape). Abhinav found it bland and number-heavy. Over a design round he rejected several expressive directions as "too funky" and approved this one. Your job is to rebuild the visual layer to match it. The data, the logic in `lib/`, the copy and the behaviour all stay.

## The approved design

Two rendered comps are the reference. Open both images first:

- `.impeccable/mocks/comp-round/r7-dashboard.png` (frame H): the first screen. Stat tiles, chart cards, insight callouts.
- `.impeccable/mocks/comp-round/r6-charts.png` (frame G): the long-form "exhibit" treatment, lower half of the image.

Their HTML and CSS source is in `.impeccable/mocks/decision/src/` (`build5.py` has the base report styles, `build7.py` is H, `build6.py` is G, `build.py` has the receipt markup). Port the look from there. The comps are static Python-generated HTML and are not to be shipped or imported.

Abhinav has not said in words which of G or H he prefers. Claude recommended, and this brief assumes, **H for the top of `/` and G's exhibit treatment for every evidence section below it**. If something in this brief conflicts with a later instruction from Abhinav, his instruction wins.

### Decisions Abhinav made (do not reopen)

1. Dark mode. Design dark first. Drop the light theme unless it costs nothing to keep correct.
2. A consulting or research-report look: professional, restrained. Nothing playful.
3. Three colours mark the three problems and are used only as small accents (a thin bar, a dot beside a label, chart marks, the left edge of a callout): cost, the meter, Hybrid.
4. Every table and chart stays open on the page. Nothing collapsed, nothing cut.
5. Context sits beside every number: each headline figure gets one plain sentence and its limit next to it.
6. Charts a PM would present: bar charts, a ring (pie-style) chart, line charts, each with a title, a one-line subtitle and a callout that states the insight.
7. Reference he likes for structure: https://duolingo-reviews.vercel.app/ (stat tiles, chart cards with title and subtitle, tinted insight callout under each chart). Take the structure, not its green brand or its dual-axis chart.

### Tokens (from the comps)

| Token | Value | Job |
|---|---|---|
| ground | `#0b0e13` | page |
| card | `#11151c` | tiles and chart cards |
| edge / rule | `#222a34`, `#262d37` | card borders, rules, grid lines |
| ink | `#eceef1` | text |
| ink soft | `#c9cfd6` | body copy in cards and callouts |
| ink 2 | `#9aa3ae` | labels, subtitles, axis text |
| ink 3 | `#6f7884` | source lines |
| cost | `#c98500` | finding 1 |
| meter | `#3987e5` | finding 2 |
| hybrid | `#199e70` | finding 3 |
| rest | `#39424e` | the "other" part of a ring, neutral marks |

The three finding colours were checked with the dataviz palette validator on `#0b0e13` (lightness band, colour-blind separation, contrast: all pass). Keep these exact values for chart marks.

Type: a restrained serif for the site name, the h1, and exhibit titles (the comps use Iowan Old Style as a stand-in); a clean sans for everything else; mono only for figures inside the receipt. The comps use Mac system fonts. For the build pick open-licence faces, self-host them in `app/fonts/` the way the repo already does (no Google Fonts request at build or run time), and say in your report which you chose. The existing Atkinson Hyperlegible files may stay for body text if they look right; the serif is new.

Cards: 1px edge, 8px radius, no shadow, no gradient. Callout: 3px left border in the finding colour, a 12 to 13 percent tint of that colour as background, a bold lead-in sentence.

Verdict marks are not colour-coded, because colour now means "which finding": PROVISIONAL is a hatched outlined chip, FAILED is an outlined bold chip, FINAL is solid. Wrong figures in tables need a non-colour mark as well (weight, a marker, or a label), since red is no longer reserved for failure.

## What to build

### `/` case study

Keep the existing sections, their order and their anchors (`#why`, `#method`, `#observed`, `#limits`). Keep the copy unless a line below says otherwise.

1. Masthead: site name, byline line, the two tabs (Case study, Run Receipt). Keep `app/tabs.tsx` behaviour.
2. Title block: kicker, h1 "A receipt for every agent run", the opening paragraph, a meta line (author, one account, date range).
3. Stat tiles, six of them as in comp H: runs measured, task types, credits spent, then one tile per finding with its colour on the top edge.
4. First row of cards: the meter chart (wide) beside the receipt for recorded run 2 ("The fix"), which links to `/receipt`.
5. Second row: cost bars, the Hybrid ring, the cloud-against-Hybrid slope chart. Each with its callout.
6. Then each existing evidence section as an exhibit in comp G's form: an exhibit number and finding tag, a headline that states the insight (reuse the existing `H3` sentences, they already do this), the chart or table, and a side panel with "What it means", "How to read it" where a chart needs it, and "Limit". The existing margin notes are the source for those side panels. Screenshots stay, framed as exhibits with captions.
7. A contents rail for the long lower part of the page is wanted if it fits cleanly (comp F shows one: `.impeccable/mocks/comp-round/r5-contents.png`), with the three finding sections colour-keyed. Drop it if it makes the layout worse.
8. Limits section and the closing link to the prototype stay.

### `/receipt` prototype

Same behaviours as now (both tasks, both routes, replay, show withheld, show cloud result, fill blanks, start over). Restyle it into the same dark look and tokens. The credit figure stays the largest thing on the page, hatched or marked PROVISIONAL until it settles, then FINAL. The three moments (before, during, after) take the three finding colours on their left edge, as the receipt does in the comps. Honesty labels stay on the page.

### `/skill`

Another session added this route. Bring it onto the new tokens so it does not look broken inside the new header. Do not change what it does and do not add it to the tabs.

## Hard rules

- **Every number comes from `data/` through `lib/`.** No typed figures in components or copy. The comps hard-code a few values for speed; the build must compute them. `lib/study.ts` already has `tally`, `pairs`, `panelReadings`, `widestRepeatRuns`, `settingsFor`. Add functions there with tests if a chart needs something new (for example the per-run share of the final charge the panel showed, or the count of task types).
- **Never pool runs** across Mac and web, effort levels, or whether a local step ran.
- **Counts, not rates.** Do not turn "3 of 8" into a percentage headline. The ring chart shows counts with labels.
- **One y-axis per chart.** No dual-axis charts.
- **Text is never set in a series colour.** Values, labels and legends use ink; a coloured mark beside them carries identity.
- No time-series line chart: there is no time series in this data. The line charts are before-and-after lines per run or per task (slope charts), and must be labelled so.
- Voice for any new copy: simple English, short sentences, first person, no em dashes and no en dashes. Do not invent claims. Three lines in the comps are new copy and still need Abhinav's approval, so mark them in your report: the "Research report / October 2026" kicker, the "The fix" tag, and the per-finding "Limit." sentences (reworded from limits already on the page).
- No Perplexity logo and no imitation of its brand.
- Charts: thin marks, rounded data ends, a 2px gap between ring segments, recessive grid lines, direct labels only where they help. Charts are SVG rendered by React, no chart library needed. Add a hover tooltip per mark and keep a table view or readable text equivalent for each chart (`role="img"` with a full `aria-label` at minimum). Respect `prefers-reduced-motion`.
- Responsive: must work at 390px wide with a 16px gutter and no sideways page scroll. Tiles wrap to two per row, cards stack, wide tables scroll inside their own container.
- This repo is on a newer Next.js than you may know. Follow `AGENTS.md`: read the guide in `node_modules/next/dist/docs/` before writing framework code.

## Safety

- **Do not commit, push or deploy.** Nothing in this repo is committed past the initial scaffold and Abhinav approves the first commit himself.
- A backup of the current build is at `.impeccable/backup/notebook-build-2026-10-08.tgz`. Leave it alone.
- Another session (job-search-os) also edits this repo. Re-read a file right before you write it. Do not delete files you did not create, except to replace `app/` styling as described here.
- Leave `data/` values unchanged. Leave existing `lib/` logic unchanged apart from additions.
- Do not edit `.impeccable/surfaces/`, `.impeccable/mocks/` or `PRODUCT.md`.

## Done means

1. `npm test`, `npm run lint` and `npm run build` all pass. Report the real output. If something fails and you cannot fix it, say so plainly.
2. Screenshots captured with headless Chrome into `.impeccable/review/` at 1440 and 390 wide for `/` and `/receipt` (full page), and you have looked at them for overlap, clipped text and overflow.
3. `DESIGN.md` rewritten to describe the new world as built (tokens, type, components, chart rules), replacing the notebook description.
4. `REDESIGN-NOTES.md` gets a new dated section at the top: what changed, what you verified and how, what you did not test, anything in the data or copy that looked off, and the open items for Abhinav (the three new copy lines, the font choice, G against H if you had to make a call).
