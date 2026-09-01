"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flag, MessageSquare, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Avatar, Button, EmptyState, ErrorState, Spinner, Textarea, useToast } from "@/components/ui";
import { formatRelative } from "@/lib/format";

type CommentRow = {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  parentId: number | null;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function Comments({ newsId }: { newsId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [reportTarget, setReportTarget] = useState<CommentRow | null>(null);
  const [reportReason, setReportReason] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["comments", newsId],
    queryFn: () => api.get<CommentRow[]>(`/api/v1/comments?newsId=${newsId}`),
  });

  const submitMut = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ id: number; pendingModeration: boolean }>("/api/v1/comments", {
          newsId,
          content,
        })
      ).data,
    onSuccess: (res) => {
      setContent("");
      toast({
        title: res.pendingModeration
          ? "Bình luận chờ duyệt do nghi spam"
          : "Đã đăng bình luận",
        variant: "success",
      });
      void qc.invalidateQueries({ queryKey: ["comments", newsId] });
    },
    onError: (err) => {
      toast({
        title:
          err instanceof ApiError
            ? err.status === 401
              ? "Đăng nhập để bình luận"
              : err.code === "EMAIL_NOT_VERIFIED"
                ? "Xác thực email trước khi bình luận"
                : err.code === "RATE_LIMITED"
                  ? "Bình luận quá nhanh, thử lại sau"
                  : err.message
            : "Không thể gửi. Thử lại.",
        variant: "error",
      });
    },
  });

  const reportMut = useMutation({
    mutationFn: () =>
      api.post("/api/v1/reports", { targetType: "comment", targetId: reportTarget!.id, reason: reportReason }),
    onSuccess: () => {
      setReportTarget(null);
      setReportReason("");
      toast({ title: "Đã gửi báo cáo", variant: "success" });
    },
    onError: (err) => {
      toast({
        title: err instanceof ApiError && err.status === 401 ? "Đăng nhập để báo cáo" : "Không thể báo cáo",
        variant: "error",
      });
    },
  });

  return (
    <section aria-label="Bình luận" className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="h-5 w-5" aria-hidden />
        Bình luận {data ? `(${data.length})` : ""}
      </h2>

      <div className="mb-6">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ ý kiến của bạn…"
          aria-label="Nội dung bình luận"
          maxLength={2000}
          className="min-h-24"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.length}/2000</span>
          <Button
            size="sm"
            onClick={() => submitMut.mutate()}
            disabled={content.trim().length < 2 || submitMut.isPending}
          >
            {submitMut.isPending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" aria-hidden />}
            Gửi
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Spinner className="mx-auto h-6 w-6" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" />}
          title="Chưa có bình luận"
          hint="Hãy là người đầu tiên bình luận."
        />
      ) : (
        <ul className="space-y-4">
          {data.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-lg border bg-card p-4">
              <Avatar name={c.displayName} src={c.avatarUrl ?? undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{c.displayName}</span>
                  <span className="text-muted-foreground">@{c.username}</span>
                  <span className="text-xs text-muted-foreground">· {formatRelative(c.createdAt)}</span>
                </div>
                <p className="mt-1 break-words text-sm">{c.content}</p>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setReportTarget(c)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Flag className="h-3 w-3" aria-hidden /> Báo cáo
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reportTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Báo cáo bình luận">
          <div className="w-full max-w-md rounded-lg border bg-card p-5">
            <h3 className="font-semibold">Báo cáo bình luận</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              “{reportTarget.content.slice(0, 80)}{reportTarget.content.length > 80 ? "…" : ""}”
            </p>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Lý do báo cáo (tối thiểu 3 ký tự)"
              className="mt-3"
              maxLength={500}
              aria-label="Lý do báo cáo"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setReportTarget(null)}>
                Hủy
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => reportMut.mutate()}
                disabled={reportReason.trim().length < 3 || reportMut.isPending}
              >
                Gửi báo cáo
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
