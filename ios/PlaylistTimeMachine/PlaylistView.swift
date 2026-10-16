import SwiftUI

struct PlaylistView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var playback: PlaybackController

    var body: some View {
        ScrollView {
            if let document = model.document {
                VStack(alignment: .leading, spacing: 20) {
                    if let recipient = document.recipient {
                        recipientCard(recipient, year: document.playlist.graduationYear)
                    }

                    artwork(document)
                    actions(document)
                    if let message = document.filterMessage {
                        Text(message)
                            .font(.subheadline)
                            .foregroundColor(Theme.inkSoft)
                    }

                    LazyVStack(alignment: .leading, spacing: 28) {
                        ForEach(document.playlist.years) { chapter in
                            YearSection(chapter: chapter) { hit in
                                model.selectedHit = hit
                            }
                        }
                    }
                    LegalFooter()
                }
                .padding(20)
                .frame(maxWidth: 860, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
        }
        .background(Theme.paper.ignoresSafeArea())
        .navigationTitle(model.document.map { "Class of \(YearWindow.digits($0.playlist.graduationYear))" } ?? "Playlist")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Year") {
                    playback.stop()
                    model.backToYear()
                }
            }
        }
        .onAppear {
            playback.replace(songs: model.document?.playlist.hits ?? [])
        }
        .onChange(of: model.document?.playlist.hits.map(\.key) ?? []) { _ in
            playback.replace(songs: model.document?.playlist.hits ?? [])
        }
        .safeAreaInset(edge: .bottom, spacing: 10) {
            if model.document != nil {
                playlistDock
            }
        }
    }

    @ViewBuilder
    private func artwork(_ document: PlaylistDocument) -> some View {
        Group {
            if let image = model.artworkImage {
                Button {
                    model.showCollage = true
                } label: {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Playlist artwork")
                .accessibilityHint("Opens the artwork full screen")
            } else {
                ZStack {
                    Theme.cover
                    Text(model.isWorking ? "Preparing playlist artwork." : PlaylistImages.coverInitials(document.playlist.title))
                        .font(.headline)
                        .foregroundColor(Theme.ink)
                        .multilineTextAlignment(.center)
                        .padding()
                }
                .frame(maxWidth: .infinity)
                .frame(height: 220)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
        .fullScreenCover(isPresented: $model.showCollage) {
            CollageViewer()
        }
    }

    @ViewBuilder
    private func actions(_ document: PlaylistDocument) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if document.recipient == nil {
                Text("Name your Playlist")
                    .font(.subheadline.weight(.semibold))
                TextField(
                    "",
                    text: $model.titleDraft,
                    prompt: Text(document.playlist.title).foregroundColor(Theme.placeholder)
                )
                .textFieldStyle(.roundedBorder)
                .submitLabel(.done)
                .onSubmit { model.commitTitle() }
                .onChange(of: model.titleDraft) { value in
                    if value.count > 80 {
                        model.titleDraft = String(value.prefix(80))
                        return
                    }
                    model.refreshArtwork()
                }
            }
            if !model.savedNote.isEmpty {
                Text(model.savedNote)
                    .font(.subheadline)
                    .foregroundColor(Theme.ink)
                Text(document.library.coverTip)
                    .font(.footnote)
                    .foregroundColor(Theme.inkSoft)
            }
            if let savedURL = model.savedURL {
                Link("Open the saved playlist", destination: savedURL)
                    .font(.subheadline.weight(.semibold))
            }
        }
    }

    private var playlistDock: some View {
        let canAct = !model.isWorking && !(model.document?.playlist.hits.isEmpty ?? true)
        return VStack(spacing: 8) {
            if let error = model.playlistError {
                Text(error)
                    .font(.caption2)
                    .foregroundColor(Theme.dangerInk)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else if !model.status.isEmpty {
                Text(model.status)
                    .font(.caption2)
                    .foregroundColor(Theme.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            if model.showMusicSettings {
                Button("Open Settings") { model.openAppSettings() }
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .foregroundColor(Theme.ink)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            HStack(spacing: 0) {
                dockItem("Cover Flow", symbol: "square.stack.fill", selected: model.browse == .flow, enabled: true) {
                    model.chooseBrowse(.flow)
                }
                dockItem("List View", symbol: "list.bullet", selected: model.browse == .list, enabled: true) {
                    model.chooseBrowse(.list)
                }
                dockItem(
                    "Save",
                    symbol: "square.and.arrow.down",
                    selected: false,
                    enabled: canAct,
                    accessibilityLabel: "Save to Apple Music"
                ) {
                    Task { await model.save(playback: playback) }
                }
                dockItem("Share", symbol: "square.and.arrow.up", selected: false, enabled: canAct) {
                    Task { await model.share() }
                }
            }
            .padding(.vertical, 7)
            .padding(.horizontal, 4)
            .background(.regularMaterial, in: Capsule())
            .overlay(Capsule().stroke(Theme.line, lineWidth: 0.5))
            .shadow(color: Color.black.opacity(0.14), radius: 16, y: 6)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 6)
    }

    private func dockItem(
        _ title: String,
        symbol: String,
        selected: Bool,
        enabled: Bool,
        accessibilityLabel: String? = nil,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: symbol)
                    .font(.system(size: 20, weight: .medium))
                    .frame(height: 24)
                Text(title)
                    .font(.caption2.weight(selected ? .semibold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .foregroundColor(selected ? Theme.accent : Theme.ink)
            .opacity(enabled ? 1 : 0.38)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .disabled(!enabled)
        .accessibilityLabel(accessibilityLabel ?? title)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }

    private func recipientCard(_ recipient: RecipientCopy, year: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(recipient.prompt)
                .font(.headline)
                .foregroundColor(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(recipient.question)
                .font(.subheadline)
                .foregroundColor(Theme.inkSoft)
            HStack(spacing: 12) {
                Button("−") { model.step(-1) }
                    .accessibilityLabel("Earlier graduation year")
                Text(model.yearText.isEmpty ? String(year) : model.yearText)
                    .font(.title.weight(.semibold))
                    .frame(maxWidth: .infinity)
                Button("+") { model.step(1) }
                    .accessibilityLabel("Later graduation year")
            }
            .font(.title2.weight(.semibold))
            .buttonStyle(.bordered)
            Text(model.windowHint)
                .font(.footnote)
                .foregroundColor(Theme.inkSoft)
            Button(model.isBuilding || model.isWorking ? "Building the playlist" : "Build my playlist") {
                Task { await model.build() }
            }
            .buttonStyle(PrimaryButtonStyle(enabled: model.validYear != nil && !model.isWorking))
            .disabled(model.validYear == nil || model.isWorking)
            Text("Class of \(YearWindow.digits(year)) is the playlist you opened. Build uses the year above.")
                .font(.footnote)
                .foregroundColor(Theme.inkSoft)
        }
        .padding(16)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.line, lineWidth: 1))
    }
}

private struct YearSection: View {
    @EnvironmentObject private var model: AppModel
    let chapter: ApiYear
    let onSelect: (ApiHit) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("\(YearWindow.digits(chapter.year)) · \(chapter.hits.count) \(chapter.hits.count == 1 ? "hit" : "hits")")
                .font(.title2.weight(.bold))
                .foregroundColor(Theme.ink)
            Text(chapter.story.summary)
                .font(.body)
                .foregroundColor(Theme.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            if let editorial = chapter.story.editorial, !editorial.isEmpty {
                Text(editorial)
                    .font(.body)
                    .foregroundColor(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if model.browse == .flow {
                CoverFlowRow(hits: chapter.hits, onSelect: onSelect)
            } else {
                HitList(hits: chapter.hits, onSelect: onSelect)
            }
        }
        .id(chapter.year)
    }
}

private struct CoverFlowRow: View {
    let hits: [ApiHit]
    let onSelect: (ApiHit) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(alignment: .top, spacing: 12) {
                ForEach(hits) { hit in
                    Button {
                        onSelect(hit)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            CoverThumb(hit: hit, side: 148)
                            Text(hit.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(Theme.ink)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                            Text(hit.artist)
                                .font(.caption)
                                .foregroundColor(Theme.inkSoft)
                                .lineLimit(1)
                        }
                        .frame(width: 148, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(hit.title) by \(hit.artist)")
                }
            }
            .padding(.vertical, 4)
        }
    }
}

private struct HitList: View {
    let hits: [ApiHit]
    let onSelect: (ApiHit) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ForEach(hits) { hit in
                Button {
                    onSelect(hit)
                } label: {
                    HStack(spacing: 12) {
                        CoverThumb(hit: hit, side: 52)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(hit.title)
                                .font(.body.weight(.semibold))
                                .foregroundColor(Theme.ink)
                                .multilineTextAlignment(.leading)
                            Text(hit.artist)
                                .font(.subheadline)
                                .foregroundColor(Theme.inkSoft)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(hit.title) by \(hit.artist)")
                Divider()
            }
        }
    }
}

private struct CoverThumb: View {
    let hit: ApiHit
    let side: CGFloat

    var body: some View {
        let raw = hit.catalog?.artworkUrl ?? hit.catalog?.artworkLargeUrl
        Group {
            if let raw, let url = URL(string: raw), url.scheme == "https" {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: side, height: side)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityHidden(true)
    }

    private var fallback: some View {
        ZStack {
            Theme.cover
            Text(PlaylistImages.coverInitials(hit.title))
                .font(.headline)
                .foregroundColor(Theme.ink)
        }
    }
}
