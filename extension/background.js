// Holds the recording in chrome.storage.local so it survives the service worker sleeping.
// Logs page loads and tab switches, and takes a small screenshot after pages and clicks.

const MAX_SHOTS = 40;
const SHOT_GAP_MS = 2000;
const SHOT_WIDTH = 1280;
let lastShot = 0;
let pending;
let queue = Promise.resolve();

// Serialize writes so events from several tabs don't overwrite each other.
function update(fn) {
  queue = queue.then(async () => {
    const s = await chrome.storage.local.get(["recording", "events", "shots"]);
    if (!s.recording) return;
    await chrome.storage.local.set(fn({ events: s.events || [], shots: s.shots || [] }));
  });
  return queue;
}

function log(event) {
  return update((s) => ({ events: [...s.events, { t: Date.now(), ...event }] }));
}

async function toDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type};base64,${btoa(bin)}`;
}

async function shoot() {
  const now = Date.now();
  if (now - lastShot < SHOT_GAP_MS) return;
  lastShot = now;
  try {
    const png = await chrome.tabs.captureVisibleTab(undefined, { format: "png" });
    const bitmap = await createImageBitmap(await (await fetch(png)).blob());
    const scale = Math.min(1, SHOT_WIDTH / bitmap.width);
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = await toDataUrl(await canvas.convertToBlob({ type: "image/jpeg", quality: 0.6 }));
    await update((s) => (s.shots.length >= MAX_SHOTS ? {} : { shots: [...s.shots, { t: now, afterEvent: s.events.length - 1, image }] }));
  } catch {
    // Pages like the Chrome Web Store or a closed window can't be captured; skip them.
  }
}

function shootSoon() {
  clearTimeout(pending);
  pending = setTimeout(shoot, 700);
}

const recordable = (url) => /^https?:/.test(url || "");

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete" || !recordable(tab.url) || !tab.active) return;
  await log({ kind: "page", url: tab.url, title: tab.title });
  shootSoon();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!recordable(tab.url)) return;
  await log({ kind: "tab", url: tab.url, title: tab.title });
  shootSoon();
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "event" && sender.tab?.active) {
    log(msg.event).then(() => {
      if (msg.event.kind === "click" || msg.event.kind === "submit") shootSoon();
    });
  }
  if (msg.type === "start") {
    lastShot = 0;
    chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
      if (recordable(tab?.url)) {
        await log({ kind: "page", url: tab.url, title: tab.title });
        shoot();
      }
    });
  }
});
