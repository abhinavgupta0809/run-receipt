# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A Perplexity product manager or hiring manager with about two minutes. They know Perplexity Computer better than the author does and will distrust anything that sounds inflated. They arrive from a link in an email or application, on a laptop or a phone.

## Product Purpose

Run Receipt is a PM candidate's measured critique of Perplexity Computer and a proposed fix. It has two parts: a case study of 27 measured runs, and a working prototype that shows a receipt for an agent run (plan and cost range before, a provisional credit count during, checks and repairs after). Success is a reader who finishes the case study believing the numbers and opens the prototype.

## Positioning

Every figure on the site is computed from logged runs in `data/` through tested code in `lib/`. It is an outside critique and must look like one.

## Operating Context

Sent by Abhinav Gupta with applications for PM roles at Perplexity (Growth, AI Capabilities, PM Builder, Core Experience). Not deployed yet. The public version is a replay of recorded runs.

## Capabilities and Constraints

- Two routes: `/` is the case study, `/receipt` is the prototype.
- Numbers come from `data/` through `lib/`. No typed figures in components or copy.
- Runs are never pooled across Mac and web, effort levels, or whether a local step ran.
- Honesty labels stay on the page: standalone prototype, replay of recorded runs, illustrative step order, repair uses the bundled test file, rerun cost is an estimate.
- Claims not to make are listed in the handoff brief (`job-search-os/applications/perplexity-pm-2026-10/PMOS-HANDOFF.md`, section 5).
- Undecided: a reviews dashboard as a third tab; the author's own router as a third route.

## Brand Commitments

- Name: Run Receipt. The receipt is the brand idea.
- No Perplexity logo and no imitation of its brand.
- Voice: simple English, short sentences, first person, no em or en dashes.
- Byline: Abhinav Gupta, with his CMU email.

## Evidence on Hand

- `data/runs.json` (27 runs), `data/recordings*.json`, `data/gate.json`, the made-up bank file.
- Six cropped screenshots in `public/evidence/`. Full set in `~/Desktop/Perplexity Research/Run Test Kit/outputs/`.
- No screenshot of the open Hybrid spreadsheet exists; the blank cells are drawn from the recorded rows.

## Product Principles

1. A number that cannot be traced to a run does not appear.
2. Say the limit next to the claim, not in a footer.
3. The reader should remember two moments: the meter going from provisional to final, and a check failing.
4. Calm where the argument is, dense where the data is.
