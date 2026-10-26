const $ = (id) => document.getElementById(id);
const FORMAT = "session-to-skill/recording@1";

async function render() {
  const s = await chrome.storage.local.get(["recording", "events", "shots", "goal"]);
  const events = (s.events || []).length;
  const shots = (s.shots || []).length;
  $("state").classList.toggle("on", Boolean(s.recording));
  $("status").textContent = `${s.recording ? "Recording" : "Not recording"} · ${events} steps · ${shots} screenshots`;
  $("start").disabled = Boolean(s.recording);
  $("stop").disabled = !s.recording;
  $("export").disabled = Boolean(s.recording) || events === 0;
  if (document.activeElement !== $("goal")) $("goal").value = s.goal || "";
}

$("goal").addEventListener("input", () => chrome.storage.local.set({ goal: $("goal").value }));

$("start").addEventListener("click", async () => {
  await chrome.storage.local.set({ recording: true, startedAt: Date.now(), endedAt: null, events: [], shots: [] });
  await chrome.runtime.sendMessage({ type: "start" });
  render();
});

$("stop").addEventListener("click", async () => {
  await chrome.storage.local.set({ recording: false, endedAt: Date.now() });
  render();
});

$("clear").addEventListener("click", async () => {
  await chrome.storage.local.set({ recording: false, events: [], shots: [], goal: "", startedAt: null, endedAt: null });
  render();
});

$("export").addEventListener("click", async () => {
  const s = await chrome.storage.local.get(["events", "shots", "goal", "startedAt", "endedAt"]);
  const recordedOn = new Date(s.startedAt || Date.now()).toLocaleDateString("en-CA");
  const rec = { format: FORMAT, goal: s.goal || "", recordedOn, startedAt: s.startedAt, endedAt: s.endedAt, events: s.events || [], shots: s.shots || [] };
  const url = URL.createObjectURL(new Blob([JSON.stringify(rec)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `recording-${new Date(s.startedAt || Date.now()).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

chrome.storage.onChanged.addListener(render);
render();
