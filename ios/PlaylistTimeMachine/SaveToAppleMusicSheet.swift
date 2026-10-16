import SwiftUI

struct SaveToAppleMusicSheet: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var playback: PlaybackController
    @State private var snapshot = ""
    @State private var committed = false
    @State private var dismissTask: Task<Void, Never>?

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
                    .disabled(model.appleMusicSavePhase == .saving || model.appleMusicSavePhase == .saved)
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
                model.playlistError = nil
                model.status = ""
            }
        }
        .onChange(of: model.appleMusicSavePhase) { phase in
            scheduleDismiss(for: phase)
        }
        .onDisappear {
            dismissTask?.cancel()
            if !committed {
                model.titleDraft = snapshot
            }
            if model.appleMusicSavePhase != .saving {
                model.appleMusicSavePhase = .editing
            }
        }
    }

    @ViewBuilder
    private var saveStatus: some View {
        switch model.appleMusicSavePhase {
        case .saving:
            HStack(alignment: .center, spacing: 12) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(Theme.ink)
                Text("Saving to Apple Music, please wait")
                    .font(.body.weight(.semibold))
                    .foregroundColor(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .combine)
        case .saved:
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(Color(red: 0.09, green: 0.45, blue: 0.27))
                    .accessibilityHidden(true)
                Text("Saved to Apple Music, please close (X)")
                    .font(.body.weight(.semibold))
                    .foregroundColor(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
        case .failed:
            if let error = model.playlistError, !error.isEmpty {
                Text(error)
                    .font(.body.weight(.semibold))
                    .foregroundColor(Theme.dangerInk)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Apple Music could not save the playlist.")
                    .font(.body.weight(.semibold))
                    .foregroundColor(Theme.dangerInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
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
        Task { @MainActor in
            await model.save(playback: playback)
        }
    }

    private func scheduleDismiss(for phase: AppleMusicSavePhase) {
        dismissTask?.cancel()
        dismissTask = nil
        guard phase == .saved else { return }
        dismissTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled, model.appleMusicSavePhase == .saved else { return }
            close()
        }
    }

    private func close() {
        dismissTask?.cancel()
        model.showAppleMusicSave = false
    }
}
