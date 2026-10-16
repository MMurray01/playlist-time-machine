import SwiftUI

struct SongDetailView: View {
    @EnvironmentObject private var playback: PlaybackController
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    let hit: ApiHit

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                cover
                Text(hit.title)
                    .font(.title.weight(.bold))
                    .foregroundColor(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text(hit.artist)
                    .font(.title3)
                    .foregroundColor(Theme.inkSoft)
                if let weeks = hit.weeksText {
                    Text(weeks)
                        .font(.subheadline)
                        .foregroundColor(Theme.inkSoft)
                }

                HStack(alignment: .center, spacing: 10) {
                    if hit.previewURL != nil {
                        Button(playback.currentKey == hit.key && playback.isPlaying ? "Pause" : "Play :30 Second Preview") {
                            Task { await playback.toggle(hit) }
                        }
                        .buttonStyle(CompactButtonStyle())
                    } else {
                        Text("No preview")
                            .font(.subheadline.weight(.semibold))
                            .multilineTextAlignment(.center)
                            .foregroundColor(Theme.inkSoft)
                            .frame(maxWidth: .infinity, minHeight: 36)
                    }
                    if let url = hit.appleURL {
                        Button("Listen on Apple Music") { openURL(url) }
                            .buttonStyle(CompactButtonStyle())
                    }
                }

                if !playback.status.isEmpty {
                    Text(playback.status)
                        .font(.subheadline)
                        .foregroundColor(Theme.inkSoft)
                }

                Text(Copy.previewCourtesy)
                    .font(.caption2)
                    .foregroundColor(Theme.inkSoft)

                Button("Close") {
                    playback.stop()
                    dismiss()
                }
                .buttonStyle(SecondaryButtonStyle())
            }
            .padding(24)
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.paper.ignoresSafeArea())
        .presentationDetents([.large])
        .onDisappear { playback.stop() }
    }

    @ViewBuilder
    private var cover: some View {
        let raw = hit.catalog?.artworkLargeUrl ?? hit.catalog?.artworkUrl
        if let raw, let url = URL(string: raw), url.scheme == "https" {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    monogram
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 320)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .accessibilityHidden(true)
        } else {
            monogram
        }
    }

    private var monogram: some View {
        ZStack {
            Theme.cover
            Text(PlaylistImages.coverInitials(hit.title))
                .font(.system(size: 64, weight: .semibold))
                .foregroundColor(Theme.ink)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 320)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityHidden(true)
    }
}

struct TransportBar: View {
    @EnvironmentObject private var playback: PlaybackController

    var body: some View {
        if playback.currentKey != nil {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(playback.currentTitle)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                    Text(playback.currentArtist)
                        .font(.caption)
                        .foregroundColor(Theme.inkSoft)
                        .lineLimit(1)
                }
                Spacer()
                Button {
                    Task { await playback.skip(-1) }
                } label: {
                    Image(systemName: "backward.fill")
                }
                .accessibilityLabel("Previous song")
                Button {
                    Task {
                        if playback.isPlaying {
                            playback.pause()
                        } else {
                            await playback.resume()
                        }
                    }
                } label: {
                    Image(systemName: playback.isPlaying ? "pause.fill" : "play.fill")
                }
                .accessibilityLabel(playback.isPlaying ? "Pause" : "Play")
                Button {
                    Task { await playback.skip(1) }
                } label: {
                    Image(systemName: "forward.fill")
                }
                .accessibilityLabel("Next song")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.regularMaterial)
            .foregroundColor(Theme.ink)
        }
    }
}
