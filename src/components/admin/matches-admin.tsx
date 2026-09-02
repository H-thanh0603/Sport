"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Pagination, Select, Skeleton, useToast } from "@/components/ui";
import { formatMatchTime } from "@/lib/format";

type AdminMatch = {
  id: number;
  startTime: string;
  status: "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  homeTeam: string;
  awayTeam: string;
  league: string;
};

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Sắp diễn ra" },
  { value: "live", label: "Đang đấu" },
  { value: "halftime", label: "Nghỉ giữa" },
  { value: "finished", label: "Kết thúc" },
  { value: "postponed", label: "Hoãn" },
  { value: "cancelled", label: "Hủy" },
];

export function MatchesAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), perPage: "20", ...(status ? { status } : {}) });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-matches", status, page],
    queryFn: () => api.getWithMeta<AdminMatch[]>(`/api/v1/admin/matches?${params}`),
  });

  const edit = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/api/v1/admin/matches", payload),
    onSuccess: () => {
      toast({ title: "Đã cập nhật trận đấu", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-matches"] });
    },
    onError: () => toast({ title: "Không thể cập nhật", variant: "error" }),
  });

  const meta = data?.meta as { pagination: { page: number; totalPages: number } } | undefined;

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Lọc theo trạng thái"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "Tất cả trạng thái" }, ...STATUS_OPTIONS]}
            className="w-48"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="Không có trận đấu" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2">Trận</th>
                  <th className="p-2">Giải</th>
                  <th className="p-2">Bắt đầu</th>
                  <th className="p-2">Trạng thái</th>
                  <th className="p-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-2">
                      <p className="font-medium">
                        {m.homeTeam} vs {m.awayTeam}
                      </p>
                      {m.homeScore !== null ? (
                        <p className="text-xs text-muted-foreground">
                          {m.homeScore} - {m.awayScore}
                          {m.status === "live" && m.minute ? ` (${m.minute}')` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{m.league}</td>
                    <td className="p-2 text-xs">{formatMatchTime(m.startTime)}</td>
                    <td className="p-2">
                      <Badge
                        variant={
                          m.status === "live" ? "live" : m.status === "finished" ? "success" : m.status === "postponed" ? "warning" : "muted"
                        }
                      >
                        {m.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        {m.status !== "postponed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => edit.mutate({ matchId: m.id, status: "postponed", postponedReason: "Lý do quản trị" })}
                          >
                            Hoãn
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => edit.mutate({ matchId: m.id, status: "scheduled" })}>
                            Hủy hoãn
                          </Button>
                        )}
                        {m.status !== "cancelled" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Hủy trận này?")) edit.mutate({ matchId: m.id, status: "cancelled" });
                            }}
                          >
                            Hủy trận
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.pagination.totalPages > 1 ? (
          <div className="flex justify-center">
            <Pagination page={meta.pagination.page} totalPages={meta.pagination.totalPages} onChange={setPage} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
