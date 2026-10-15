import Foundation
import MusicKit

enum LibrarySaveOutcome {
    case saved(count: Int, requested: Int, url: URL?, missing: [String])
    case needsOffer(songID: String?)
    case notAuthorized
    case failed(String)
}

enum LibrarySaver {
    static func save(hits: [ApiHit], name: String, description: String) async -> LibrarySaveOutcome {
        let authorization = await MusicAuthorization.request()
        guard authorization == .authorized else { return .notAuthorized }

        if let subscription = try? await MusicSubscription.current {
            if !subscription.canPlayCatalogContent && subscription.canBecomeSubscriber {
                return .needsOffer(songID: hits.compactMap(\.catalog?.catalogId).first)
            }
        }

        var resolved: [Song] = []
        var missing: [String] = []
        let identified = hits.filter { $0.catalog?.catalogId != nil }
        let found = await CatalogMatch.songs(ids: identified.compactMap(\.catalog?.catalogId))
        var unresolved: [ApiHit] = []
        for hit in hits {
            if let id = hit.catalog?.catalogId, let song = found[id] {
                resolved.append(song)
            } else {
                unresolved.append(hit)
            }
        }

        for hit in unresolved {
            if let song = await CatalogMatch.search(title: hit.title, artist: hit.artist) {
                resolved.append(song)
            } else {
                missing.append("\(hit.title) by \(hit.artist)")
            }
        }

        guard !resolved.isEmpty else {
            return .failed(missing.isEmpty ? "Apple Music could not be checked. Try again." : "Apple Music didn’t have these songs, so nothing was saved.")
        }

        do {
            let playlist = try await create(name: name, description: description, songs: resolved)
            return .saved(count: resolved.count, requested: hits.count, url: playlist.url, missing: missing)
        } catch {
            return .failed("Apple Music could not save the playlist.")
        }
    }

    private static func create(name: String, description: String, songs: [Song]) async throws -> Playlist {
        let first = Array(songs.prefix(100))
        let playlist = try await MusicLibrary.shared.createPlaylist(
            name: name,
            description: description,
            authorDisplayName: "Playlist Time Machine",
            items: first
        )
        var offset = 100
        while offset < songs.count {
            let end = min(offset + 100, songs.count)
            try await MusicLibrary.shared.add(Array(songs[offset..<end]), to: playlist)
            offset = end
        }
        return playlist
    }
}
