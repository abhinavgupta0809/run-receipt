import { test } from "node:test";
import assert from "node:assert/strict";
import { compact, dedupe, leaks, parseRecording, pickShots, prompt, renderSkillMd, siteWords, RECORDING_FORMAT, type Recording, type SkillPlan } from "../lib/skillwriter.ts";

const T = 1_761_000_000_000;
const rec: Recording = {
  format: RECORDING_FORMAT,
  goal: "Find the monthly price of Notion Plus",
  startedAt: T,
  endedAt: T + 60_000,
  events: [
    { t: T + 1000, kind: "page", url: "https://html.duckduckgo.com/html/", title: "DuckDuckGo" },
    { t: T + 4000, kind: "submit", url: "https://html.duckduckgo.com/html/", field: "q", value: "notion plus price" },
    { t: T + 4010, kind: "input", url: "https://html.duckduckgo.com/html/", field: "q", value: "notion plus price" },
    { t: T + 9000, kind: "page", url: "https://www.notion.com/pricing", title: "Notion Pricing" },
    { t: T + 9500, kind: "page", url: "https://www.notion.com/pricing", title: "Notion Pricing" },
    { t: T + 12000, kind: "click", url: "https://www.notion.com/pricing", target: { tag: "label", text: "Pay monthly" } },
    { t: T + 12050, kind: "click", url: "https://www.notion.com/pricing", target: { tag: "input", text: "month" } },
    { t: T + 70000, kind: "copy", url: "https://www.notion.com/pricing", text: 'Plus "$12"' },
  ],
  shots: [
    { t: T + 1500, afterEvent: 0, image: "data:image/jpeg;base64,AA" },
    { t: T + 12800, afterEvent: 6, image: "data:image/jpeg;base64,BB" },
  ],
};

test("dedupe drops the submit echo, the repeat page load and the label's second click", () => {
  assert.deepEqual(dedupe(rec.events).map((x) => x.index), [0, 1, 3, 5, 7]);
});

test("compact numbers the kept steps with a clock and labels screenshots by step", () => {
  const c = compact(rec);
  assert.equal(
    c.timeline,
    [
      '1. [00:01] open page "DuckDuckGo" https://html.duckduckgo.com/html/',
      '2. [00:04] submit field "q" with "notion plus price"',
      '3. [00:09] open page "Notion Pricing" https://www.notion.com/pricing',
      '4. [00:12] click label "Pay monthly"',
      "5. [01:10] copy text \"Plus '$12'\"",
    ].join("\n"),
  );
  assert.deepEqual(c.shots.map((s) => s.label), ["Screenshot after step 1", "Screenshot after step 4"]);
});

test("pickShots keeps the first and last and spreads the rest", () => {
  const xs = Array.from({ length: 20 }, (_, i) => i);
  const picked = pickShots(xs, 8);
  assert.equal(picked.length, 8);
  assert.equal(picked[0], 0);
  assert.equal(picked[7], 19);
  assert.deepEqual(pickShots([1, 2], 8), [1, 2]);
});

test("parseRecording rejects other files and empty recordings", () => {
  assert.throws(() => parseRecording(JSON.stringify({ format: "x", events: [{}] })), /Not a Session to Skill recording/);
  assert.throws(() => parseRecording(JSON.stringify({ ...rec, events: [] })), /no steps/);
  assert.equal(parseRecording(JSON.stringify(rec)).events.length, 8);
});

const plan: SkillPlan = {
  name: "Software Pricing Analysis!",
  description: 'Load when someone asks "what does X cost per month".',
  intent: "Find the current monthly price of each named plan.",
  recorded_steps: ["1: Searched for the price.", "2: Opened the pricing page."],
  variations: [{ what: "Products", values: ["Notion Plus", "Todoist Pro"] }],
  inputs: [
    { name: "plans", description: "The products and plans to price", example: "Notion Plus; Todoist Pro", required: true },
    { name: "pricing_urls", description: "Official pricing pages, if known.", example: "https://www.notion.com/pricing", required: false },
  ],
  steps: ["Search for each product's pricing page.", "Read the monthly price."],
  checks: ["The price is for monthly billing, not yearly."],
  output: "One row per plan: plan, price, billing period, source link.",
};

test("renderSkillMd writes valid frontmatter, marks optional inputs and lists what changed", () => {
  const md = renderSkillMd(plan, [
    { recordedOn: "2026-10-25", goal: "a", steps: 5 },
    { recordedOn: "2026-10-25", goal: "b", steps: 7 },
  ]);
  assert.match(md, /^---\nname: software-pricing-analysis\ndescription: "Load when someone asks 'what does X cost per month'\."\n---\n/);
  for (const h of ["## Inputs", "## Steps", "## Checks before you answer", "## Answer format", "## Where this skill came from"]) assert.ok(md.includes(h), h);
  assert.ok(md.includes("1. Search for each product's pricing page.\n2. Read the monthly price."));
  assert.ok(md.includes("- **plans**: The products and plans to price. Example: Notion Plus; Todoist Pro"));
  assert.ok(md.includes("- **pricing_urls** (optional): Official pricing pages, if known. Example:"));
  assert.ok(md.includes("Written from 2 recorded browser sessions, 2026-10-25 (12 steps in all)."));
  assert.ok(md.includes("- Products: Notion Plus, Todoist Pro"));
  assert.ok(md.includes("Don't use numbered markers like [web:1]."));
  assert.ok(md.includes("- Recompute every number you derive"));
});

test("renderSkillMd caps the description at 1,024 bytes", () => {
  const md = renderSkillMd({ ...plan, description: "é".repeat(800) }, [{ recordedOn: "2026-10-25", goal: "", steps: 0 }]);
  const desc = md.match(/description: "(.*)"/)![1];
  assert.ok(Buffer.byteLength(desc) <= 1024);
});

test("siteWords takes the brand part of each host", () => {
  const r2: Recording = { ...rec, events: [{ t: T, kind: "page", url: "https://obsidian.md/pricing" }, { t: T, kind: "page", url: "https://apps.apple.com/x" }, { t: T, kind: "copy" }] };
  assert.deepEqual(siteWords([rec, r2]), ["duckduckgo", "notion", "obsidian", "apple"]);
});

test("leaks finds site names in the general text but not in input examples", () => {
  assert.deepEqual(leaks(plan, ["notion", "todoist"]), []);
  assert.deepEqual(leaks({ ...plan, checks: ["Notion's page says 'Price in USD'."] }, ["notion", "todoist"]), ["notion"]);
  assert.deepEqual(leaks({ ...plan, name: "notion-price-check" }, ["notion"]), ["notion"]);
});

test("prompt labels each session and shares the screenshot budget", () => {
  const many = { ...rec, shots: Array.from({ length: 10 }, (_, i) => ({ t: T + i, afterEvent: 0, image: `data:image/jpeg;base64,${i}` })) };
  const parts = prompt([many, many, many]);
  assert.ok(parts[0].text!.startsWith("Session 1 of 3"));
  assert.equal(parts.filter((p) => p.type === "input_image").length, 6);
  assert.equal(prompt([many]).filter((p) => p.type === "input_image").length, 8);
});
