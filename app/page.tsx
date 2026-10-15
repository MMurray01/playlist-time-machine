import { TimeMachine } from "@/components/time-machine"
import { recipientYearFromQuery } from "@/lib/share/recipient"
import { getChartYearSpan } from "@/lib/server/chart"
import { getAffiliateToken, getProviderAvailability } from "@/lib/server/env"
import { graduationYearLimits, isValidGraduationYear } from "@/lib/playlist/window"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; ref?: string }>
}) {
  const [span, providers, query] = await Promise.all([
    getChartYearSpan(),
    Promise.resolve(getProviderAvailability()),
    searchParams,
  ])
  const requested = recipientYearFromQuery(query.year, query.ref)
  const limits = graduationYearLimits({ chartMinYear: span.minYear, chartMaxYear: span.maxYear })
  const initialYear =
    requested.year != null && isValidGraduationYear(requested.year, limits) ? requested.year : null

  return (
    <TimeMachine
      providers={providers}
      libraryError={span.error}
      chartMinYear={span.minYear}
      chartMaxYear={span.maxYear}
      affiliateToken={getAffiliateToken()}
      initialYear={initialYear}
      autoBuild={initialYear != null && requested.fromSharePage && !span.error}
    />
  )
}
