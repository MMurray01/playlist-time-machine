import Foundation
import MusicKit

enum LibrarySaveOutcome {
    case saved(count: Int, requested: Int, url: URL?, missing: [String], incomplete: Bool)
    case needsOffer(songID: String?)
    case notAuthorized
    case failed(String)
}

enum LibraryAccess {
    case allowed
    case needsOffer(songID: String?)
    case notAuthorized
    case failed(String)
}

enum LibrarySaver {
    /// Authorization and the library-edit capability. This does not create a playlist.
    static func access(songID: String?) async -> LibraryAccess {
        let authorization = await MusicAuthorization.request()
        guard authorization == .authorized else { return .notAuthorized }

        let decision: LibraryWriteDecision
        do {
            let subscription = try await MusicSubscription.current
            decision = LibrarySavePolicy.decide(
                hasCloudLibraryEnabled: subscription.hasCloudLibraryEnabled,
                canBecomeSubscriber: subscription.canBecomeSubscriber
            )
        } catch {
            decision = LibrarySavePolicy.decide(hasCloudLibraryEnabled: nil, canBecomeSubscriber: nil)
        }

        switch decision {
        case .write:
            return .allowed
        case .needsSubscription:
            return .needsOffer(songID: songID)
        case .libraryUnavailable:
            return .failed(LibrarySavePolicy.libraryUnavailableMessage)
        case .checkFailed:
            return .failed(LibrarySavePolicy.checkFailedMessage)
        }
    }

    static func save(hits: [ApiHit], name: String, description: String) async -> LibrarySaveOutcome {
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

        switch await create(name: name, description: description, songs: resolved) {
        case .notCreated:
            return .failed("Apple Music could not save the playlist.")
        case .stored(let playlist, added: let added):
            let incomplete = LibrarySavePolicy.stoppedEarly(created: true, added: added, requested: resolved.count)
            guard LibrarySavePolicy.keepReturnedPlaylist(created: true, added: added, requested: resolved.count) else {
                return .failed("Apple Music could not save the playlist.")
            }
            return .saved(
                count: added,
                requested: hits.count,
                url: playlist.url,
                missing: missing,
                incomplete: incomplete
            )
        }
    }

    private enum CreateResult {
        case stored(Playlist, added: Int)
        case notCreated
    }

    private static func create(name: String, description: String, songs: [Song]) async -> CreateResult {
        let firstCount = min(100, songs.count)
        let first = Array(songs.prefix(firstCount))
        let playlist: Playlist
        do {
            playlist = try await MusicLibrary.shared.createPlaylist(
                name: name,
                description: description,
                authorDisplayName: "Playlist Time Machine",
                items: first
            )
        } catch {
            return .notCreated
        }
        guard songs.count > firstCount else { return .stored(playlist, added: songs.count) }
        // createPlaylist returns after the first 100 songs. edit() replaces that
        // list in one call. add() is the fallback and accepts one song.
        do {
            let edited = try await MusicLibrary.shared.edit(playlist, items: songs)
            return .stored(edited, added: songs.count)
        } catch {
            var current = playlist
            var added = firstCount
            for song in songs.dropFirst(firstCount) {
                do {
                    current = try await MusicLibrary.shared.add(song, to: current)
                    added += 1
                } catch {
                    return .stored(current, added: added)
                }
            }
            return .stored(current, added: added)
        }
    }
}
