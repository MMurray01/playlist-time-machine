import { TimeMachine } from "@/components/time-machine"
import { getChartYearSpan } from "@/lib/server/chart"
import { getProviderAvailability } from "@/lib/server/env"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [span, providers] = await Promise.all([
    getChartYearSpan(),
    Promise.resolve(getProviderAvailability()),
  ])

  return (
    <TimeMachine
      providers={providers}
      libraryError={span.error}
      chartMinYear={span.minYear}
      chartMaxYear={span.maxYear}
    />
  )
}
