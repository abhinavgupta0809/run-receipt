"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Plays each chart's marks in when the chart scrolls into view, and again each time it comes back into view.
// Charts render fully drawn; this only arms them once the page is live, so nothing is hidden without JavaScript
// or when the reader has asked for less motion.
export default function ChartMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.15) e.target.setAttribute("data-motion", "in");
        else if (!e.isIntersecting) e.target.setAttribute("data-motion", "wait");
      }
    }, { threshold: [0, 0.15] });
    // Arm every chart on the page with this observer. A chart armed by an earlier observer (the page before a
    // tab click) is observed again here, so it can never be left waiting with nothing watching it.
    const arm = () => {
      for (const el of document.querySelectorAll("[data-chart]")) {
        if (!el.hasAttribute("data-motion")) el.setAttribute("data-motion", "wait");
        seen.observe(el);
      }
    };
    arm();
    // Charts inside a closed <details> or added by an interaction are armed when they appear.
    const added = new MutationObserver(arm);
    added.observe(document.body, { childList: true, subtree: true });
    return () => {
      seen.disconnect();
      added.disconnect();
      // Leave nothing collapsed behind: charts still on the page go back to fully drawn until re-armed.
      for (const el of document.querySelectorAll('[data-motion="wait"]')) el.removeAttribute("data-motion");
    };
  }, [pathname]);
  return null;
}
