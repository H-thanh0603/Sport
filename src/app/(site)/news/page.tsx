import type { Metadata } from "next";
import { getPopularCategories } from "./category-cache";
import { NewsGrid } from "./news-grid";

export const metadata: Metadata = {
  title: "Tin tức thể thao — Sport",
  description:
    "Tin tức thể thao mới nhất: bóng đá, bóng rổ, tennis, esports, transfer, phân tích chiến thuật.",
};

export const revalidate = 60;

export default async function NewsPage() {
  const categories = await getPopularCategories();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tin tức</h1>
        <p className="mt-1 text-muted-foreground">
          Tin mới nhất, transfer, phân tích từ các môn thể thao.
        </p>
      </header>
      <NewsGrid categories={categories} />
    </div>
  );
}
