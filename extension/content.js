// Runs in every page. Sends clicks, field changes, submits and copies to the background while recording.
// Password, card and one-time-code fields are never saved; emails and long numbers are masked.

let recording = false;
chrome.storage.local.get("recording").then((s) => (recording = Boolean(s.recording)));
chrome.storage.onChanged.addListener((c) => {
  if (c.recording) recording = Boolean(c.recording.newValue);
});

const SENSITIVE = /pass|card|cvv|cvc|ssn|secret|token|otp|pin\b|iban|routing/i;
const clip = (s, n) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);
const mask = (s) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]").replace(/\d[\d\s-]{8,}\d/g, "[number]");

function labelOf(el) {
  const byFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
  return clip(el.getAttribute("aria-label") || byFor?.innerText || el.closest("label")?.innerText || el.placeholder || el.name || el.title, 80);
}

function isSensitive(el) {
  const ac = el.getAttribute("autocomplete") || "";
  return el.type === "password" || el.type === "hidden" || /cc-|one-time-code|password/.test(ac) || SENSITIVE.test(`${el.name} ${el.id} ${labelOf(el)}`);
}

function describe(el) {
  const t = el.closest("a, button, [role], input, select, textarea, summary, label") || el;
  return {
    tag: t.tagName.toLowerCase(),
    role: t.getAttribute("role") || undefined,
    text: clip(t.innerText || t.value, 80) || undefined,
    label: clip(t.getAttribute("aria-label") || t.title || t.alt, 80) || undefined,
    href: t.href ? String(t.href).slice(0, 300) : undefined,
  };
}

function send(event) {
  if (!recording) return;
  chrome.runtime.sendMessage({ type: "event", event: { ...event, url: location.href, title: document.title } }).catch(() => {});
}

document.addEventListener("click", (e) => send({ kind: "click", target: describe(e.target) }), true);

document.addEventListener(
  "change",
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    const value = isSensitive(el) ? "[redacted]" : el.type === "checkbox" || el.type === "radio" ? String(el.checked) : mask(clip(el.value, 200));
    send({ kind: "input", field: labelOf(el), value });
  },
  true,
);

document.addEventListener(
  "keydown",
  (e) => {
    const el = e.target;
    if (e.key === "Enter" && el instanceof HTMLInputElement) {
      send({ kind: "submit", field: labelOf(el), value: isSensitive(el) ? "[redacted]" : mask(clip(el.value, 200)) });
    }
  },
  true,
);

document.addEventListener("copy", () => {
  const text = String(window.getSelection() || "");
  if (text) send({ kind: "copy", text: mask(clip(text, 160)) });
});
