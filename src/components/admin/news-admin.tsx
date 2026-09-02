"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, Star, Plus, Archive } from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, CardContent, Dialog, EmptyState, ErrorState, Input, Pagination, Skeleton, Textarea, useToast } from "@/components/ui";
import { formatRelative, formatCount } from "@/lib/format";

type AdminNews = {
  id: number;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  viewCount: number;
  isBreaking: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  category: string;
  author: string | null;
};

export function NewsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-news", page],
    queryFn: () => api.getWithMeta<AdminNews[]>(`/api/v1/admin/news?page=${page}&perPage=15`),
  });

  const edit = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/api/v1/admin/news", payload),
    onSuccess: () => {
      toast({ title: "Đã cập nhật", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-news"] });
    },
    onError: () => toast({ title: "Không thể cập nhật", variant: "error" }),
  });

  const archive = useMutation({
    mutationFn: (newsId: number) => api.del(`/api/v1/admin/news?newsId=${newsId}`),
    onSuccess: () => {
      toast({ title: "Đã lưu trữ", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-news"] });
    },
    onError: () => toast({ title: "Không thể lưu trữ", variant: "error" }),
  });

  const meta = data?.meta as { pagination: { page: number; totalPages: number } } | undefined;

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Bài viết</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Viết bài
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="Không có bài viết" />
        ) : (
          <ul className="space-y-2">
            {data.data.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>{n.category}</span>
                    <span>{n.author}</span>
                    <span>{formatCount(n.viewCount)} lượt xem</span>
                    {n.publishedAt ? <span>{formatRelative(n.publishedAt)}</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={n.status === "published" ? "success" : n.status === "archived" ? "muted" : "warning"}>
                    {n.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant={n.isBreaking ? "destructive" : "ghost"}
                    aria-label={n.isBreaking ? "Bỏ breaking" : "Đánh dấu breaking"}
                    onClick={() => edit.mutate({ newsId: n.id, isBreaking: !n.isBreaking })}
                  >
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant={n.isFeatured ? "default" : "ghost"}
                    aria-label={n.isFeatured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                    onClick={() => edit.mutate({ newsId: n.id, isFeatured: !n.isFeatured })}
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  {n.status !== "archived" ? (
                    <Button size="sm" variant="outline" aria-label="Lưu trữ" onClick={() => archive.mutate(n.id)}>
                      <Archive className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => edit.mutate({ newsId: n.id, status: "published" })}>
                      Đăng lại
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {meta && meta.pagination.totalPages > 1 ? (
          <div className="flex justify-center">
            <Pagination page={meta.pagination.page} totalPages={meta.pagination.totalPages} onChange={setPage} />
          </div>
        ) : null}
      </CardContent>

      {createOpen ? <CreateNewsDialog onClose={() => setCreateOpen(false)} /> : null}
    </Card>
  );
}

function CreateNewsDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categorySlug, setCategorySlug] = useState("football");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/v1/admin/news", { title, excerpt, content, categorySlug });
      toast({ title: "Đã đăng bài", variant: "success" });
      void qc.invalidateQueries({ queryKey: ["admin-news"] });
      onClose();
    } catch {
      toast({ title: "Không thể đăng. Kiểm tra dữ liệu.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Viết bài mới">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={5} maxLength={250} />
        <div className="space-y-1.5">
          <label htmlFor="news-cat" className="text-sm font-medium">Chuyên mục</label>
          <select
            id="news-cat"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {["breaking", "football", "basketball", "tennis", "badminton", "volleyball", "esports", "transfer", "analysis"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Input label="Tóm tắt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required minLength={10} maxLength={320} />
        <Textarea label="Nội dung" value={content} onChange={(e) => setContent(e.target.value)} required minLength={20} className="min-h-48" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang đăng…" : "Đăng bài"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
