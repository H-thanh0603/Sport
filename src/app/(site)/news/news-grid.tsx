"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { NewsCard } from "@/components/news/news-card";
import { NewsCardSkeleton, EmptyState, ErrorState, Pagination, Badge } from "@/components/ui";
import type { NewsCard as NewsCardType } from "@/server/services/types";

type Category = { slug: string; name: string };

export function NewsGrid({ categories }: { categories: Category[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "views">("latest");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    perPage: "9",
    sort,
    ...(category ? { category } : {}),
  });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["news", category, sort, page],
    queryFn: () => api.getWithMeta<NewsCardType[]>(`/api/v1/news?${params}`),
  });

  type PageMeta = { pagination: { page: number; totalPages: number } };
  const meta = data?.meta as PageMeta | undefined;

  return (
    <div>
      {/* filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo chuyên mục">
        <button
          type="button"
          onClick={() => {
            setCategory(null);
            setPage(1);
          }}
          aria-pressed={category === null}
          className="focus-visible:outline-none"
        >
          <Badge variant={category === null ? "default" : "muted"} className="cursor-pointer px-3 py-1">
            Tất cả
          </Badge>
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => {
              setCategory(c.slug);
              setPage(1);
            }}
            aria-pressed={category === c.slug}
            className="focus-visible:outline-none"
          >
            <Badge variant={category === c.slug ? "default" : "muted"} className="cursor-pointer px-3 py-1">
              {c.name}
            </Badge>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <label htmlFor="news-sort" className="text-muted-foreground">
            Sắp xếp
          </label>
          <select
            id="news-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value === "views" ? "views" : "latest")}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="latest">Mới nhất</option>
            <option value="views">Xem nhiều</option>
          </select>
        </div>
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="Không có bài viết" hint="Chưa có tin nào trong chuyên mục này." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((n) => (
            <NewsCard key={n.id} news={n} />
          ))}
        </div>
      )}

      {meta && meta.pagination.totalPages > 1 ? (
        <div className="mt-8 flex justify-center">
          <Pagination
            page={meta.pagination.page}
            totalPages={meta.pagination.totalPages}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
