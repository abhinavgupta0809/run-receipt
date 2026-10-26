// Just enough Markdown to show an agent's answer: paragraphs, bullet lists, tables, bold and links.
// [web:N] markers are dropped because their numbers don't map to the pages the run read.

export type Inline = { kind: "text" | "bold"; text: string } | { kind: "link"; text: string; href: string };
export type Block = { kind: "p"; parts: Inline[] } | { kind: "list"; items: Inline[][] } | { kind: "table"; head: Inline[][]; rows: Inline[][][] };

export const stripMarkers = (s: string) => s.replace(/[ \t]*\[web:\d+\]/g, "");

const TOKEN = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/g;

// Markdown backslash escapes like \* come through literally; show the character instead.
const unescape = (s: string) => s.replace(/\\([\\`*_{}[\]()#+\-.!$|])/g, "$1");

export function inline(s: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(TOKEN)) {
    if (m.index > last) out.push({ kind: "text", text: unescape(s.slice(last, m.index)) });
    if (m[1] !== undefined) out.push({ kind: "bold", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "link", text: m[2], href: m[3] });
    else {
      const href = m[4].replace(/[.,;:]+$/, "");
      out.push({ kind: "link", text: href.replace(/^https?:\/\/(www\.)?/, ""), href });
      if (href.length < m[4].length) out.push({ kind: "text", text: m[4].slice(href.length) });
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ kind: "text", text: unescape(s.slice(last)) });
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
const isRule = (row: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(row) && row.includes("-");

export function blocks(md: string): Block[] {
  const lines = stripMarkers(md).split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      const body = rows.slice(1).filter((r) => !isRule(r));
      out.push({ kind: "table", head: cells(rows[0]), rows: body.map(cells) });
    } else if (/^\s*[-*] /.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(inline(lines[i++].replace(/^\s*[-*] /, "")));
      out.push({ kind: "list", items });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith("|") && !/^\s*[-*] /.test(lines[i])) para.push(lines[i++].trim());
      out.push({ kind: "p", parts: inline(para.join(" ").replace(/^#+\s*/, "")) });
    }
  }
  return out;
}
