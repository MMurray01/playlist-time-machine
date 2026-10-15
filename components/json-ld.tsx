import { jsonLdMarkup } from "@/lib/seo/jsonld"

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdMarkup(data) }} />
}
