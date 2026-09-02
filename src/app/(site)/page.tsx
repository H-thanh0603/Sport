import type { Metadata } from "next";
import {
  HeroCarousel,
  TrendingNewsSection,
  UpcomingSection,
} from "@/components/matches/home-sections";
import { LiveNowSection } from "@/components/matches/live-section";
import { PopularLeaguesSection, ResultsSection } from "@/components/matches/results-section";

export const revalidate = 60; // ISR 60s per WORKPLAN §4 Package C

export const metadata: Metadata = {
  title: "Sport — Tỷ số trực tiếp, lịch thi đấu, tin tức thể thao",
  description:
    "Tỷ số trực tiếp các trận đấu, lịch thi đấu, kết quả, bảng xếp hạng và tin tức thể thao mới nhất.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <HeroCarousel />
      <LiveNowSection />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UpcomingSection />
          <ResultsSection />
        </div>
        <div className="space-y-6">
          <PopularLeaguesSection />
          <TrendingNewsSection />
        </div>
      </div>
    </div>
  );
}
