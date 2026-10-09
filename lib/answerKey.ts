// Answer-key categorization for the September 2026 test file (Equinox as a subscription).
// Only used to grade recorded runs; the product itself would have no key.

export function keyCategory(description: string): string {
  if (/Salary/.test(description)) return "Income";
  if (/Rent/.test(description)) return "Housing";
  if (/Whole Foods|Trader Joe|Safeway/.test(description)) return "Groceries";
  if (/Starbucks|Chipotle|Sweetgreen|Blue Bottle|Doordash/.test(description)) return "Dining";
  if (/Uber|Lyft|BART/.test(description)) return "Transport";
  if (/PG&E|Comcast|T-Mobile/.test(description)) return "Utilities";
  if (/Netflix|Spotify|Adobe|ChatGPT|Prime|Equinox/.test(description)) return "Subscriptions";
  if (/Amazon Marketplace|Target/.test(description)) return "Shopping";
  return "Health";
}

// Rows where a second label is defensible. Perplexity's own cloud run 0b filed Equinox under Health.
const ALSO_ACCEPTABLE: Record<string, string> = { "Equinox Gym": "Health" };

export type Mislabel = { id: number; description: string; amount: number; got: string; expected: string; judgementCall: boolean };

// Label accuracy: the totals can add up to the file while individual rows sit in the wrong category.
export function labelAccuracy(
  txns: { id: number; description: string; amount: number }[],
  assignments: { id: number; category: string }[],
): { correct: number; total: number; mislabels: Mislabel[] } {
  const got = new Map(assignments.map((a) => [a.id, a.category]));
  const mislabels: Mislabel[] = [];
  for (const t of txns) {
    const expected = keyCategory(t.description);
    const g = got.get(t.id) ?? "(none)";
    if (g !== expected) mislabels.push({ id: t.id, description: t.description, amount: t.amount, got: g, expected, judgementCall: ALSO_ACCEPTABLE[t.description] === g });
  }
  return { correct: txns.length - mislabels.length, total: txns.length, mislabels };
}
