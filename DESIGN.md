# Design

## Direction

A dark research report for a PM or hiring manager. Comp H supplies the opening dashboard; comp G supplies the evidence exhibits below it. No Perplexity branding. Light mode is removed.

## Tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `--paper` | `#0b0e13` | Page |
| `--sheet` | `#11151c` | Cards and receipt |
| `--grid` | `#222a34` | Card edges and chart grid |
| `--rule` | `#262d37` | Rules |
| `--ink` | `#eceef1` | Main text |
| `--soft` | `#c9cfd6` | Body text in cards and callouts |
| `--ink2` | `#9aa3ae` | Labels, subtitles, axes |
| `--ink3` | `#6f7884` | Source lines |
| `--cost` | `#c98500` | Finding 1 marks |
| `--meter` | `#3987e5` | Finding 2 marks |
| `--hybrid` | `#199e70` | Finding 3 marks |
| `--rest` | `#39424e` | Neutral ring segment |

Colour identifies findings, never verdicts. All chart text uses ink tokens. Legacy semantic variables resolve to neutral tokens for the existing replay components.

## Type

Self-hosted Libre Baskerville, variable weight 400 to 700, for the site name, page titles and exhibit headlines. Its SIL OFL license is beside the font in `app/fonts/`. Atkinson Hyperlegible Next remains the body and UI face. Atkinson Hyperlegible Mono is used for receipt figures and literal code in the skill builder. There are no build-time or browser requests for fonts.

## Components

- Six stat tiles, a wide meter chart beside the recorded receipt, then three finding cards.
- Cards have an 8px radius, 1px edge, no shadow and no decorative gradient.
- Finding callouts have a 3px coloured left edge, 13% colour tint and bold lead sentence. Limits sit beneath them.
- The receipt has straight edges and ruled sections. Its before, during and after moments use cost, meter and Hybrid accents respectively.
- PROVISIONAL is an outlined hatched chip; FAILED is a bold outlined chip; FINAL is solid. Wrong figures are bold and underlined with dots. Blank cells are labelled and underlined.
- Evidence exhibits have a numbered kicker, a serif claim headline, an open chart or table, and a side panel with interpretation, chart reading guidance and limits.
- Screenshots retain their captions and frames. Wide tables scroll within their containers.
- A sticky horizontal contents strip serves the lower report. It includes finding-colour marks and retains the original section anchors. A separate vertical rail would narrow the evidence column too much.
- `/skill` uses the same neutral controls, surfaces and text tokens, without joining the tabs.

## Charts

React-rendered SVG bars, count ring and slope charts, with native hover titles and full accessible text summaries. The detailed meter readings and paired task table remain open. Values come from existing data helpers in `lib/`; no data or calculation changes were needed.

One axis per chart. Each meter bar or slope is one run. Cloud against Hybrid connects the minimum recorded charge on each side of a task; the table retains full ranges and settings. Solid lines mean a local step ran; dashed lines mean none ran. These are comparisons, not a time series. The ring has a 2px gap between segments and reports counts. Chart grids are recessive, bars have rounded ends, and labels stay neutral.

## Responsive layout and motion

Report width is capped at 1440px, with 56px desktop gutters and 16px phone gutters. Stat tiles become two columns on phones. Cards and exhibit side panels stack. The dense meter chart scrolls within its own container so run labels remain readable.

Replay timing and actions remain intact. Neutral print and line entrance effects respect reduced motion; smooth automatic scrolling is disabled under that preference. Large provisional and final credit figures remain the focus of the replay.

Browser screenshots and interactive verification for this revision are pending because the execution sandbox blocked server ports and headless Chrome. See `REDESIGN-NOTES.md` for exact results.

## Session to Skill, 2026-10-08

`/skill` now joins the tab bar. It reuses the report header, stat tiles, numbered exhibit headers, evidence columns, neutral callouts, table rules and `Bars`. Five tiles summarize the recorded sessions, live prompt overlap, price disagreements, failed test cells and recorded credit range. The offer links to a reviewable draft; copying the file is the way to keep it.

Each step pairs its working area with What it means and Limit. The test uses check and cross marks plus PASSED and FAILED labels, with an outline for failures. Only credit bars use the cost colour. The narrow layout inherits 16px gutters, stacks the evidence panels, wraps file text and scrolls the test table inside a focusable region. These layout choices still need browser verification at 390px.
