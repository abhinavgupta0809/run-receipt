"use client";

// Switches between the dark and light themes and remembers the choice. Dark is the default.
export default function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("run-receipt-theme", next); } catch { /* The switch still works without storage. */ }
  };
  return <button type="button" className="theme-toggle" onClick={flip} aria-label="Switch between dark and light theme"><i aria-hidden="true" />Theme</button>;
}
