"use client";

import { useSyncExternalStore } from "react";

type Device = "desktop" | "phone";
const KEY = "run-receipt-device";

// Desktop / Phone preview for the prototypes. The layout script in <head> applies a saved choice before
// first paint (html[data-device]); this only switches it and remembers it across pages.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const current = (): Device => (document.documentElement.dataset.device === "phone" ? "phone" : "desktop");

export default function DeviceToggle() {
  const device = useSyncExternalStore(subscribe, current, () => "desktop" as Device);
  const pick = (d: Device) => {
    document.documentElement.dataset.device = d;
    try { localStorage.setItem(KEY, d); } catch {}
    listeners.forEach((fn) => fn());
  };
  return (
    <div className="device-toggle" role="group" aria-label="Preview as">
      <button type="button" aria-pressed={device === "desktop"} onClick={() => pick("desktop")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
        Desktop
      </button>
      <button type="button" aria-pressed={device === "phone"} onClick={() => pick("phone")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
        Phone
      </button>
    </div>
  );
}

// The phone bezel. In desktop mode both wrappers are display:contents, so the window sits in the page as is.
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="device-frame">
      <div className="device-screen">
        <div className="device-status" aria-hidden="true"><span>9:41</span><span className="island" /><span>●●●</span></div>
        {children}
      </div>
    </div>
  );
}
