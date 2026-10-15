import Foundation

enum DeepLink {
    private static let allowedHosts: Set<String> = [
        "www.playlisttimemachine.com",
        "playlisttimemachine.com",
    ]
    private static let shareAlphabet = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-")

    static func isShareID(_ value: String) -> Bool {
        guard (4...32).contains(value.count) else { return false }
        return value.unicodeScalars.allSatisfy { shareAlphabet.contains($0) }
    }

    /// A `/p/<id>` universal link, or the playlisttimemachine:// fallback used before the association file is live.
    static func shareID(from url: URL) -> String? {
        guard let scheme = url.scheme?.lowercased() else { return nil }
        let parts = url.path.split(separator: "/").map(String.init)
        if scheme == "https" || scheme == "http" {
            guard let host = url.host?.lowercased(), allowedHosts.contains(host) else { return nil }
            guard parts.count == 2, parts[0] == "p" else { return nil }
            return isShareID(parts[1]) ? parts[1] : nil
        }
        guard scheme == "playlisttimemachine" else { return nil }
        if url.host?.lowercased() == "p", parts.count == 1 {
            return isShareID(parts[0]) ? parts[0] : nil
        }
        guard parts.count == 2, parts[0] == "p" else { return nil }
        return isShareID(parts[1]) ? parts[1] : nil
    }
}
