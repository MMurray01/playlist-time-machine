import Foundation
import MusicKit

enum MusicText {
    static func normalize(_ value: String) -> String {
        value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .replacingOccurrences(of: "&", with: " and ")
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
}

enum CatalogMatch {
    static func bestSong(title: String, artist: String, in songs: MusicItemCollection<Song>) -> Song? {
        let wantedTitle = MusicText.normalize(title)
        let wantedArtist = MusicText.normalize(artist)
        if let exact = songs.first(where: { song in
            let songTitle = MusicText.normalize(song.title)
            let songArtist = MusicText.normalize(song.artistName)
            return songTitle == wantedTitle && (songArtist.contains(wantedArtist) || wantedArtist.contains(songArtist))
        }) {
            return exact
        }
        return songs.first { MusicText.normalize($0.title) == wantedTitle } ?? songs.first
    }

    static func song(id: String) async -> Song? {
        var request = MusicCatalogResourceRequest<Song>(matching: \.id, equalTo: MusicItemID(rawValue: id))
        return try? await request.response().items.first
    }

    static func songs(ids: [String]) async -> [String: Song] {
        var found: [String: Song] = [:]
        let itemIDs = ids.map { MusicItemID(rawValue: $0) }
        var index = 0
        while index < itemIDs.count {
            let end = min(index + 100, itemIDs.count)
            let slice = Array(itemIDs[index..<end])
            var request = MusicCatalogResourceRequest<Song>(matching: \.id, memberOf: slice)
            if let response = try? await request.response() {
                for song in response.items {
                    found[song.id.rawValue] = song
                }
            }
            index = end
        }
        return found
    }

    static func search(title: String, artist: String) async -> Song? {
        var request = MusicCatalogSearchRequest(term: "\(title) \(artist)", types: [Song.self])
        request.limit = 5
        guard let response = try? await request.response() else { return nil }
        return bestSong(title: title, artist: artist, in: response.songs)
    }
}
