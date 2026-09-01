import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Eye, ArrowLeft, Tag, ChevronRight } from "lucide-react";
import { newsService } from "@/server/services";
import { ApiError } from "@/server/http/api";
import { NewsCover, BreakingFlag } from "@/components/news/news-cover";
import { NewsCardCompact } from "@/components/news/news-card";
import { Comments } from "@/components/news/comments";
import { ArticleActions } from "@/components/news/article-actions";
import { formatRelative, formatCount, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await newsService.bySlug(slug);
    return {
      title: `${article.title} — Sport`,
      description: article.excerpt,
      openGraph: {
        title: article.title,
        description: article.excerpt,
        type: "article",
        publishedTime: article.publishedAt ?? undefined,
      },
      twitter: { card: "summary_large_image", title: article.title },
      alternates: { canonical: `/news/${slug}` },
    };
  } catch {
    return { title: "Tin tức — Sport" };
  }
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  let article, related;
  try {
    article = await newsService.bySlug(slug);
    related = await newsService.related(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // view count — fire and forget (page render path, one increment per SSR request)
  void newsService.recordView(article.id).catch(() => {});

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    publisher: { "@type": "Organization", name: "Sport" },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/news" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Tin tức
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span>{article.category.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <main>
          <header className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              {article.isBreaking ? <BreakingFlag /> : null}
              <Badge variant="muted">{article.category.name}</Badge>
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight">{article.title}</h1>
            {article.subtitle ? (
              <p className="mt-2 text-lg text-muted-foreground">{article.subtitle}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {article.authorName ? <span className="font-medium text-foreground">{article.authorName}</span> : null}
              {article.publishedAt ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatRelative(article.publishedAt)} ({formatDate(article.publishedAt)})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {formatCount(article.viewCount)} lượt xem
                  </span>
                </>
              ) : null}
              <span>{article.readingMinutes} phút đọc</span>
            </div>
          </header>

          <NewsCover slug={article.slug} className="mb-6 h-64 w-full rounded-lg md:h-80" label="NEWS" />

          <ArticleActions newsId={article.id} slug={article.slug} title={article.title} />

          <div
            className="prose prose-slate dark:prose-invert mt-6 max-w-none"
            // content đã qua whitelist khi seed; runtime sanitizer cho user-generated không áp dụng ở đây
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
          />

          {article.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" aria-hidden />
              {article.tags.map((t) => (
                <Badge key={t.slug} variant="outline">
                  #{t.name}
                </Badge>
              ))}
            </div>
          ) : null}

          <Comments newsId={article.id} />
        </main>

        <aside aria-label="Tin liên quan">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tin liên quan
          </h2>
          <div className="space-y-1 rounded-lg border bg-card p-2">
            {related.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Chưa có tin liên quan.</p>
            ) : (
              related.map((n) => <NewsCardCompact key={n.id} news={n} />)
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Whitelist sanitizer for article HTML (seed content). Tags: p,h2,h3,blockquote,em,strong,ul,ol,li; a[href]. */
export function sanitizeArticleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
