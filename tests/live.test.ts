import { test } from "node:test";
import assert from "node:assert/strict";
import { blocks, inline, stripMarkers } from "../lib/answermd.ts";
import { cleanQuestion, passcodeOk } from "../lib/live.ts";

test("passcodeOk needs a configured passcode and an exact match", () => {
  assert.equal(passcodeOk("tangerine-42", undefined), false);
  assert.equal(passcodeOk("tangerine-42", ""), false);
  assert.equal(passcodeOk(42, "tangerine-42"), false);
  assert.equal(passcodeOk("tangerine-41", "tangerine-42"), false);
  assert.equal(passcodeOk(" tangerine-42 ", "tangerine-42"), true);
});

test("cleanQuestion trims, collapses spaces and enforces length", () => {
  assert.equal(cleanQuestion("  Compare   Canva and Miro  "), "Compare Canva and Miro");
  assert.equal(cleanQuestion("short"), null);
  assert.equal(cleanQuestion("x".repeat(301)), null);
  assert.equal(cleanQuestion(null), null);
});

test("stripMarkers drops [web:N] markers", () => {
  assert.equal(stripMarkers("Slack is $8.75. [web:3][web:1]"), "Slack is $8.75.");
});

test("inline reads bold, Markdown links and bare links", () => {
  assert.deepEqual(inline("**$12** at [Linear](https://linear.app/pricing), see https://slack.com/pricing."), [
    { kind: "bold", text: "$12" },
    { kind: "text", text: " at " },
    { kind: "link", text: "Linear", href: "https://linear.app/pricing" },
    { kind: "text", text: ", see " },
    { kind: "link", text: "slack.com/pricing", href: "https://slack.com/pricing" },
    { kind: "text", text: "." },
  ]);
});

test("inline turns Markdown escapes back into characters", () => {
  assert.deepEqual(inline("\\*Loom\\_s note costs \\$15"), [{ kind: "text", text: "*Loom_s note costs $15" }]);
});

test("blocks splits paragraphs, lists and tables, skipping the rule row", () => {
  const md = "**Summary** first. [web:1]\nstill first.\n\n| App | Monthly |\n|---|---:|\n| Slack Pro | $8.75 [web:3] |\n\n- one\n- two";
  const b = blocks(md);
  assert.deepEqual(b.map((x) => x.kind), ["p", "table", "list"]);
  assert.deepEqual(b[0], { kind: "p", parts: [{ kind: "bold", text: "Summary" }, { kind: "text", text: " first. still first." }] });
  assert.deepEqual(b[1], { kind: "table", head: [[{ kind: "text", text: "App" }], [{ kind: "text", text: "Monthly" }]], rows: [[[{ kind: "text", text: "Slack Pro" }], [{ kind: "text", text: "$8.75" }]]] });
  assert.equal(b[2].kind === "list" && b[2].items.length, 2);
});

test("friendly turns timeline lines into short demo lines and skips noise", async () => {
  const { friendly, sessionLabel, day } = await import("../lib/livedemo.ts");
  assert.equal(friendly('1. [00:01] open page "DuckDuckGo" https://html.duckduckgo.com/html/'), null);
  assert.equal(friendly('2. [00:04] submit field "q" with "notion pricing plans"'), "Searched “notion pricing plans”");
  assert.equal(friendly('3. [00:09] open page "Pricing | Todoist" https://www.todoist.com/pricing'), "Opened todoist.com/pricing");
  assert.equal(friendly('4. [00:12] click label "Pay monthly"'), "Clicked “Pay monthly”");
  assert.equal(friendly('5. [00:13] click input'), null);
  assert.equal(friendly('5. [00:13] click input "Search"'), null);
  assert.equal(friendly('6. [00:20] click a "Features and price of Bear Pro - Bear Markdown Notes" -> https://bear.app/faq/'), "Clicked “Features and price of Bear Pro - Bear…”");
  assert.equal(sessionLabel("Pricing analysis: compare Todoist and Bear paid plans, monthly vs yearly billing"), "Todoist vs Bear");
  assert.equal(day("2026-10-25"), "Oct 25, 2026");
});
