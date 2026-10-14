import { Suspense } from "react"
import { TimeMachine } from "@/components/time-machine"
import { listChartGenres } from "@/lib/server/chart"
import { getProviderAvailability } from "@/lib/server/env"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [library, providers] = await Promise.all([
    listChartGenres(),
    Promise.resolve(getProviderAvailability()),
  ])

  return (
    <Suspense fallback={<p className="sheet px-4 py-16">Loading Playlist Time Machine.</p>}>
      <TimeMachine genres={library.genres} providers={providers} libraryError={library.error} />
    </Suspense>
  )
}
