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
                    viewToggle
                    Text(document.courtesy.isEmpty ? Copy.previewCourtesy : document.courtesy)
                        .font(.caption)
                        .foregroundColor(Theme.inkSoft)

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
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if model.document != nil {
                actionBar
            }
        }
    }

    @ViewBuilder
    private func artwork(_ document: PlaylistDocument) -> some View {
        let caption = "Playlist artwork for Class of \(YearWindow.digits(document.playlist.graduationYear))"
        VStack(alignment: .leading, spacing: 8) {
            Text(caption)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(Theme.ink)
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
                .accessibilityLabel(caption)
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

    private var actionBar: some View {
        let canAct = !model.isWorking && !(model.document?.playlist.hits.isEmpty ?? true)
        return VStack(alignment: .leading, spacing: 8) {
            if let error = model.playlistError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(Theme.dangerInk)
                    .fixedSize(horizontal: false, vertical: true)
            } else if !model.status.isEmpty {
                Text(model.status)
                    .font(.caption)
                    .foregroundColor(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if model.showMusicSettings {
                Button("Open Settings") { model.openAppSettings() }
                    .buttonStyle(SecondaryButtonStyle())
            }
            HStack(spacing: 10) {
                Button("Save to Apple Music") {
                    Task { await model.save(playback: playback) }
                }
                .buttonStyle(BarButtonStyle(enabled: canAct))
                .disabled(!canAct)
                Button("Share") {
                    Task { await model.share() }
                }
                .buttonStyle(BarButtonStyle(enabled: canAct))
                .disabled(!canAct)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(Theme.paper)
        .overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 1) }
    }

    private var viewToggle: some View {
        HStack(spacing: 8) {
            browseButton("Cover Flow", selected: model.browse == .flow) { model.chooseBrowse(.flow) }
            browseButton("List View", selected: model.browse == .list) { model.chooseBrowse(.list) }
        }
        .frame(maxWidth: 360)
        .frame(maxWidth: .infinity, alignment: .center)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("How to browse songs")
    }

    private func browseButton(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .foregroundColor(selected ? Theme.onAccent : Theme.ink)
            .background(selected ? Theme.accent : Theme.surface)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Theme.line, lineWidth: selected ? 0 : 1))
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

private struct BarButtonStyle: ButtonStyle {
    var enabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.vertical, 8)
            .padding(.horizontal, 6)
            .foregroundColor(Theme.onAccent)
            .background(enabled ? Theme.accent : Theme.accent.opacity(0.45))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
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
