import "server-only"

import { listChartYears } from "@/lib/server/chart"
import { classYearsForChart, decadeStarts } from "@/lib/seo/pages"

export type SeoCatalog = {
  chartYears: number[]
  classYears: number[]
  decades: number[]
}

let pending: Promise<SeoCatalog> | null = null

/** Chart years, class years, and decade hubs. Fails the build when the library is empty. */
export function seoCatalog(): Promise<SeoCatalog> {
  pending ??= readSeoCatalog()
  return pending
}

async function readSeoCatalog(): Promise<SeoCatalog> {
  const chartYears = await listChartYears()
  if (chartYears.length === 0) {
    throw new Error("The chart library returned no years, so the class pages were not generated.")
  }
  const classYears = classYearsForChart(chartYears)
  if (classYears.length === 0) {
    throw new Error("No graduation years overlap the chart library.")
  }
  return {
    chartYears,
    classYears,
    decades: decadeStarts(chartYears),
  }
}
