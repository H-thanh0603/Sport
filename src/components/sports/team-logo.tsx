import { cn } from "@/lib/utils";

/** Gradient + initials logo placeholder (WORKPLAN §5.6 — no object storage yet). */
export function TeamLogo({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn("h-6 w-6 rounded-full object-cover", className)} />;
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/40 text-[10px] font-bold text-primary-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}
