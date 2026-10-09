import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import Tabs from "./tabs";
import ChartMotion from "./motion";
import ThemeToggle from "./theme";
import { readFileSync } from "node:fs";
import path from "node:path";
import "./globals.css";

// Atkinson Hyperlegible Next and Mono (SIL Open Font License), latin subset, variable weight.
const read = localFont({ src: "./fonts/Atkinson-Hyperlegible-Next.woff2", variable: "--font-read", weight: "200 800", adjustFontFallback: "Arial" });
const figures = localFont({ src: "./fonts/Atkinson-Hyperlegible-Mono.woff2", variable: "--font-figures", weight: "200 800", adjustFontFallback: false });

const serif = localFont({ src: "./fonts/LibreBaskerville.ttf", variable: "--font-serif", weight: "400 700", adjustFontFallback: false });

const EMAIL = "agupta7@tepper.cmu.edu";
const LINKEDIN = "https://www.linkedin.com/in/abhinavgupta0809";
const GITHUB = "https://github.com/abhinavgupta0809";
// Applied before first paint so a saved light theme does not flash dark.
const THEME_SCRIPT = `try{var t=localStorage.getItem("run-receipt-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: { default: "Run Receipt: a case study of Perplexity Computer", template: "%s | Run Receipt" },
  description: "Measured runs of Perplexity Computer and a prototype receipt for each agent run. A standalone replay of recorded runs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The reviews dashboard gets a link here once it has a public address (set in data/research.json).
  const { dashboardUrl } = JSON.parse(readFileSync(path.join(process.cwd(), "data", "research.json"), "utf8")) as { dashboardUrl: string | null };
  return (
    <html lang="en" className={`${read.variable} ${figures.variable} ${serif.variable} h-full antialiased`} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="masthead">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-4 sm:px-8">
            <div className="pb-3">
              <Link href="/" className="font-mono text-[1.0625rem] font-bold tracking-tight text-ink no-underline">
                Run Receipt
              </Link>
              <div className="masthead-links">
                <span>An outside study of Perplexity Computer by <strong>Abhinav Gupta</strong></span>
                <a href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a>
                <a href={GITHUB} target="_blank" rel="noopener">GitHub</a>
                <a href={`mailto:${EMAIL}`}>Email</a>
                {dashboardUrl ? <a className="dash" href={dashboardUrl} target="_blank" rel="noopener">Reviews dashboard</a> : <span className="soon" title="The link goes here when the dashboard is published">Reviews dashboard: link coming</span>}
                <ThemeToggle />
              </div>
            </div>
            <Tabs />
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <ChartMotion />
        <footer className="border-t border-rule">
          <div className="small mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
            <p className="max-w-[70ch]">
              Independent work. Not affiliated with Perplexity and not connected to its product. Every figure on this site comes from runs logged on one account. The test files are made up.
            </p>
            <p className="mt-2">
              Abhinav Gupta, MS Product Management, Carnegie Mellon. <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
