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
    <Suspense
      fallback={
        <main className="sheet px-1 py-16">
          <p role="status">Loading Playlist Time Machine.</p>
        </main>
      }
    >
      <TimeMachine genres={library.genres} providers={providers} libraryError={library.error} />
    </Suspense>
  )
}
