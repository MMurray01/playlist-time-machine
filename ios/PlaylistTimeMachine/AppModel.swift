import Foundation
import UIKit

@MainActor
final class AppModel: ObservableObject {
    @Published var yearText = ""
    @Published var limits = YearWindow.limits()
    @Published var chartConnected = true
    @Published var homeError: String?
    @Published var isBuilding = false

    @Published var document: PlaylistDocument?
    @Published var titleDraft = ""
    @Published var selectedGenres: [String] = []
    @Published var browse: BrowseMode = .flow
    @Published var status = ""
    @Published var playlistError: String?
    @Published var isWorking = false
    @Published var artworkImage: UIImage?
    @Published var shareLink: ShareLink?
    @Published var libraryDescription = ""
    @Published var savedNote = ""
    @Published var savedURL: URL?
    @Published var shareDraft: ShareDraft?
    @Published var selectedHit: ApiHit?

    private var generation = 0
    private var shareTitle = ""
    private var artworkTask: Task<Void, Never>?
    /// Unfiltered songs. Genre chips only change the list on screen.
    private var playlistHits: [ApiHit] = []

    var typedYear: Int? { YearWindow.typedYear(yearText) }

    var validYear: Int? {
        guard let year = typedYear, YearWindow.isValid(year, limits: limits) else { return nil }
        return year
    }

    var windowHint: String {
        if let year = validYear {
            let window = YearWindow.window(year)
            return "Class of \(year) includes every No. 1 from \(window.start) through \(window.end)."
        }
        if let year = typedYear {
            return YearWindow.message(year, limits: limits)
        }
        return "Enter the year you graduated high school, from \(limits.min) through \(limits.max)."
    }

    var sliderYear: Int { validYear ?? limits.min }

    var showingPlaylist: Bool { document != nil }

    init() {
        if let stored = UserDefaults.standard.string(forKey: "ptm-graduation-year"),
           YearWindow.typedYear(stored) != nil {
            yearText = stored
        }
        if UserDefaults.standard.string(forKey: "ptm-results-view") == BrowseMode.list.rawValue {
            browse = .list
        }
    }

    func loadLimits() async {
        do {
            let result = try await PlaylistAPI.limits()
            limits = result.limits
            chartConnected = result.chartConnected
            if let error = result.error, !result.chartConnected {
                homeError = error
            }
        } catch {
            homeError = error.localizedDescription
        }
    }

    func step(_ delta: Int) {
        let base = validYear ?? min(limits.max, max(limits.min, 1984))
        let next = min(limits.max, max(limits.min, base + delta))
        yearText = String(next)
    }

    func build() async {
        guard let year = validYear else {
            if let typed = typedYear {
                homeError = YearWindow.message(typed, limits: limits)
            } else {
                homeError = "Enter the year you graduated high school, from \(limits.min) through \(limits.max)."
            }
            return
        }
        homeError = nil
        await loadYear(year, genres: [])
    }

    func open(url: URL) {
        guard let id = DeepLink.shareID(from: url) else { return }
        Task { await loadShare(id: id) }
    }

    func toggleGenre(_ genre: String) async {
        guard document != nil else { return }
        if selectedGenres.contains(where: { $0.caseInsensitiveCompare(genre) == .orderedSame }) {
            selectedGenres.removeAll { $0.caseInsensitiveCompare(genre) == .orderedSame }
        } else {
            selectedGenres.append(genre)
        }
        guard let year = document?.playlist.graduationYear else { return }
        await loadYear(year, genres: selectedGenres, keepShare: true)
    }

    func clearGenres() async {
        guard !selectedGenres.isEmpty, let year = document?.playlist.graduationYear else { return }
        selectedGenres = []
        await loadYear(year, genres: [], keepShare: true)
    }

    func chooseBrowse(_ mode: BrowseMode) {
        browse = mode
        UserDefaults.standard.set(mode.rawValue, forKey: "ptm-results-view")
    }

    func commitTitle() {
        guard let year = document?.playlist.graduationYear else { return }
        titleDraft = YearWindow.cleanTitle(titleDraft, graduationYear: year)
        renderArtwork()
        Task { await ensureShare() }
    }

    func share() async {
        guard let document else { return }
        isWorking = true
        playlistError = nil
        status = "Preparing the playlist to share."
        defer { isWorking = false }
        guard let link = await ensureShare() else { return }
        let image = await PlaylistImages.renderStory(
            title: document.playlist.title,
            link: link.url,
            hits: playlistHits.isEmpty ? document.playlist.hits : playlistHits
        )
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("class-of-\(document.playlist.graduationYear)-story.png")
        if let data = image.pngData() {
            try? data.write(to: file, options: .atomic)
            shareDraft = ShareDraft(items: [link.message, file])
        } else {
            shareDraft = ShareDraft(items: [link.message])
        }
        status = ""
    }

