/**
 * Small local helpers not covered by `@/lib/format` (Package A).
 * Everything time-display goes through A's format lib per WORKPLAN §5.4;
 * these are only thin wrappers for kickoff time and UTC-day navigation.
 */

import { formatTimeOnly } from "@/lib/format";

export const formatKickoffTime = formatTimeOnly;

/** UTC calendar day key YYYY-MM-DD — matches API date filter convention. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** "Hôm nay" / "Ngày mai" / "Hôm qua" / "T3 03/09" label for a UTC day. */
export function formatDayNav(day: Date): string {
  const today = new Date();
  const diff = Math.round(
    (Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) -
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) /
      86_400_000,
  );
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(day);
}
