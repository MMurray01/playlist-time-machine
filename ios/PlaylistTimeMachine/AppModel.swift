import Foundation
import UIKit

enum AppleMusicSavePhase: Equatable {
    case editing
    case saving
    case saved
    case failed
}

@MainActor
final class AppModel: ObservableObject {
    @Published var yearText = ""
    @Published var limits = YearWindow.limits()
    @Published var chartConnected = true
    @Published var homeError: String?
    @Published var isBuilding = false

    @Published var document: PlaylistDocument?
    @Published var titleDraft = ""
    @Published var browse: BrowseMode = .flow
    @Published var status = ""
    @Published var playlistError: String?
    @Published var showMusicSettings = false
    @Published var isWorking = false
    @Published var appleMusicSavePhase: AppleMusicSavePhase = .editing
    @Published var artworkImage: UIImage?
    @Published var showCollage = false
    @Published var showAppleMusicSave = false
    @Published var shareLink: ShareLink?
    @Published var libraryDescription = ""
    @Published var savedNote = ""
    @Published var savedURL: URL?
    @Published var toastMessage: String?
    @Published var toastIsError = false
    @Published var shareDraft: ShareDraft?
    @Published var selectedHit: ApiHit?

    private var generation = 0
    private var shareTitle = ""
    private var artworkTask: Task<Void, Never>?
    private var playlistHits: [ApiHit] = []
    private var appleMusicSaveTask: Task<Void, Never>?
    private var savePlayback: PlaybackController?
    private var toastTask: Task<Void, Never>?
    private var savedPromptTask: Task<Void, Never>?

    var typedYear: Int? { YearWindow.typedYear(yearText) }

    var validYear: Int? {
        guard let year = typedYear, YearWindow.isValid(year, limits: limits) else { return nil }
        return year
    }

    var windowHint: String {
        if let year = validYear {
            let window = YearWindow.window(year)
            return "Class of \(YearWindow.digits(year)) includes every No. 1 from \(YearWindow.digits(window.start)) through \(YearWindow.digits(window.end))."
        }
        if let year = typedYear {
            return YearWindow.message(year, limits: limits)
        }
        return "Enter the year you graduated high school, from \(YearWindow.digits(limits.min)) through \(YearWindow.digits(limits.max))."
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
        await loadYear(year)
    }

    func open(url: URL) {
        guard let id = DeepLink.shareID(from: url) else { return }
        Task { await loadShare(id: id) }
    }

    func chooseBrowse(_ mode: BrowseMode) {
        clearTransientNotices()
        browse = mode
        UserDefaults.standard.set(mode.rawValue, forKey: "ptm-results-view")
    }

    func commitTitle() {
        titleDraft = String(titleDraft.trimmingCharacters(in: .whitespacesAndNewlines).prefix(80))
        renderArtwork()
    }

    func refreshArtwork() {
        renderArtwork()
    }

    /// Empty names keep the field blank and fall back to "Class of YEAR".
    func playlistName() -> String {
        YearWindow.cleanTitle(titleDraft, graduationYear: document?.playlist.graduationYear ?? 0)
    }

    func renderPrintArtwork() async -> UIImage? {
        guard let document, let artwork = document.artwork else { return nil }
        let startYear = document.playlist.startYear
        let endYear = document.playlist.endYear
        _ = await ensureShare()
        return await PlaylistImages.renderPrintArtwork(artwork, startYear: startYear, endYear: endYear)
    }

