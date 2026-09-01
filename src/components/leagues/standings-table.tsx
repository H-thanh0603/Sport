import Link from "next/link";
import { Table, type TableColumn } from "@/components/ui";
import { TeamLogo } from "@/components/teams/team-logo";
import { FormDots, PositionChange } from "@/components/teams/form-dots";
import type { StandingRow } from "@/server/services/types";

const ZONE_LABELS = { ucl: "Champions League", el: "Europa League", rel: "Xuống hạng" } as const;

function zone(row: StandingRow, total: number): typeof ZONE_LABELS[keyof typeof ZONE_LABELS] | null {
  // Chỉ hiện vùng cho giải có ≥ 18 đội (đúng chuẩn top-5 châu Âu).
  if (total < 18) return null;
  if (row.position <= 4) return ZONE_LABELS.ucl;
  if (row.position === 5) return ZONE_LABELS.el;
  if (row.position >= total - 2) return ZONE_LABELS.rel;
  return null;
}

/** Bảng BXH chuẩn ESPN: # ↕ | Đội | Tr T H B | TG TH | HS | Đ | Phong độ. */
export function StandingsTable({
  rows,
  highlightTeamSlug,
  showZones = true,
}: {
  rows: StandingRow[];
  highlightTeamSlug?: string;
  showZones?: boolean;
}) {
  const total = rows.length;
  const columns: TableColumn<StandingRow>[] = [
    {
      key: "position",
      header: "#",
      align: "center",
      width: "44px",
      render: (row) => {
        const z = showZones ? zone(row, total) : null;
        return (
          <span
            className={
              z === ZONE_LABELS.ucl
                ? "font-bold text-primary"
                : z === ZONE_LABELS.rel
                  ? "font-bold text-destructive"
                  : undefined
            }
          >
            {row.position}
          </span>
        );
      },
    },
    {
      key: "movement",
      header: "",
      align: "center",
      width: "36px",
      render: (row) => <PositionChange current={row.position} previous={row.previousPosition} />,
    },
    {
      key: "team",
      header: "Đội",
      render: (row) => (
        <Link
          href={`/teams/${row.team.slug}`}
          className={
            row.team.slug === highlightTeamSlug
              ? "-mx-2 flex items-center gap-2 rounded bg-primary/10 px-2 py-1 font-medium hover:text-primary"
              : "flex items-center gap-2 font-medium hover:text-primary"
          }
        >
          <TeamLogo name={row.team.name} src={row.team.logoUrl} className="h-6 w-6 text-xs" />
          <span className="truncate">{row.team.name}</span>
        </Link>
      ),
    },
    { key: "played", header: "Tr", align: "center" },
    { key: "won", header: "T", align: "center" },
    { key: "drawn", header: "H", align: "center" },
    { key: "lost", header: "B", align: "center" },
    {
      key: "goalsFor",
      header: "TG",
      align: "center",
      render: (r) => <span className="hidden sm:table-cell">{r.goalsFor}</span>,
    },
    {
      key: "goalsAgainst",
      header: "TH",
      align: "center",
      render: (r) => <span className="hidden sm:table-cell">{r.goalsAgainst}</span>,
    },
    {
      key: "goalDiff",
      header: "HS",
      align: "center",
      render: (row) => (
        <span className={row.goalDiff > 0 ? "text-success" : row.goalDiff < 0 ? "text-destructive" : undefined}>
          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
        </span>
      ),
    },
    { key: "points", header: "Đ", align: "center", render: (row) => <span className="font-bold">{row.points}</span> },
    { key: "form", header: "Phong độ", align: "center", render: (row) => <FormDots form={row.form} /> },
  ];

  return <Table columns={columns} rows={rows} rowKey={(row) => row.team.id} empty="Chưa có dữ liệu bảng xếp hạng." />;
}
