import Perplexity from "@perplexity-ai/perplexity_ai";
import { crc32 } from "node:zlib";

// Server-side only: the Perplexity Agent API (POST /v1/agent) and its Skills API (/v1/skills).
// The key comes from PERPLEXITY_API_KEY and never leaves the server.

export function client(): Perplexity {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not set. Create a key at https://console.perplexity.ai and add it to .env.local.");
  }
  return new Perplexity();
}

export type Citation = { title?: string; url: string };
export type Answer = { id: string; status: string; model: string; text: string; citations: Citation[]; searched: Citation[]; costUsd: number | null };

// The slice of a /v1/agent response this module reads.
type RawResponse = {
  id: string;
  status: string;
  model: string;
  output_text?: string;
  output: {
    type: string;
    code?: string;
    content?: { text: string; annotations?: { type?: string; url?: string; title?: string }[] }[];
    results?: { url?: string; title?: string; stdout?: string }[];
  }[];
  usage?: { cost?: { total_cost?: number } };
};

type Hit = { url?: string; title?: string; result?: Hit[] };

const ASSET = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?)(\?|$)/i;
const urlsIn = (text: string): Citation[] =>
  [...text.matchAll(/https?:\/\/[^\s'"<>)\]},|`]+/g)].map((m) => m[0].replace(/[.,;:]+$/, "")).filter((u) => !ASSET.test(u)).map((url) => ({ url }));

// Pages a sandbox step read. When search runs in the sandbox the agent writes its own Python, so the output
// is either pplx_sdk JSON ({results: [hit]} from search.web, {results: [{result: [hit]}]} from search.web_many)
// or free text; fetched URLs also sit in the code itself.
function sandboxHits(code: string, stdout: string): Citation[] {
  let hits: Citation[];
  try {
    const parsed = JSON.parse(stdout) as { results?: Hit[] };
    hits = (parsed.results ?? []).flatMap((x) => x.result ?? [x]).filter((x) => x.url).map((x) => ({ url: x.url!, ...(x.title ? { title: x.title } : {}) }));
  } catch {
    hits = urlsIn(stdout);
  }
  return [...urlsIn(code), ...hits];
}

// citations: what the answer itself links to (inline annotations, then links in the text).
// searched: every page the run pulled up or read. [web:N] markers are not mapped to hits: their numbering
// didn't match the hit order in fan-out searches, so we don't guess.
export function toAnswer(r: RawResponse): Answer {
  const collect = () => {
    const seen = new Map<string, Citation>();
    return { seen, add: (url: string | undefined, title?: string) => void (url && !seen.has(url) && seen.set(url, { url, ...(title ? { title } : {}) })) };
  };
  const cited = collect();
  const searched = collect();
  for (const item of r.output) {
    if (item.type === "message") for (const part of item.content ?? []) for (const a of part.annotations ?? []) cited.add(a.url, a.title);
    if (item.type === "search_results") for (const h of item.results ?? []) searched.add(h.url, h.title);
    if (item.type === "sandbox_results") for (const h of sandboxHits(item.code ?? "", (item.results ?? []).map((x) => x.stdout ?? "").join("\n"))) searched.add(h.url, h.title);
  }
  const text =
    r.output_text ??
    r.output.filter((i) => i.type === "message").flatMap((i) => (i.content ?? []).map((p) => p.text)).join("");
  for (const m of text.matchAll(/https?:\/\/[^\s)\]>"'`]+/g)) cited.add(m[0].replace(/[.,;:]+$/, ""));
  return { id: r.id, status: r.status, model: r.model, text, citations: [...cited.seen.values()], searched: [...searched.seen.values()], costUsd: r.usage?.cost?.total_cost ?? null };
}

// A web-grounded answer. With a skill id, the run can load that saved skill (which also turns on the sandbox).
export async function answer(input: string, opts: { effort?: string; skillId?: string; maxSteps?: number } = {}): Promise<Answer> {
  const res = await client().responses.create({
    effort: opts.effort ?? "low",
    input,
    tools: [{ type: "web_search" }, { type: "fetch_url" }],
    ...(opts.skillId ? { skills: [{ type: "custom" as const, id: opts.skillId }] } : {}),
    ...(opts.maxSteps ? { max_steps: opts.maxSteps } : {}),
  });
  return toAnswer(res as unknown as RawResponse);
}

// Skill names: 1-64 characters, lowercase letters, digits and single hyphens.
export function skillName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");
}

// A one-file skill bundle: <name>/SKILL.md in an uncompressed ZIP.
export function skillZip(name: string, skillMd: string): Uint8Array {
  const path = Buffer.from(`${skillName(name)}/SKILL.md`, "utf8");
  const data = Buffer.from(skillMd, "utf8");
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(0, 8); // stored
  local.writeUInt16LE(0, 10); // time
  local.writeUInt16LE(0x21, 12); // date: 1980-01-01
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(path.length, 26);
  local.writeUInt16LE(0, 28);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x21, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(path.length, 28);
  central.writeUInt32LE(0, 42); // offset of the local header
  const localSize = local.length + path.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + path.length, 12);
  end.writeUInt32LE(localSize, 16);
  return new Uint8Array(Buffer.concat([local, path, data, central, path, end]));
}

// Saves a skill to this API project. Name and description are read from the SKILL.md frontmatter.
export async function uploadSkill(name: string, skillMd: string) {
  const zip = skillZip(name, skillMd);
  return client().skills.create({ file: new Blob([zip as BlobPart], { type: "application/zip" }) });
}
