import { readFileSync } from "node:fs";
import path from "node:path";
import Perplexity from "@perplexity-ai/perplexity_ai";
import { answer } from "@/lib/perplexity.ts";
import { cleanQuestion, passcodeOk, QUESTION_MAX, QUESTION_MIN } from "@/lib/live.ts";

// Runs the saved pricing skill on Perplexity's Agent API for one question. Passcode-gated: each run costs real credit.
export const maxDuration = 120;

const skillId = () => (JSON.parse(readFileSync(path.join(process.cwd(), "data", "skill", "live", "write.json"), "utf8")) as { skillId?: string }).skillId;

export async function POST(request: Request) {
  if (!process.env.DEMO_PASSCODE || !process.env.PERPLEXITY_API_KEY) {
    return Response.json({ error: "Live runs are switched off right now." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { question?: unknown; passcode?: unknown };
  if (!passcodeOk(body.passcode, process.env.DEMO_PASSCODE)) {
    return Response.json({ error: "That passcode doesn't match." }, { status: 401 });
  }
  const question = cleanQuestion(body.question);
  if (!question) {
    return Response.json({ error: `Ask a question between ${QUESTION_MIN} and ${QUESTION_MAX} characters.` }, { status: 400 });
  }
  const id = skillId();
  if (!id) return Response.json({ error: "No saved skill to run." }, { status: 503 });

  const started = Date.now();
  try {
    const a = await answer(question, { skillId: id });
    return Response.json({
      question,
      status: a.status,
      model: a.model,
      text: a.text,
      citations: a.citations,
      searched: a.searched.slice(0, 15),
      costUsd: a.costUsd,
      seconds: Math.round((Date.now() - started) / 1000),
    });
  } catch (e) {
    if (e instanceof Perplexity.APIError) {
      const status = e.status === 429 ? 429 : 502;
      return Response.json({ error: status === 429 ? "Perplexity is rate limiting right now. Try again in a minute." : "Perplexity didn't finish this run." }, { status });
    }
    throw e;
  }
}
