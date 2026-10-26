import { createHash, timingSafeEqual } from "node:crypto";

// Guards for the live skill run on /skill. Each run spends real API credit, so it needs the demo passcode.

const digest = (s: string) => createHash("sha256").update(s).digest();

export function passcodeOk(given: unknown, expected: string | undefined): boolean {
  if (!expected || typeof given !== "string") return false;
  return timingSafeEqual(digest(given.trim()), digest(expected));
}

export const QUESTION_MIN = 10;
export const QUESTION_MAX = 300;

export function cleanQuestion(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const s = q.replace(/\s+/g, " ").trim();
  return s.length >= QUESTION_MIN && s.length <= QUESTION_MAX ? s : null;
}
