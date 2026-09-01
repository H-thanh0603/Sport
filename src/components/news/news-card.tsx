import Link from "next/link";
import { Eye, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { NewsCover, BreakingFlag } from "./news-cover";
import { formatRelative, formatCount } from "@/lib/format";
import type { NewsCard as NewsCardType } from "@/server/services/types";

export function NewsCard({ news, priority }: { news: NewsCardType; priority?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/40">
      <Link
        href={`/news/${news.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative">
          <NewsCover slug={news.slug} className="h-40 w-full" label="NEWS" />
          <div className="absolute left-2 top-2 flex gap-1.5">
            {news.isBreaking ? <BreakingFlag /> : null}
            <Badge variant="muted" className="bg-background/80 backdrop-blur">
              {news.category.name}
            </Badge>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">
            {news.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{news.excerpt}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
            {news.authorName ? <span>{news.authorName}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden />
              {news.publishedAt ? formatRelative(news.publishedAt) : "Bản nháp"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden />
              {formatCount(news.viewCount)}
            </span>
            <span>{news.readingMinutes} phút đọc</span>
          </div>
        </div>
      </Link>
      {priority ? <span className="sr-only">Nổi bật</span> : null}
    </article>
  );
}

export function NewsCardCompact({ news }: { news: NewsCardType }) {
  return (
    <Link
      href={`/news/${news.slug}`}
      className="flex gap-3 rounded-md p-2 transition-colors hover:bg-muted/60"
    >
      <NewsCover slug={news.slug} className="h-14 w-20 shrink-0 rounded" label="N" />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium">{news.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {news.category.name} · {news.publishedAt ? formatRelative(news.publishedAt) : ""}
        </p>
      </div>
    </Link>
  );
}
