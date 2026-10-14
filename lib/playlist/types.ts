export interface ChartHit {
  songId: number | null
  year: number
  weekNumber: number | null
  chartDate: string | null
  title: string
  artist: string
  genre: string
  /** Apple Music catalog song id, when the chart row has one. */
  appleSongId: string | null
  weeksAtNumberOne: number | null
}

export interface LongestRun {
  title: string
  artist: string
  weeks: number
}

export interface ArtistTally {
  artist: string
  hitCount: number
  weeks: number
}

export interface YearFacts {
  year: number
  hitCount: number
  longestRuns: LongestRun[]
  topArtists: ArtistTally[]
}

export interface YearStory {
  year: number
  decade: number
  facts: YearFacts
  /** Sentences derived only from this year's chart rows. */
  summary: string
  /**
   * Optional hand-written note. Null until an editor adds one.
   * Derived summary stays separate so later copy cannot overwrite the facts.
   */
  editorial: string | null
}

export interface YearChapter {
  year: number
  story: YearStory
  hits: ChartHit[]
}

export interface BuiltPlaylist {
  graduationYear: number
  startYear: number
  endYear: number
  genres: string[]
  title: string
  hits: ChartHit[]
  years: YearChapter[]
}

export interface CatalogCandidate {
  id: string
  title: string
  artist: string
  artworkUrl: string | null
  artworkLargeUrl?: string | null
  previewUrl?: string | null
  url: string | null
}

export interface MatchTrack {
  key: string
  title: string
  artist: string
  appleSongId?: string | null
}

export interface MatchedTrack {
  key: string
  title: string
  artist: string
  catalogId: string
  artworkUrl: string | null
  artworkLargeUrl?: string | null
  previewUrl?: string | null
  url: string | null
}

export interface UnmatchedTrack {
  key: string
  title: string
  artist: string
  reason: "not_in_catalog" | "search_failed"
}

export interface PlaylistCreateResult {
  ok: boolean
  playlistId: string | null
  playlistUrl: string | null
  addedCount: number
  requestedCount: number
  error: string | null
  status: number | null
}

export interface ProviderAvailability {
  apple: boolean
}
