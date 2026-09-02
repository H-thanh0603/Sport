"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, Trash2, Flag } from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Skeleton, useToast } from "@/components/ui";
import { formatRelative } from "@/lib/format";

type PendingComment = {
  id: number;
  content: string;
  status: string;
  createdAt: string;
  newsTitle: string;
  newsSlug: string;
  userId: number;
  username: string;
  displayName: string;
};

type OpenReport = {
  id: number;
  targetType: string;
  targetId: number;
  reason: string;
  status: string;
  createdAt: string;
  reporter: string;
  targetContent: string | null;
};

export function CommentsModeration() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-comments", "pending"],
    queryFn: () => api.get<PendingComment[]>("/api/v1/admin/comments?status=pending"),
  });

  const moderate = useMutation({
    mutationFn: (payload: { commentId: number; action: "approve" | "hide" | "delete" }) =>
      api.post("/api/v1/admin/comments", payload),
    onSuccess: () => {
      toast({ title: "Đã xử lý", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-comments"] });
    },
    onError: () => toast({ title: "Không thể xử lý", variant: "error" }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  const items = data ?? [];

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <h2 className="font-semibold">Bình luận chờ duyệt ({items.length})</h2>
        {items.length === 0 ? (
          <EmptyState title="Không có bình luận chờ duyệt" hint="Hàng loạt spam tự động vào đây để bạn duyệt." />
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li key={c.id} className="rounded-lg border p-3">
                <p className="text-sm">{c.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  @{c.username} · {formatRelative(c.createdAt)} · trên{" "}
                  <span className="underline">{c.newsTitle}</span>
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => moderate.mutate({ commentId: c.id, action: "approve" })}>
                    <Check className="h-3.5 w-3.5" aria-hidden /> Duyệt
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moderate.mutate({ commentId: c.id, action: "hide" })}>
                    <EyeOff className="h-3.5 w-3.5" aria-hidden /> Ẩn
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => moderate.mutate({ commentId: c.id, action: "delete" })}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Xóa
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsModeration() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-reports", "open"],
    queryFn: () => api.get<OpenReport[]>("/api/v1/admin/reports?status=open"),
  });

  const resolve = useMutation({
    mutationFn: (payload: { reportId: number; action: "resolve" | "dismiss"; hideTarget?: boolean }) =>
      api.post("/api/v1/admin/reports", payload),
    onSuccess: () => {
      toast({ title: "Đã xử lý báo cáo", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: () => toast({ title: "Không thể xử lý", variant: "error" }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  const items = data ?? [];

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Flag className="h-4 w-4 text-warning" aria-hidden /> Báo cáo chờ xử lý ({items.length})
        </h2>
        {items.length === 0 ? (
          <EmptyState title="Không có báo cáo" />
        ) : (
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="warning">{r.targetType}</Badge>
                  <span>báo cáo bởi @{r.reporter}</span>
                  <span>· {formatRelative(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm font-medium">Lý do: {r.reason}</p>
                {r.targetContent ? (
                  <p className="mt-1 rounded bg-muted/50 p-2 text-sm text-muted-foreground">“{r.targetContent}”</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => resolve.mutate({ reportId: r.id, action: "resolve", hideTarget: true })}
                  >
                    Xử lý + ẩn nội dung
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve.mutate({ reportId: r.id, action: "resolve" })}>
                    Xử lý (giữ nội dung)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ reportId: r.id, action: "dismiss" })}>
                    Bỏ qua
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
