"use client";

import { useMutation } from "@tanstack/react-query";
import { Share2, Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export function ArticleActions({
  newsId,
  slug,
  title,
}: {
  newsId: number;
  slug: string;
  title: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const bookmarkMut = useMutation({
    mutationFn: (add: boolean) =>
      add
        ? api.post("/api/v1/bookmarks", { newsId })
        : api.del(`/api/v1/bookmarks?newsId=${newsId}`),
    onMutate: (add) => {
      setBookmarked(add);
    },
    onSuccess: (_d, add) => {
      toast({ title: add ? "Đã lưu bài viết" : "Đã bỏ lưu", variant: "success" });
    },
    onError: (err, _add, ctx) => {
      setBookmarked(false);
      void ctx;
      toast({
        title:
          err instanceof ApiError && err.status === 401
            ? "Đăng nhập để lưu bài viết"
            : "Không thể lưu. Thử lại.",
        variant: "error",
      });
    },
  });

  const share = async () => {
    const url = `${window.location.origin}/news/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled → fallthrough copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Đã sao chép liên kết", variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Không thể sao chép", variant: "error" });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void share()}
        aria-label="Chia sẻ bài viết"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
          copied ? "border-success/50 text-success" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        }`}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {copied ? "Đã sao chép!" : "Chia sẻ"}
      </button>
      <button
        type="button"
        onClick={() => bookmarkMut.mutate(!bookmarked)}
        aria-label={bookmarked ? "Bỏ lưu bài viết" : "Lưu bài viết"}
        aria-pressed={bookmarked}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
          bookmarked
            ? "border-primary/50 text-primary"
            : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
        }`}
      >
        {bookmarked ? (
          <Bookmark className="h-4 w-4 fill-current" aria-hidden />
        ) : (
          <BookmarkCheck className="h-4 w-4" aria-hidden />
        )}
        {bookmarked ? "Đã lưu" : "Lưu"}
      </button>
    </div>
  );
}
