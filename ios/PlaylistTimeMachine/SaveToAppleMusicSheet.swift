import SwiftUI

struct SaveToAppleMusicSheet: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var playback: PlaybackController
    @State private var snapshot = ""
    @State private var committed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 8) {
                        Image(systemName: "applelogo")
                        Text("Apple Music")
                    }
                    .font(.title3.weight(.semibold))
                    .foregroundColor(Theme.ink)
                    Text("Save to Apple Music")
                        .font(.title.weight(.bold))
                        .foregroundColor(Theme.ink)
                    Text("This adds the playlist to your Apple Music library.")
                        .font(.subheadline)
                        .foregroundColor(Theme.inkSoft)
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Name your Playlist")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(Theme.ink)
                    TextField(
                        "",
                        text: $model.titleDraft,
                        prompt: Text(placeholder).foregroundColor(Theme.placeholder)
                    )
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)
                    .disabled(model.appleMusicSavePhase == .saving)
                    .onSubmit { model.commitTitle() }
                    .onChange(of: model.titleDraft) { value in
                        if value.count > 80 {
                            model.titleDraft = String(value.prefix(80))
                        }
                    }

                    saveStatus

                    if model.showMusicSettings {
                        Button("Open Settings") { model.openAppSettings() }
                            .buttonStyle(SecondaryButtonStyle())
                    }

                    if model.appleMusicSavePhase == .failed {
                        Button("Retry") { startSave() }
                            .buttonStyle(PrimaryButtonStyle())
                    } else if model.appleMusicSavePhase == .editing {
                        Button("Save to Apple Music") { startSave() }
                            .buttonStyle(PrimaryButtonStyle(enabled: canSave))
                            .disabled(!canSave)
                    }
                }
                .padding(24)
                .frame(maxWidth: 640, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.paper.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        close()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.body.weight(.semibold))
                            .foregroundColor(Theme.ink)
                    }
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            snapshot = model.titleDraft
            if model.appleMusicSavePhase != .saving {
                model.appleMusicSavePhase = .editing
            }
        }
        .onDisappear {
            if !committed {
                model.titleDraft = snapshot
            }
        }
    }

    @ViewBuilder
    private var saveStatus: some View {
        switch model.appleMusicSavePhase {
        case .saving:
            Text("Saving to Apple Music.  Please close (X).")
                .font(.body.weight(.semibold))
                .foregroundColor(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
        case .saved:
            Text("Saved to Apple Music")
                .font(.body.weight(.semibold))
                .foregroundColor(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
        case .failed:
            Text(model.playlistError ?? "Apple Music could not save the playlist.")
                .font(.body.weight(.semibold))
                .foregroundColor(Theme.dangerInk)
                .fixedSize(horizontal: false, vertical: true)
        case .editing:
            EmptyView()
        }
    }

    private var placeholder: String {
        YearWindow.defaultTitle(model.document?.playlist.graduationYear ?? 0)
    }

    private var canSave: Bool {
        !model.isWorking && !(model.document?.playlist.hits.isEmpty ?? true)
    }

    private func startSave() {
        committed = true
        model.commitTitle()
        model.beginAppleMusicSave(playback: playback)
    }

    private func close() {
        model.showAppleMusicSave = false
    }
}
