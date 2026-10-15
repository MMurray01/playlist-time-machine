import Foundation

struct ApiCatalog: Codable, Equatable {
    let catalogId: String
    let artworkUrl: String?
    let artworkLargeUrl: String?
    let previewUrl: String?
    let url: String?
}

struct ApiHit: Codable, Equatable, Identifiable {
    var id: String { key }
    let key: String
    let songId: Int?
    let year: Int
    let weekNumber: Int?
    let chartDate: String?
    let title: String
    let artist: String
    let genre: String
    let weeksAtNumberOne: Int?
    let catalog: ApiCatalog?
    let matchReason: String?
    let appleMusicUrl: String

    var weeksText: String? {
        guard let weeksAtNumberOne, weeksAtNumberOne > 0 else { return nil }
        return weeksAtNumberOne == 1 ? "1 week at No. 1" : "\(weeksAtNumberOne) weeks at No. 1"
    }

    var previewURL: URL? {
        guard let raw = catalog?.previewUrl, let url = URL(string: raw), url.scheme == "https" else { return nil }
        return url
    }

    var appleURL: URL? {
        guard let url = URL(string: appleMusicUrl), url.scheme == "https" else { return nil }
        return url
    }
}

struct YearFacts: Codable, Equatable {
    let year: Int
    let hitCount: Int
    let longestRuns: [LongestRun]
    let topArtists: [ArtistTally]
}

struct LongestRun: Codable, Equatable {
    let title: String
    let artist: String
    let weeks: Int
}

struct ArtistTally: Codable, Equatable {
    let artist: String
    let hitCount: Int
    let weeks: Int
}

struct ApiStory: Codable, Equatable {
    let year: Int
    let decade: Int
    let facts: YearFacts
    let summary: String
    let editorial: String?
}

struct ApiYear: Codable, Equatable, Identifiable {
    var id: Int { year }
    let year: Int
    let story: ApiStory
    let hits: [ApiHit]
}

struct ApiPlaylist: Codable, Equatable {
    let graduationYear: Int
    let startYear: Int
    let endYear: Int
    let genres: [String]
    let title: String
    let hits: [ApiHit]
    let years: [ApiYear]
}

struct CollageBox: Codable, Equatable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct CollageTile: Codable, Equatable, Identifiable {
    var id: String { key }
    let key: String
    let x: Double
    let y: Double
    let size: Double
    let hero: Bool
}

struct CollagePlan: Codable, Equatable {
    let format: String
    let layout: String
    let width: Double
    let height: Double
    let headline: String
    let mark: String
    let titleSize: Double
    let markSize: Double
    let art: CollageBox
    let tiles: [CollageTile]
    let heroKeys: [String]
}

struct ArtworkCover: Codable, Equatable {
    let key: String
    let title: String
    let artworkUrl: String?
}

struct PlaylistArtwork: Codable, Equatable {
    let presentsAs: String
    let playlistTitle: String
    let headline: String
    let mark: String
    let link: String?
    let plan: CollagePlan
    let covers: [ArtworkCover]
}

struct LibraryCopy: Codable, Equatable {
    let name: String
    let description: String
    let coverTip: String
}

struct ShareLink: Codable, Equatable {
    let id: String
    let url: String
    let shareUrl: String
    let message: String
    let subject: String
}

struct RecipientCopy: Codable, Equatable {
    let prompt: String
    let question: String
}

struct PlaylistDocument: Codable, Equatable {
    let courtesy: String
    let limits: YearLimits
    let limitsError: String?
    let availableGenres: [String]
    let playlist: ApiPlaylist
    let artwork: PlaylistArtwork?
    let library: LibraryCopy
    let share: ShareLink?
    let recipient: RecipientCopy?
    let filterMessage: String?
}

struct LimitsEnvelope: Codable {
    let ok: Bool
    let error: String?
    let courtesy: String?
    let limits: YearLimits?
    let chartConnected: Bool?
}

struct PlaylistEnvelope: Codable {
    let ok: Bool
    let error: String?
    let courtesy: String?
    let limits: YearLimits?
    let limitsError: String?
    let availableGenres: [String]?
    let playlist: ApiPlaylist?
    let artwork: PlaylistArtwork?
    let library: LibraryCopy?
    let share: ShareLink?
    let recipient: RecipientCopy?
    let filterMessage: String?
}

struct ShareEnvelope: Codable {
    let ok: Bool
    let error: String?
    let id: String?
    let url: String?
    let shareUrl: String?
    let message: String?
    let subject: String?
    let libraryDescription: String?
}

enum BrowseMode: String {
    case flow
    case list
}

struct ShareDraft: Identifiable {
    let id = UUID()
    let items: [Any]
}
