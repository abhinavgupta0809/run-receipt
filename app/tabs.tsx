"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "The problem" },
  { href: "/evidence", label: "Evidence" },
  { href: "/receipt", label: "Prototype" },
  { href: "/skill", label: "Session to Skill", short: "Skill" },
];

export default function Tabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="tabs-row flex gap-1">
      {TABS.map((t) => {
        const current = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={current ? "page" : undefined}
            className={`-mb-px rounded-t-md border border-b-0 whitespace-nowrap px-3.5 py-2 text-[0.9375rem] font-semibold no-underline transition-colors sm:px-5 ${
              current ? "border-rule bg-paper text-ink" : "border-transparent text-ink2 hover:bg-paper/60 hover:text-ink"
            }`}
          >
            {"short" in t && t.short ? <><span className="tab-long">{t.label}</span><span className="tab-short">{t.short}</span></> : t.label}
          </Link>
        );
      })}
    </nav>
  );
}