    func openAppSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    func share() async {
        guard let document else { return }
        isWorking = true
        playlistError = nil
        status = "Preparing the playlist to share."
        defer { isWorking = false }
        guard let link = await ensureShare() else { return }
        let image = await PlaylistImages.renderStory(
            title: playlistName(),
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

    func beginAppleMusicSave(playback: PlaybackController) {
        guard let document else { return }
        guard appleMusicSaveTask == nil else { return }
        isWorking = true
        appleMusicSavePhase = .saving
        playlistError = nil
        showMusicSettings = false
        dismissSavedPrompt()
        status = ""
        savePlayback = playback
        let hits = playlistHits.isEmpty ? document.playlist.hits : playlistHits
        let name = playlistName()
        let fallbackDescription = libraryDescription.isEmpty ? document.library.description : libraryDescription
        // Detached from the sheet. Dismissing the view cancels tasks created in
        // that view, and this write has to keep running after the X is tapped.
        appleMusicSaveTask = Task.detached { [weak self] in
            guard let self else { return }
            let description = await self.prepareLibraryDescription(fallback: fallbackDescription)
            let outcome = await LibrarySaver.save(hits: hits, name: name, description: description)
            await self.recordAppleMusicSave(outcome)
        }
    }

    private func prepareLibraryDescription(fallback: String) async -> String {
        _ = await ensureShare()
        return libraryDescription.isEmpty ? fallback : libraryDescription
    }

    private func recordAppleMusicSave(_ outcome: LibrarySaveOutcome) {
        isWorking = false
        appleMusicSaveTask = nil
        let playback = savePlayback
        switch outcome {
        case .saved(let count, let requested, let url, let missing):
            savedURL = url
            let missingNote = missing.isEmpty ? "" : " \(missing.count) \(missing.count == 1 ? "song was" : "songs were") not in Apple Music."
            savedNote = "Saved \(count) of \(requested) songs to Apple Music.\(missingNote)"
            playlistError = nil
            showMusicSettings = false
            status = ""
            appleMusicSavePhase = .saved
            showToast("Saved to Apple Music", isError: false)
            scheduleSavedPromptDismissal()
        case .needsOffer(let songID):
            playback?.offerSongID = songID
            playback?.offerMessage = .addMusic
            playback?.showOffer = true
            status = ""
            appleMusicSavePhase = .editing
        case .notAuthorized:
            showMusicSettings = true
            playlistError = "Apple Music access is off, so the playlist was not saved. 30-second previews still play here, and Listen on Apple Music still opens the song. Allow Apple Music for Playlist Time Machine in Settings to save it."
            status = ""
            appleMusicSavePhase = .failed
            showToast("Apple Music could not save the playlist.", isError: true)
        case .failed(let message):
            playlistError = message
            status = ""
            appleMusicSavePhase = .failed
            showToast(message, isError: true)
        }
    }

    private func showToast(_ message: String, isError: Bool) {
        toastMessage = message
        toastIsError = isError
        toastTask?.cancel()
        toastTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled, self.toastMessage == message else { return }
            self.toastMessage = nil
        }
    }

    func dismissToast() {
        toastTask?.cancel()
        toastTask = nil
        toastMessage = nil
    }

    func dismissSavedPrompt() {
        savedPromptTask?.cancel()
        savedPromptTask = nil
        savedNote = ""
        savedURL = nil
    }

    func openSavedPlaylist() {
        let url = savedURL
        dismissSavedPrompt()
        if let url {
            UIApplication.shared.open(url)
        }
    }

    private func scheduleSavedPromptDismissal() {
        savedPromptTask?.cancel()
        savedPromptTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled else { return }
            savedNote = ""
            savedURL = nil
        }
    }

    private func clearTransientNotices() {
        dismissSavedPrompt()
        dismissToast()
    }

    func backToYear() {
        generation += 1
        document = nil
        playlistHits = []
        artworkImage = nil
        showCollage = false
        showAppleMusicSave = false
        shareLink = nil
        playlistError = nil
        showMusicSettings = false
        appleMusicSavePhase = .editing
        status = ""
        clearTransientNotices()
        selectedHit = nil
    }

    private func loadShare(id: String) async {
        generation += 1
        let ticket = generation
        isBuilding = true
        homeError = nil
        playlistError = nil
        clearTransientNotices()
        defer { if ticket == generation { isBuilding = false } }
        do {
            let loaded = try await PlaylistAPI.sharedPlaylist(id: id)
            guard ticket == generation else { return }
            apply(loaded)
        } catch {
            guard ticket == generation else { return }
            document = nil
            homeError = error.localizedDescription
        }
    }

    private func loadYear(_ year: Int) async {
        generation += 1
        let ticket = generation
        if document == nil { isBuilding = true } else { isWorking = true }
        homeError = nil
        playlistError = nil
        clearTransientNotices()
        defer {
            if ticket == generation {
                isBuilding = false
                isWorking = false
            }
        }
        do {
            let loaded = try await PlaylistAPI.playlist(year: year, genres: [])
            guard ticket == generation else { return }
            UserDefaults.standard.set(String(year), forKey: "ptm-graduation-year")
            yearText = String(year)
            apply(loaded)
            Task { await self.ensureShare() }
        } catch {
            guard ticket == generation else { return }
            if document == nil {
                homeError = error.localizedDescription
            } else {
                playlistError = error.localizedDescription
            }
        }
    }

    private func apply(_ loaded: PlaylistDocument) {
        document = loaded
        if loaded.recipient != nil {
            yearText = String(loaded.playlist.graduationYear)
        }
        titleDraft = ""
        limits = loaded.limits
        if let share = loaded.share {
            shareLink = share
            shareTitle = loaded.playlist.title
            libraryDescription = loaded.library.description
        } else {
            shareLink = nil
            shareTitle = ""
            libraryDescription = loaded.library.description
        }
        playlistHits = loaded.playlist.hits
        status = loaded.filterMessage ?? ""
        clearTransientNotices()
        renderArtwork()
    }

    private func renderArtwork() {
        artworkTask?.cancel()
        guard let artwork = document?.artwork, let playlist = document?.playlist else {
            artworkImage = nil
            return
        }
        let startYear = playlist.startYear
        let endYear = playlist.endYear
        artworkTask = Task {
            let image = await PlaylistImages.renderArtwork(artwork, startYear: startYear, endYear: endYear)
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
