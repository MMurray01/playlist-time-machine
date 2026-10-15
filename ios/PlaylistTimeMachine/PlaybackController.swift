import AVFoundation
import Foundation
import MusicKit
import SwiftUI

@MainActor
final class PlaybackController: ObservableObject {
    @Published var currentKey: String?
    @Published var currentTitle = ""
    @Published var currentArtist = ""
    @Published var isPlaying = false
    @Published var status = ""
    @Published var showOffer = false
    @Published var offerSongID: String?
    @Published var offerMessage: MusicSubscriptionOffer.MessageIdentifier = .playMusic

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

    func toggle(_ hit: ApiHit) async {
        if currentKey == hit.key && isPlaying {
            pause()
            return
        }
        await play(hit)
    }

    /// In-app playback is the iTunes preview only. The full song opens in the Music app.
    func play(_ hit: ApiHit) async {
        stopPreview()
        player.pause()
        currentKey = hit.key
        currentTitle = hit.title
        currentArtist = hit.artist
        status = ""
        if let url = hit.previewURL {
            startPreview(url)
            return
        }
        status = "This song has no preview."
        isPlaying = false
    }

    func pause() {
        previewPlayer?.pause()
        player.pause()
        isPlaying = false
    }

    /// Stops the preview and hides the mini player. Closing the song sheet calls this.
    func stop() {
        stopPreview()
        player.pause()
        isPlaying = false
        currentKey = nil
        currentTitle = ""
        currentArtist = ""
        status = ""
    }

    func resume() async {
        guard let preview = previewPlayer else {
            isPlaying = false
            return
        }
        let duration = preview.currentItem?.duration ?? .zero
        if duration.isNumeric, CMTimeCompare(preview.currentTime(), duration) >= 0 {
            await preview.seek(to: .zero)
        }
        preview.play()
        isPlaying = true
    }

    func skip(_ delta: Int) async {
        guard let key = currentKey, let index = songs.firstIndex(where: { $0.key == key }) else { return }
        let next = index + delta
        guard songs.indices.contains(next) else { return }
        await play(songs[next])
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
