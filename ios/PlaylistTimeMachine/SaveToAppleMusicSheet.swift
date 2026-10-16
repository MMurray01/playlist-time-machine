import SwiftUI

struct SaveToAppleMusicSheet: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var playback: PlaybackController
    @Environment(\.dismiss) private var dismiss
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
                    .onSubmit { model.commitTitle() }
                    .onChange(of: model.titleDraft) { value in
                        if value.count > 80 {
                            model.titleDraft = String(value.prefix(80))
                        }
                    }

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

                    Button(model.isWorking ? "Saving to Apple Music" : "Save to Apple Music") {
                        committed = true
                        model.commitTitle()
                        Task {
                            await model.save(playback: playback)
                            if model.playlistError == nil && !model.showMusicSettings {
                                dismiss()
                            }
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle(enabled: canSave))
                    .disabled(!canSave)
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
                        dismiss()
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
            model.playlistError = nil
            model.status = ""
        }
        .onDisappear {
            if !committed {
                model.titleDraft = snapshot
            }
        }
    }

    private var placeholder: String {
        YearWindow.defaultTitle(model.document?.playlist.graduationYear ?? 0)
    }

    private var canSave: Bool {
        !model.isWorking && !(model.document?.playlist.hits.isEmpty ?? true)
    }
}
