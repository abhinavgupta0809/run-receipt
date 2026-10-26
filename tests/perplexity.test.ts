import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32 } from "node:zlib";
import { skillName, skillZip, toAnswer } from "../lib/perplexity.ts";

test("toAnswer splits what the answer cites from what the run searched, one entry per URL", () => {
  const a = toAnswer({
    id: "resp_1",
    status: "completed",
    model: "openai/gpt-6-luna",
    output_text: "Notion costs $10.",
    output: [
      { type: "search_results", results: [{ url: "https://a.com", title: "A" }, { url: "https://b.com", title: "B" }, { url: "https://a.com", title: "A again" }] },
      { type: "message", content: [{ text: "Notion costs $10.", annotations: [{ type: "url_citation", url: "https://b.com", title: "B inline" }] }] },
    ],
    usage: { cost: { total_cost: 0.0042 } },
  });
  assert.deepEqual(a.citations, [{ url: "https://b.com", title: "B inline" }]);
  assert.deepEqual(a.searched, [{ url: "https://a.com", title: "A" }, { url: "https://b.com", title: "B" }]);
  assert.equal(a.costUsd, 0.0042);
  assert.equal(a.text, "Notion costs $10.");
});

test("toAnswer falls back to message text and a null cost", () => {
  const a = toAnswer({ id: "r", status: "completed", model: "m", output: [{ type: "message", content: [{ text: "Hi" }, { text: " there" }] }] });
  assert.equal(a.text, "Hi there");
  assert.equal(a.costUsd, null);
});

test("toAnswer cites links written in the text", () => {
  const a = toAnswer({ id: "r", status: "completed", model: "m", output_text: "Plus is $12 ([Notion](https://www.notion.com/pricing)). See https://obsidian.md/pricing.", output: [] });
  assert.deepEqual(a.citations.map((c) => c.url), ["https://www.notion.com/pricing", "https://obsidian.md/pricing"]);
});

test("toAnswer reads sandbox hits from both search.web and search.web_many, and does not map [web:N]", () => {
  const one = JSON.stringify({ saved_to: "/x.json", results: [{ url: "https://todoist.com/pricing", title: "Todoist" }] });
  const many = JSON.stringify({ results: [{ ok: true, spec: { query: "bear" }, result: [{ url: "https://bear.app/pro", title: "Bear" }] }, { ok: true, result: [{ url: "https://craft.do/pricing" }] }] });
  const a = toAnswer({
    id: "r",
    status: "completed",
    model: "m",
    output_text: "Todoist Pro is $7. [web:1] Bear Pro is $2.99. [web:2]",
    output: [{ type: "sandbox_results", results: [{ stdout: one }] }, { type: "sandbox_results", results: [{ stdout: many }] }],
  });
  assert.deepEqual(a.citations, []);
  assert.deepEqual(a.searched.map((c) => c.url), ["https://todoist.com/pricing", "https://bear.app/pro", "https://craft.do/pricing"]);
});

test("toAnswer still finds URLs when the sandbox output is cut off mid-JSON", () => {
  const stdout = '{"results":[{"url":"https://todoist.com/pricing","title":"Todoist"},{"url":"https://bear.app/pro","tit';
  const a = toAnswer({ id: "r", status: "completed", model: "m", output_text: "See [web:2].", output: [{ type: "sandbox_results", results: [{ stdout }] }] });
  assert.deepEqual(a.searched.map((c) => c.url), ["https://todoist.com/pricing", "https://bear.app/pro"]);
});

test("toAnswer reads pages from the agent's own code and free-text output, skipping assets", () => {
  const code = "urls=['https://linear.app/pricing','https://slack.com/pricing']\nr=pplx_sdk.content.fetch(urls)";
  const stdout = "QUERY {'query': 'figma'} OK True\nPricing https://www.figma.com/pricing/ Pricing\nlogo https://cdn.figma.com/logo.svg";
  const a = toAnswer({ id: "r", status: "completed", model: "m", output_text: "x", output: [{ type: "sandbox_results", code, results: [{ stdout }] }] });
  assert.deepEqual(a.searched.map((c) => c.url), ["https://linear.app/pricing", "https://slack.com/pricing", "https://www.figma.com/pricing/"]);
});

test("skillName follows the 1-64 lowercase-hyphen rule", () => {
  assert.equal(skillName("App Price Comparison!"), "app-price-comparison");
  assert.equal(skillName("--a__b--"), "a-b");
  const long = skillName("x ".repeat(80));
  assert.ok(long.length <= 64 && !long.endsWith("-"));
});

test("skillZip writes one stored SKILL.md under a top-level folder", () => {
  const md = "---\nname: app-price-comparison\ndescription: Compare app prices.\n---\nDo it.\n";
  const zip = Buffer.from(skillZip("App price comparison", md));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  const nameLen = zip.readUInt16LE(26);
  assert.equal(zip.subarray(30, 30 + nameLen).toString(), "app-price-comparison/SKILL.md");
  const size = zip.readUInt32LE(18);
  const body = zip.subarray(30 + nameLen, 30 + nameLen + size);
  assert.equal(body.toString(), md);
  assert.equal(zip.readUInt32LE(14), crc32(body));
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt32LE(zip.readUInt32LE(end + 16)), 0x02014b50);
});
