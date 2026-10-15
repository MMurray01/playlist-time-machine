import { hitKey } from "@/lib/playlist/hits"
import type { ChartHit } from "@/lib/playlist/types"

export function HitList({ hits }: { hits: ChartHit[] }) {
  return (
    <ol className="hit-list">
      {hits.map((hit) => (
        <li key={hitKey(hit)}>
          <span className="hit-title">{hit.title}</span>
          <span className="hit-artist">{hit.artist}</span>
        </li>
      ))}
    </ol>
  )
}
