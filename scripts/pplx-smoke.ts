// Smoke test for the Perplexity Agent API and Skills API. Prints status and response shape only, never the key.
// Run: node --env-file-if-exists=.env.local scripts/pplx-smoke.ts
import Perplexity from "@perplexity-ai/perplexity_ai";
import { answer, client } from "../lib/perplexity.ts";

async function main() {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.log("PERPLEXITY_API_KEY is missing. Create one at https://console.perplexity.ai and add it to .env.local.");
    process.exit(1);
  }
  try {
    const a = await answer("What is the current monthly price of Notion Plus? One sentence.", { effort: "fast" });
    console.log("agent:", { status: a.status, model: a.model, textChars: a.text.length, citations: a.citations.length, costUsd: a.costUsd });
    const skills = await client().skills.list({ limit: 5 });
    console.log("skills list: ok,", Object.keys(skills).join(", "));
  } catch (e) {
    if (e instanceof Perplexity.APIError) {
      console.log(`HTTP ${e.status}`, e.status === 401 ? "(key problem)" : e.status === 429 ? "(rate limited; honor Retry-After)" : "");
      process.exit(1);
    }
    throw e;
  }
}

main();
