import type { Metadata } from "next";
import Link from "next/link";
import Routing from "../receipt/routing";

export const metadata: Metadata = {
  title: "How my own router splits the work",
  description: "Who decides what when a task is handed to a local model: the router behind the prototype's code-checked local step.",
};

// Engineering notes, kept off the prototype page so that page stays on the three problems.
export default function RouterPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8">
      <p className="small pt-8">
        <Link href="/receipt">Back to the prototype</Link>
      </p>
      <Routing />
    </main>
  );
}
