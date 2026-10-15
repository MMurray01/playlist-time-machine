import type { MetadataRoute } from "next"
import { seoCatalog } from "@/lib/seo/catalog"
import { sitemapEntries } from "@/lib/seo/pages"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await seoCatalog()
  return sitemapEntries(catalog)
}
