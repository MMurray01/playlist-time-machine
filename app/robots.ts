import type { MetadataRoute } from "next"
import { robotsPolicy } from "@/lib/seo/pages"

export default function robots(): MetadataRoute.Robots {
  return robotsPolicy()
}
