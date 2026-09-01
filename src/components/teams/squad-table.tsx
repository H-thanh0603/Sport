const POSITION_VN: Record<string, string> = {
  GK: "Thủ môn", DF: "Hậu vệ", MF: "Tiền vệ", FW: "Tiền đạo",
};
const ORDER: Record<string, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };

export type SquadRow = {
  playerId: number;
  slug: string;
  name: string;
  position: string | null;
  shirtNumber: number | null;
  isCaptain: boolean;
  nationality: string | null;
  birthDate: string | null;
};

function ageOf(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function positionGroup(pos: string | null): string {
  return POSITION_VN[pos ?? ""] ?? "Khác";
}

/** Bảng squad nhóm theo vị trí — GK/DF/MF/FW. */
export function SquadTable({ squad }: { squad: SquadRow[] }) {
  if (squad.length === 0) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">Chưa có dữ liệu đội hình.</p>;
  }
  const groups = new Map<string, SquadRow[]>();
  for (const p of [...squad].sort(
    (a, b) =>
      (ORDER[a.position ?? ""] ?? 9) - (ORDER[b.position ?? ""] ?? 9) ||
      (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99),
  )) {
    const g = positionGroup(p.position);
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(p);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, players]) => (
        <section key={group}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
          <ul className="divide-y divide-border/60 rounded-lg border border-border">
            {players.map((p) => (
              <li key={p.playerId} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-7 shrink-0 text-center font-mono text-muted-foreground">{p.shirtNumber ?? "-"}</span>
                <a href={`/players/${p.slug}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary">
                  {p.name}
                  {p.isCaptain ? <span className="ml-1.5 text-xs text-warning" title="Đội trưởng">(C)</span> : null}
                </a>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{p.nationality ?? "—"}</span>
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                  {ageOf(p.birthDate) !== null ? `${ageOf(p.birthDate)}t` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