    func save(playback: PlaybackController) async {
        guard let document else { return }
        isWorking = true
        playlistError = nil
        savedNote = ""
        status = "Saving the playlist link."
        defer { isWorking = false }
        _ = await ensureShare()
        status = "Saving to Apple Music."
        let outcome = await LibrarySaver.save(
            hits: playlistHits.isEmpty ? document.playlist.hits : playlistHits,
            name: document.library.name,
            description: libraryDescription.isEmpty ? document.library.description : libraryDescription
        )
        switch outcome {
        case .saved(let count, let requested, let url, let missing):
            savedURL = url
            let missingNote = missing.isEmpty ? "" : " \(missing.count) \(missing.count == 1 ? "song was" : "songs were") not in Apple Music."
            savedNote = "Saved \(count) of \(requested) songs to Apple Music.\(missingNote)"
            status = savedNote
            await playback.refreshSubscription()
        case .needsOffer(let songID):
            playback.offerSongID = songID
            playback.offerMessage = .addMusic
            playback.showOffer = true
            status = ""
        case .notAuthorized:
            playlistError = "Apple Music sign-in was canceled."
            status = ""
        case .failed(let message):
            playlistError = message
            status = ""
        }
    }

    func backToYear() {
        generation += 1
        document = nil
        playlistHits = []
        artworkImage = nil
        shareLink = nil
        playlistError = nil
        status = ""
        savedNote = ""
        selectedHit = nil
    }

    private func loadShare(id: String) async {
        generation += 1
        let ticket = generation
        isBuilding = true
        homeError = nil
        playlistError = nil
        defer { if ticket == generation { isBuilding = false } }
        do {
            let loaded = try await PlaylistAPI.sharedPlaylist(id: id)
            guard ticket == generation else { return }
            apply(loaded, keepShare: false)
        } catch {
            guard ticket == generation else { return }
            document = nil
            homeError = error.localizedDescription
        }
    }

    private func loadYear(_ year: Int, genres: [String], keepShare: Bool = false) async {
        generation += 1
        let ticket = generation
        if document == nil { isBuilding = true } else { isWorking = true }
        homeError = nil
        playlistError = nil
        defer {
            if ticket == generation {
                isBuilding = false
                isWorking = false
            }
        }
        do {
            let loaded = try await PlaylistAPI.playlist(year: year, genres: genres)
            guard ticket == generation else { return }
            UserDefaults.standard.set(String(year), forKey: "ptm-graduation-year")
            yearText = String(year)
            apply(loaded, keepShare: keepShare)
            if !keepShare {
                Task { await self.ensureShare() }
            }
        } catch {
            guard ticket == generation else { return }
            if document == nil {
                homeError = error.localizedDescription
            } else {
                playlistError = error.localizedDescription
            }
        }
    }

    private func apply(_ loaded: PlaylistDocument, keepShare: Bool) {
        let previousLink = shareLink
        let previousDescription = libraryDescription
        document = loaded
        if loaded.recipient != nil {
            yearText = String(loaded.playlist.graduationYear)
        }
        if !keepShare || titleDraft.isEmpty {
            titleDraft = loaded.playlist.title
        }
        selectedGenres = loaded.playlist.genres
        limits = loaded.limits
        if let share = loaded.share {
            shareLink = share
            shareTitle = loaded.playlist.title
            libraryDescription = loaded.library.description
        } else if keepShare {
            shareLink = previousLink
            libraryDescription = previousDescription
        } else {
            shareLink = nil
            shareTitle = ""
            libraryDescription = loaded.library.description
        }
        if loaded.playlist.genres.isEmpty {
            playlistHits = loaded.playlist.hits
        }
        if let message = loaded.filterMessage {
            status = message
        } else if loaded.playlist.genres.isEmpty {
            status = ""
        }
        renderArtwork()
    }

    private func renderArtwork() {
        artworkTask?.cancel()
        guard let artwork = document?.artwork else {
            artworkImage = nil
            return
        }
        let headline = PlaylistImages.headline(
            title: YearWindow.cleanTitle(titleDraft, graduationYear: document?.playlist.graduationYear ?? 0),
            start: document?.playlist.startYear ?? 0,
            end: document?.playlist.endYear ?? 0
        )
        let link = shareLink?.url
        artworkTask = Task {
            let image = await PlaylistImages.renderArtwork(artwork, headline: headline, link: link)
            if Task.isCancelled { return }
            artworkImage = image
        }
    }

    @discardableResult
    private func ensureShare() async -> ShareLink? {
        guard let document else { return nil }
        if document.recipient != nil, let existing = document.share {
            shareLink = existing
            libraryDescription = document.library.description
            renderArtwork()
            return existing
        }
        let title = YearWindow.cleanTitle(titleDraft, graduationYear: document.playlist.graduationYear)
        if let shareLink, shareTitle == title {
            return shareLink
        }
        do {
            let year = document.playlist.graduationYear
            let created = try await PlaylistAPI.share(graduationYear: year, title: title)
            guard self.document?.playlist.graduationYear == year else { return nil }
            shareLink = created.link
            shareTitle = title
            libraryDescription = created.libraryDescription
            renderArtwork()
            return created.link
        } catch {
            playlistError = error.localizedDescription
            status = ""
            return nil
        }
    }
}
