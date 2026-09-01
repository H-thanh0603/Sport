/** Time & display formatting — all backend times are UTC ISO strings. */

export function formatMatchTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone ?? undefined,
    hour12: false,
  }).format(new Date(iso));
}

export function formatTimeOnly(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone ?? undefined,
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: timeZone ?? undefined,
  }).format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(iso);
}

export function formatScore(m: { homeScore: number | null; awayScore: number | null }): string {
  if (m.homeScore === null || m.awayScore === null) return "- vs -";
  return `${m.homeScore} - ${m.awayScore}`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case "live":
      return "LIVE";
    case "halftime":
      return "HT";
    case "finished":
      return "FT";
    case "postponed":
      return "Hoãn";
    case "cancelled":
      return "Hủy";
    case "scheduled":
      return "Sắp diễn ra";
    default:
      return status;
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
