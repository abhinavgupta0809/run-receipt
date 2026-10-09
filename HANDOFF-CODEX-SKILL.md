# Handoff to Codex: Session to Skill (`/skill`)

Written 2026-10-08 by Claude Code for Abhinav Gupta. Second Codex job on this repo. The first rebuilt the site in a dark research-report look and is finished and reviewed.

## Read first, in this order

1. `.impeccable/codex/PMOS-HANDOFF-SKILL.md`. This is the original brief for this prototype, written by another session. It explains the idea, what exists, the limits, the rules and the claims not to make. **Sections 1 to 4 and 6 to 9 bind you as written.** Section 5 and section 10 are replaced by this file.
2. `DESIGN.md` (the site's look as built), `REDESIGN-NOTES.md` (top two sections), `AGENTS.md`.
3. `app/page.tsx`, `app/charts.tsx`, `app/globals.css` for the components and tokens you must reuse.
4. `app/skill/page.tsx`, `app/skill/builder.tsx`, `lib/skill.ts`, `tests/skill.test.ts`.

`app/skill/builder.tsx` was modified after the first Codex job ended, so another session may be editing it. Read every file right before you write it.

## The job

Make `/skill` a finished third part of the site, at the same standard as `/` and `/receipt`. Today it works but is only re-coloured: a plain single column of six steps.

### Must do

1. **Design pass in the site's existing look.** Dark, research-report, restrained. Reuse the site's tokens, type, cards, callouts, exhibit headers, side panels and table styles. Do not invent a second visual language and do not add a chart library.
   - Open with the idea in one sentence, then a row of stat tiles for what the three real runs show, each computed from `data/skill/` through `lib/skill.ts`: sessions compared, the share of words the two prompts have in common, how many differences the runs showed, how many of the test cells failed, and the credit range for the three runs. Only include a tile if the number already comes out of `lib/` or can with a small tested addition.
   - The six steps keep their order and behaviour. Present them as numbered sections in the exhibit style: a headline that states what the step shows, the working part, and a side panel with "What it means" and "Limit" where the brief's section 4 limits apply.
   - Give the most weight to two moments: the "you did this twice" offer (a clear callout with the save action), and the test grid where his own past sessions fail. In the grid, PASSED and FAILED must be told apart by a mark and a label, not by hue alone, the same way `/receipt` does it.
   - One or two small charts where they are honest: the three runs' credits as bars (reuse `Bars`), and the pass or fail counts per check if it reads better than the grid alone. Counts, not rates. It is one prompt, three runs, one account, one day.
   - The finding colours on the rest of the site mean cost, the meter and Hybrid. Do not reuse them here for other meanings. Cost bars may use the cost colour. Everything else stays neutral ink, rules and marks.
2. **Add it as a third tab** labelled "Session to Skill". Change only what is needed in `app/tabs.tsx`. Then remove the "Second prototype: Session to Skill" text link in `app/receipt/replay.tsx`, that one line only.
3. **Tighten the copy.** Lead with the idea in one sentence. Keep every honesty note from section 4 on the page, beside the thing it qualifies. Follow section 8's writing rules and section 9's list of claims not to make.
4. **Keep every behaviour working:** the real repeat, "Try a variation", free editing of the second prompt, an unrelated prompt getting no offer, renaming an input, adding and removing rules, the test grid, copying the skill file.
5. **Self-critique before you finish**, as a Perplexity PM with two minutes who knows the Skills product better than we do. Fix what you can and list the rest in your report.

### Do not build

Section 5 of the original brief lists four things to decide with Abhinav first: where the offer shows up in the product, a second example, corrections as rules, and using a model. He has not decided any of them. Leave them unbuilt. Do not call a model.

## Technical notes from the first job

- In SVG, a `<title>` must have exactly one string child, written as one template string. Several children render as an empty title on the server and break hydration in the production build.
- An SVG drawn to fill its container must have a viewBox sized for that width, or its text and marks blow up. See `PairsChart`'s `wide` form.
- Your sandbox cannot bind ports or launch Chrome, and the default Turbopack build fails there. Check with `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build -- --webpack`. Then delete the `.next` folder so a stale Webpack build does not mix with the next Turbopack one. Claude Code will run the default build and the browser checks afterwards with `.impeccable/review/qa-cdp.mjs`; if you add interactions worth checking, say which in your report.
- Must work at 390px wide with a 16px gutter and no sideways page scroll. Wide tables scroll inside their own container.

## Safety

- **Do not commit, push or deploy.**
- Backups exist in `.impeccable/backup/`. Leave them alone.
- Stay inside `app/skill/`, `lib/skill.ts`, `tests/skill.test.ts`, plus the two named one-line changes in `app/tabs.tsx` and `app/receipt/replay.tsx`. You may add classes to `app/globals.css` and components to `app/charts.tsx`. Do not restyle or reformat anything else in shared files, and do not change `/` or `/receipt` beyond that one removed link.
- Do not edit `data/skill/`. Do not change `lib/skill.ts` logic to make a result look better. Additions need tests. If you find a bug, stop and report it.

## Done means

1. `npm test`, `npm run lint`, `npx tsc --noEmit` and the Webpack build pass. Report real output.
2. No em dash or en dash characters in any file you changed.
3. `DESIGN.md` gains a short section for the `/skill` components you added. `BUILD-PLAN.md` gets a dated note.
4. `REDESIGN-NOTES.md` gets a new dated section at the top: what changed, what you verified and how, what you could not test, your self-critique findings, anything that looked wrong in the data or logic, new copy that needs Abhinav's approval, and the four undecided items from the original brief's section 5 restated with a one-line recommendation each.
