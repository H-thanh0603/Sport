import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

/** Deterministic gradient cover for news images (no external assets). */
export function NewsCover({
  slug,
  className,
  label,
}: {
  slug: string;
  className?: string;
  label?: string;
}) {
  const palettes = [
    "from-red-600/80 via-rose-700/60 to-slate-900",
    "from-blue-600/80 via-indigo-700/60 to-slate-900",
    "from-emerald-600/80 via-teal-700/60 to-slate-900",
    "from-orange-600/80 via-amber-700/60 to-slate-900",
    "from-violet-600/80 via-purple-700/60 to-slate-900",
    "from-cyan-600/80 via-sky-700/60 to-slate-900",
  ];
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const palette = palettes[Math.abs(h) % palettes.length]!;
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br",
        palette,
        className,
      )}
    >
      <span className="select-none text-4xl font-black uppercase tracking-widest text-white/25">
        {label ?? "SPORT"}
      </span>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
    </div>
  );
}

export function BreakingFlag() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-live/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-live">
      <Flame className="h-3 w-3" aria-hidden />
      Breaking
    </span>
  );
}
