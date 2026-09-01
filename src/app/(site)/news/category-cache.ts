/** Server-side cached category list — shared with detail page tags. */
import { newsService } from "@/server/services";
import { cached } from "@/server/cache";

export async function getPopularCategories() {
  return cached("v1:news:categories:page", 600, () => newsService.categories());
}
