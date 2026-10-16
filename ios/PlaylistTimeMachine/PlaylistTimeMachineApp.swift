import SwiftUI

@main
struct PlaylistTimeMachineApp: App {
    @StateObject private var model = AppModel()
    @StateObject private var playback = PlaybackController()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(model)
                .environmentObject(playback)
                .musicSubscriptionOffer(isPresented: $playback.showOffer, options: playback.offerOptions)
                .onOpenURL { model.open(url: $0) }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    guard let url = activity.webpageURL else { return }
                    model.open(url: url)
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var model: AppModel
    @EnvironmentObject private var playback: PlaybackController

    var body: some View {
        NavigationStack {
            Group {
                if model.showingPlaylist {
                    PlaylistView()
                } else {
                    YearPickerView()
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            TransportBar()
        }
        .sheet(item: $model.selectedHit) { hit in
            SongDetailView(hit: hit)
                .onDisappear { playback.stop() }
        }
        .background {
            if let draft = model.shareDraft {
                ActivityPresenter(items: draft.items) {
                    model.shareDraft = nil
                }
                .id(draft.id)
                .frame(width: 1, height: 1)
            }
        }
        .preferredColorScheme(.light)
        .overlay(alignment: .top) {
            if let message = model.toastMessage {
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(model.toastIsError ? Theme.dangerInk : Theme.ink)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(.regularMaterial, in: Capsule())
                    .padding(.top, 8)
                    .padding(.horizontal, 24)
                    .allowsHitTesting(false)
                    .accessibilityAddTraits(.isStaticText)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: model.toastMessage)
    }
}
