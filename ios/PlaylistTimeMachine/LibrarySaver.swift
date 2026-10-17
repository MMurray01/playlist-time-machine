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
        let firstCount = min(100, songs.count)
        let first = Array(songs.prefix(firstCount))
        let playlist = try await MusicLibrary.shared.createPlaylist(
            name: name,
            description: description,
            authorDisplayName: "Playlist Time Machine",
            items: first
        )
        guard songs.count > firstCount else { return playlist }
        // createPlaylist returns after the first 100 songs, which is why the playlist
        // appears immediately. add() accepts one song, so the old loop waited on a
        // round trip per remaining hit. edit() replaces the track list in one call.
        do {
            return try await MusicLibrary.shared.edit(playlist, items: songs)
        } catch {
            var current = playlist
            for song in songs.dropFirst(firstCount) {
                current = try await MusicLibrary.shared.add(song, to: current)
            }
            return current
        }
    }
}
