"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Ban, Undo2, KeyRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Pagination, Skeleton, useToast } from "@/components/ui";
import { formatRelative } from "@/lib/format";

type AdminUser = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: "user" | "moderator" | "admin";
  status: "active" | "banned";
  emailVerifiedAt: string | null;
  createdAt: string;
};

export function UsersAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ page: String(page), perPage: "20", ...(debounced ? { q: debounced } : {}) });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users", debounced, page],
    queryFn: () => api.getWithMeta<AdminUser[]>(`/api/v1/admin/users?${params}`),
  });

  const action = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/api/v1/admin/users", payload),
    onSuccess: (res: { data: unknown }) => {
      toast({ title: "Đã cập nhật", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void refetch();
      void res;
    },
    onError: () => toast({ title: "Không thể thực hiện", variant: "error" }),
  });

  const meta = data?.meta as { pagination: { page: number; totalPages: number } } | undefined;

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm theo email / username…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Tìm user"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="Không có user" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2">User</th>
                  <th className="p-2">Vai trò</th>
                  <th className="p-2">Trạng thái</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Tham gia</th>
                  <th className="p-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-2">
                      <p className="font-medium">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </td>
                    <td className="p-2">
                      <Badge variant={u.role === "admin" ? "default" : u.role === "moderator" ? "outline" : "muted"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {u.status === "banned" ? (
                        <Badge variant="warning">banned</Badge>
                      ) : (
                        <Badge variant="success">active</Badge>
                      )}
                      {u.emailVerifiedAt ? null : <span className="ml-1 text-xs text-muted-foreground">(chưa xác thực)</span>}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{u.email}</td>
                    <td className="p-2 text-xs text-muted-foreground">{formatRelative(u.createdAt)}</td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        {u.status === "banned" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action.mutate({ action: "unban", userId: u.id })}
                            aria-label={`Mở khóa ${u.username}`}
                          >
                            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Mở khóa
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Khóa tài khoản @${u.username}?`)) {
                                action.mutate({ action: "ban", userId: u.id });
                              }
                            }}
                            aria-label={`Khóa ${u.username}`}
                          >
                            <Ban className="h-3.5 w-3.5" aria-hidden /> Khóa
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const pw = prompt("Mật khẩu mới (≥8 ký tự, có chữ + số):");
                            if (pw) action.mutate({ action: "reset-password", userId: u.id, password: pw });
                          }}
                          aria-label={`Đặt lại mật khẩu ${u.username}`}
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden />
                        </Button>
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
