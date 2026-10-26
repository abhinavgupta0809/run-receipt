// Round trip for the Skills API: upload a throwaway skill, run one question with it, then delete it.
// Prints status, cost and whether the skill loaded, never the key.
// Run: node --env-file-if-exists=.env.local scripts/pplx-skill-roundtrip.ts
import Perplexity from "@perplexity-ai/perplexity_ai";
import { client, toAnswer, uploadSkill } from "../lib/perplexity.ts";

const MARK = "ROUNDTRIP-7Q";
const SKILL_MD = `---
name: roundtrip-price-check
description: Load for any question about the monthly price of a software subscription.
---
# Price check

1. Search the web for the product's official pricing page.
2. Answer in one sentence with the price and the plan name.
3. End the answer with a new line containing exactly: ${MARK}
`;

async function main() {
  const c = client();
  const skill = await uploadSkill("roundtrip-price-check", SKILL_MD);
  console.log("upload:", { skill_id: skill.skill_id, name: skill.name });
  try {
    const raw = await c.responses.create({
      effort: "low",
      input: "What is the current monthly price of Notion Plus?",
      tools: [{ type: "web_search" }],
      skills: [{ type: "custom", id: skill.skill_id }],
    });
    const a = toAnswer(raw as unknown as Parameters<typeof toAnswer>[0]);
    const loaded = raw.output.filter((o) => o.type === "skill_loaded").map((o) => (o as { name: string }).name);
    console.log("run:", { status: a.status, model: a.model, skillLoaded: loaded, followedSkill: a.text.includes(MARK), citations: a.citations.length, costUsd: a.costUsd });
    console.log("output item types:", [...new Set(raw.output.map((o) => o.type))].join(", "));
  } finally {
    const latest = await c.skills.retrieve(skill.skill_id);
    await c.skills.delete(skill.skill_id, { expected_revision: latest.latest_revision ?? "" });
    const left = await c.skills.list({ limit: 50 });
    console.log("delete: ok, skills left:", left.skills?.length ?? 0);
  }
}

main().catch((e) => {
  if (e instanceof Perplexity.APIError) {
    console.log(`HTTP ${e.status}`, e.message);
    process.exit(1);
  }
  throw e;
});
