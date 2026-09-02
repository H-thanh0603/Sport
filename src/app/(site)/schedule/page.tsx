import type { Metadata } from "next";
import { ScheduleView } from "@/components/matches/schedule-view";

export const metadata: Metadata = {
  title: "Lịch thi đấu — Sport",
  description: "Lịch thi đấu các môn thể thao theo ngày, giải đấu và trạng thái.",
  alternates: { canonical: "/schedule" },
};

export default function SchedulePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ScheduleView />
    </div>
  );
}
