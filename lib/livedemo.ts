// Turns the compacted recording timelines in data/skill/live/sessions.json into the short lines the /skill demo shows.

const SEARCH_HOSTS = /(^|\.)(duckduckgo|google|bing)\./;
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

// "3. [00:09] open page "Pricing | Todoist" https://www.todoist.com/pricing" -> "Opened todoist.com/pricing".
// Returns null for steps that don't help a reader: opening a search engine, clicking into a field.
export function friendly(line: string): string | null {
  const body = line.replace(/^\d+\.\s+\[\d\d:\d\d\]\s+/, "");
  let m = body.match(/^(?:open page|switch to tab) "[^"]*" (\S+)$/);
  if (m) {
    const url = new URL(m[1]);
    if (SEARCH_HOSTS.test(url.hostname)) return null;
    return `Opened ${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  }
  m = body.match(/^submit field "[^"]*" with "([^"]*)"$/);
  if (m) return `Searched “${m[1]}”`;
  // Clicks on a field or a search button only echo the typing around them.
  if (/^click input\b/.test(body)) return null;
  m = body.match(/^click \S+ "([^"]+)"/);
  if (m) return `Clicked “${cut(m[1], 44)}”`;
  m = body.match(/^copy text "([^"]*)"$/);
  if (m) return `Copied “${cut(m[1], 44)}”`;
  return null;
}

// "Pricing analysis: compare Notion and Obsidian paid plans, ..." -> "Notion vs Obsidian".
export function sessionLabel(goal: string): string {
  const m = goal.match(/compare (.+?) paid plans/i);
  return m ? m[1].replace(/ and /g, " vs ") : goal;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function day(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  return `${MONTHS[mo - 1]} ${d}, ${y}`;
}
