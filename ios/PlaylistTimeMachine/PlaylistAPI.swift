import Foundation

enum APIError: LocalizedError {
    case message(String)
    case badResponse

    var errorDescription: String? {
        switch self {
        case .message(let text):
            return text
        case .badResponse:
            return "The playlist could not be built. Try again."
        }
    }
}

enum PlaylistAPI {
    static var origin: URL {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "PTMAPIBaseURL") as? String,
           let url = URL(string: raw),
           url.scheme == "https" {
            return url
        }
        return URL(string: "https://www.playlisttimemachine.com")!
    }

    static var privacyURL: URL { origin.appendingPathComponent("privacy") }
    static var termsURL: URL { origin.appendingPathComponent("terms") }

    static func limits() async throws -> (limits: YearLimits, chartConnected: Bool, error: String?, courtesy: String) {
        let body: LimitsEnvelope = try await send(url: endpoint("api/playlist"), method: "GET", body: nil)
        guard body.ok, let limits = body.limits else {
            throw APIError.message(body.error ?? "The chart library could not be read. Try again in a moment.")
        }
        return (limits, body.chartConnected ?? true, body.error, body.courtesy ?? Copy.previewCourtesy)
    }

    static func playlist(year: Int, genres: [String]) async throws -> PlaylistDocument {
        var parts = URLComponents(url: endpoint("api/playlist"), resolvingAgainstBaseURL: false)
        var items = [URLQueryItem(name: "year", value: String(year))]
        if !genres.isEmpty {
            items.append(URLQueryItem(name: "genres", value: genres.joined(separator: ",")))
        }
        parts?.queryItems = items
        guard let url = parts?.url else { throw APIError.badResponse }
        return try await document(from: url)
    }

    static func sharedPlaylist(id: String) async throws -> PlaylistDocument {
        var parts = URLComponents(url: endpoint("api/playlist"), resolvingAgainstBaseURL: false)
        parts?.queryItems = [URLQueryItem(name: "id", value: id)]
        guard let url = parts?.url else { throw APIError.badResponse }
        return try await document(from: url)
    }

    static func share(graduationYear: Int, title: String) async throws -> (link: ShareLink, libraryDescription: String) {
        let payload = ["graduationYear": graduationYear, "title": title, "genres": [String]()] as [String: Any]
        let data = try JSONSerialization.data(withJSONObject: payload)
        let body: ShareEnvelope = try await send(url: endpoint("api/share"), method: "POST", body: data)
        guard body.ok,
              let id = body.id,
              let url = body.url,
              let shareUrl = body.shareUrl,
              let message = body.message,
              let subject = body.subject
        else {
            throw APIError.message(body.error ?? "The share link could not be saved. Try again.")
        }
        let window = YearWindow.window(graduationYear)
        let description = body.libraryDescription ?? YearWindow.description(start: window.start, end: window.end)
        return (ShareLink(id: id, url: url, shareUrl: shareUrl, message: message, subject: subject), description)
    }

    private static func document(from url: URL) async throws -> PlaylistDocument {
        let body: PlaylistEnvelope = try await send(url: url, method: "GET", body: nil)
        guard body.ok,
              let playlist = body.playlist,
              let limits = body.limits,
              let library = body.library
        else {
            throw APIError.message(body.error ?? "The playlist could not be built. Try again.")
        }
        return PlaylistDocument(
            courtesy: body.courtesy ?? Copy.previewCourtesy,
            limits: limits,
            limitsError: body.limitsError,
            availableGenres: body.availableGenres ?? [],
            playlist: playlist,
            artwork: body.artwork,
            library: library,
            share: body.share,
            recipient: body.recipient,
            filterMessage: body.filterMessage
        )
    }

    private static func endpoint(_ path: String) -> URL {
        path.split(separator: "/").reduce(origin) { url, part in
            url.appendingPathComponent(String(part))
        }
    }

    private static func send<T: Decodable>(url: URL, method: String, body: Data?) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("PlaylistTimeMachine/1.0 iOS", forHTTPHeaderField: "User-Agent")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw APIError.message("The playlist could not be built. Try again.")
        }
        guard let http = response as? HTTPURLResponse else { throw APIError.badResponse }
        let decoder = JSONDecoder()
        if let decoded = try? decoder.decode(T.self, from: data) {
            return decoded
        }
        if let failure = try? decoder.decode(LimitsEnvelope.self, from: data), let message = failure.error {
            throw APIError.message(message)
        }
        if http.statusCode >= 400 {
            throw APIError.message("The playlist could not be built. Try again.")
        }
        throw APIError.badResponse
    }
}
