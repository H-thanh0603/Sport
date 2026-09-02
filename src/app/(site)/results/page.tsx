import type { Metadata } from "next";
import { ResultsView } from "@/components/matches/results-view";

export const metadata: Metadata = {
  title: "Kết quả thi đấu — Sport",
  description: "Kết quả các trận đấu thể thao theo ngày và giải đấu.",
  alternates: { canonical: "/results" },
};

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ResultsView />
    </div>
  );
}
