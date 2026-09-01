import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-blue-600 to-indigo-800",
  "from-red-600 to-rose-900",
  "from-emerald-600 to-teal-900",
  "from-amber-500 to-orange-800",
  "from-purple-600 to-violet-900",
  "from-cyan-600 to-blue-900",
  "from-pink-600 to-fuchsia-900",
  "from-lime-600 to-green-900",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1)?.[0] ?? "?").toUpperCase();
}

function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!;
}

/** Logo/crest placeholder — initials trên gradient (chưa có object storage, mục 5.6). */
export function TeamLogo({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white",
        gradientFor(name),
        className ?? "h-10 w-10 text-base",
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
