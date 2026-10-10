import type { Metadata } from "next";
import { load } from "../data";
import Replay from "./replay";

export const metadata: Metadata = {
  title: "Prototype",
  description: "A replay of recorded Perplexity Computer runs as a receipt: plan and cost range before, a provisional credit count during, checks and repairs after.",
};

export default function ReceiptPage() {
  return (
    <Replay data={load().replay} />
  );
}
