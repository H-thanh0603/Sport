/** Form dots: W xanh / D vàng / L đỏ — 5 kết quả gần nhất. */
export function FormDots({ form, className }: { form: string | null; className?: string }) {
  if (!form) return <span className="text-xs text-muted-foreground">—</span>;
  const letters = form.slice(-5).split("");
  return (
    <span className={`flex items-center gap-1 ${className ?? ""}`} aria-label={`Phong độ: ${form}`}>
      {letters.map((l, i) => (
        <span
          key={i}
          className={
            l === "W"
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-white"
              : l === "D"
                ? "flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white"
                : l === "L"
                  ? "flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
                  : "flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
          }
        >
          {l}
        </span>
      ))}
    </span>
  );
}

/** Movement indicator: so sánh position hiện tại vs previousPosition (contract 5.2). */
export function PositionChange({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = previous - current;
  if (diff === 0) return <span className="text-xs font-bold text-muted-foreground">–</span>;
  return (
    <span className={diff > 0 ? "text-xs font-bold text-success" : "text-xs font-bold text-destructive"}>
      {diff > 0 ? `▲${diff}` : `▼${-diff}`}
    </span>
  );
}
