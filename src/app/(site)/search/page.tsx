import type { Metadata } from "next";
import { searchService } from "@/server/services";
import { notFound } from "next/navigation";
import { SearchResultsView } from "./results-view";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Tìm kiếm: ${q} — Sport` : "Tìm kiếm — Sport", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  if (!q || q.trim().length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Tìm kiếm</h1>
        <p className="mt-2 text-muted-foreground">
          Nhập từ khóa tối thiểu 2 ký tự. Mở nhanh bằng ⌘K / Ctrl+K.
        </p>
      </div>
    );
  }
  const trimmed = q.trim().slice(0, 64);
  let results;
  try {
    results = await searchService.all(trimmed, 8);
  } catch {
    notFound();
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Kết quả cho “{trimmed}”
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{results.total} kết quả</p>
      <SearchResultsView q={trimmed} />
      <div className="mt-8 grid gap-6">
        <ResultSection label="Đội bóng" items={results.teams.map((t) => ({ href: `/teams/${t.slug}`, title: t.name, sub: t.country ?? undefined }))} />
        <ResultSection label="Cầu thủ / Vận động viên" items={results.players.map((p) => ({ href: `/players/${p.slug}`, title: p.name, sub: [p.position, p.team?.name].filter(Boolean).join(" · ") || undefined }))} />
        <ResultSection label="Giải đấu" items={results.leagues.map((l) => ({ href: `/leagues/${l.slug}`, title: l.name, sub: [l.country, l.sport.name].filter(Boolean).join(" · ") || undefined }))} />
        <ResultSection label="Tin tức" items={results.news.map((n) => ({ href: `/news/${n.slug}`, title: n.title, sub: n.category.name }))} />
      </div>
    </div>
  );
}

function ResultSection({
  label,
  items,
}: {
  label: string;
  items: { href: string; title: string; sub?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={label}>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label} ({items.length})
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((it) => (
          <li key={it.href}>
            <a href={it.href} className="block px-4 py-3 transition-colors hover:bg-muted/50">
              <p className="font-medium">{it.title}</p>
              {it.sub ? <p className="text-sm text-muted-foreground">{it.sub}</p> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
