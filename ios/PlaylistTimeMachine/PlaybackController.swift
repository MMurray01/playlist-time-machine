import AVFoundation
import Foundation
import MusicKit

@MainActor
final class PlaybackController: ObservableObject {
    @Published var currentKey: String?
    @Published var currentTitle = ""
    @Published var currentArtist = ""
    @Published var isPlaying = false
    @Published var status = ""
    @Published var canPlayCatalog = false
    @Published var canOfferSubscription = false
    @Published var showOffer = false
    @Published var offerSongID: String?
    @Published var offerMessage: MusicSubscriptionOffer.Options.MessageIdentifier = .playMusic

    private var songs: [ApiHit] = []
    private var previewPlayer: AVPlayer?
    private var previewObserver: NSObjectProtocol?
    private let player = ApplicationMusicPlayer.shared

    var offerOptions: MusicSubscriptionOffer.Options {
        var options = MusicSubscriptionOffer.Options()
        options.messageIdentifier = offerMessage
        if let offerSongID {
            options.itemID = MusicItemID(rawValue: offerSongID)
        }
        return options
    }

    func replace(songs: [ApiHit]) {
        self.songs = songs
    }

    func refreshSubscription() async {
        guard MusicAuthorization.currentStatus == .authorized else {
            canPlayCatalog = false
            canOfferSubscription = false
            return
        }
        do {
            let subscription = try await MusicSubscription.current
            canPlayCatalog = subscription.canPlayCatalogContent
            canOfferSubscription = subscription.canBecomeSubscriber
        } catch {
            canPlayCatalog = false
            canOfferSubscription = false
        }
    }

    func toggle(_ hit: ApiHit) async {
        if currentKey == hit.key && isPlaying {
            pause()
            return
        }
        await play(hit)
    }

    func play(_ hit: ApiHit) async {
        stopPreview()
        player.pause()
        currentKey = hit.key
        currentTitle = hit.title
        currentArtist = hit.artist
        status = ""
        if canPlayCatalog, hit.catalog?.catalogId != nil {
            await playFull(hit)
            return
        }
        if let url = hit.previewURL {
            startPreview(url)
            return
        }
        status = "This song has no preview."
        isPlaying = false
    }

    func requestFullPlayback(_ hit: ApiHit) async {
        let authorization = await MusicAuthorization.request()
        guard authorization == .authorized else {
            status = "Apple Music access is required to play the full song."
            return
        }
        await refreshSubscription()
        if canPlayCatalog {
            await play(hit)
            return
        }
        if canOfferSubscription {
            offerSongID = hit.catalog?.catalogId
            offerMessage = .playMusic
            showOffer = true
            return
        }
        if let url = hit.previewURL {
            currentKey = hit.key
            currentTitle = hit.title
            currentArtist = hit.artist
            startPreview(url)
        } else {
            status = "This song has no preview."
        }
    }

    func pause() {
        previewPlayer?.pause()
        player.pause()
        isPlaying = false
    }

    func resume() async {
        if let preview = previewPlayer {
            let duration = preview.currentItem?.duration ?? .zero
            if duration.isNumeric, CMTimeCompare(preview.currentTime(), duration) >= 0 {
                await preview.seek(to: .zero)
            }
            preview.play()
            isPlaying = true
            return
        }
        do {
            try await player.play()
            isPlaying = true
        } catch {
            status = "The full song could not be played."
        }
    }

    func skip(_ delta: Int) async {
        guard let key = currentKey, let index = songs.firstIndex(where: { $0.key == key }) else { return }
        let next = index + delta
        guard songs.indices.contains(next) else { return }
        await play(songs[next])
    }

    private func playFull(_ hit: ApiHit) async {
        guard let id = hit.catalog?.catalogId, let song = await CatalogMatch.song(id: id) else {
            if let url = hit.previewURL {
                startPreview(url)
            } else {
                status = "This song has no preview."
                isPlaying = false
            }
            return
        }
        do {
            try activateSession()
            player.queue = ApplicationMusicPlayer.Queue(for: [song])
            try await player.play()
            isPlaying = true
            status = "Playing in Apple Music."
        } catch {
            isPlaying = false
            status = "The full song could not be played."
        }
    }

    private func startPreview(_ url: URL) {
        stopPreview()
        try? activateSession()
        let item = AVPlayerItem(url: url)
        let preview = AVPlayer(playerItem: item)
        preview.actionAtItemEnd = .pause
        previewObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.isPlaying = false
                self?.status = ""
            }
        }
        previewPlayer = preview
        preview.play()
        isPlaying = true
        status = ""
    }

    private func stopPreview() {
        previewPlayer?.pause()
        previewPlayer = nil
        if let previewObserver {
            NotificationCenter.default.removeObserver(previewObserver)
            self.previewObserver = nil
        }
    }

    private func activateSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default)
        try session.setActive(true)
    }
}
