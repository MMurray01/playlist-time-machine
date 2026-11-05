import Photos
import SwiftUI

struct CollageViewer: View {
    @EnvironmentObject private var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var printImage: UIImage?
    @State private var working = false
    @State private var note = ""
    @State private var shareItems: [Any]?
    @State private var shareID = UUID()

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.ink
                if let image = printImage ?? model.artworkImage {
                    ZoomableCollage(image: image)
                } else {
                    ProgressView("Preparing the artwork.")
                        .tint(Theme.onAccent)
                        .foregroundColor(Theme.onAccent)
                }
            }
            .safeAreaInset(edge: .bottom) {
                VStack(alignment: .leading, spacing: 12) {
                    if working {
                        Text("Preparing a print-size image.")
                            .font(.subheadline)
                            .foregroundColor(Theme.inkSoft)
                    }
                    if !note.isEmpty {
                        Text(note)
                            .font(.subheadline)
                            .foregroundColor(Theme.ink)
                    }
                    Button("Save to Photos") {
                        Task { await saveToPhotos() }
                    }
                    .buttonStyle(PrimaryButtonStyle(enabled: canExport))
                    .disabled(!canExport)
                    Button("Share") {
                        Task { await share() }
                    }
                    .buttonStyle(PrimaryButtonStyle(enabled: canExport))
                    .disabled(!canExport)
                }
                .padding(20)
                .background(.regularMaterial)
            }
            .navigationTitle("Playlist artwork")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .background {
                if let shareItems {
                    ActivityPresenter(items: shareItems) {
                        self.shareItems = nil
                    }
                    .id(shareID)
                    .frame(width: 1, height: 1)
                }
            }
        }
        .task { await prepare() }
    }

    private var canExport: Bool {
        !working && (printImage != nil || model.artworkImage != nil)
    }

    private func prepare() async {
        working = true
        defer { working = false }
        printImage = await model.renderPrintArtwork()
    }

    private func artworkForExport() async -> UIImage? {
        if let printImage { return printImage }
        working = true
        defer { working = false }
        let image = await model.renderPrintArtwork()
        printImage = image
        return image ?? model.artworkImage
    }

    private func saveToPhotos() async {
        guard let image = await artworkForExport() else {
            note = "The artwork is not ready yet."
            return
        }
        note = await PhotoLibrarySaver.save(image)
    }

    private func share() async {
        guard let image = await artworkForExport() else {
            note = "The artwork is not ready yet."
            return
        }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("playlist-artwork-\(UUID().uuidString).jpg")
        guard let data = image.jpegData(compressionQuality: 0.95) else {
            note = "The artwork could not be shared."
            return
        }
        do {
            try data.write(to: file, options: .atomic)
        } catch {
            note = "The artwork could not be shared."
            return
        }
        var items: [Any] = []
        if let message = model.shareLink?.message, !message.isEmpty {
            items.append(message)
        } else if let url = model.shareLink?.url, !url.isEmpty {
            items.append(url)
        }
        items.append(file)
        shareID = UUID()
        shareItems = items
        note = ""
    }
}

private struct ZoomableCollage: View {
    let image: UIImage
    @State private var scale: CGFloat = 1
    @State private var baseScale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var baseOffset: CGSize = .zero

    var body: some View {
        Image(uiImage: image)
            .resizable()
            .scaledToFit()
            .scaleEffect(scale)
            .offset(offset)
            .gesture(magnify)
            .simultaneousGesture(pan)
            .padding(12)
            .accessibilityLabel("Playlist artwork")
            .accessibilityHint("Pinch to zoom")
    }

    private var magnify: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                scale = min(6, max(1, baseScale * value))
            }
            .onEnded { _ in
                baseScale = scale
                if scale <= 1.01 {
                    scale = 1
                    baseScale = 1
                    offset = .zero
                    baseOffset = .zero
                }
            }
    }

    private var pan: some Gesture {
        DragGesture()
            .onChanged { value in
                guard scale > 1 else { return }
                offset = CGSize(
                    width: baseOffset.width + value.translation.width,
                    height: baseOffset.height + value.translation.height
                )
            }
            .onEnded { _ in
                baseOffset = offset
            }
    }
}

enum PhotoLibrarySaver {
    static func save(_ image: UIImage) async -> String {
        let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard status == .authorized || status == .limited else {
            return "Photo library access is needed to save the artwork."
        }
        return await withCheckedContinuation { continuation in
            PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            } completionHandler: { success, _ in
                continuation.resume(returning: success ? "Saved to Photos." : "The artwork could not be saved.")
            }
        }
    }
}
