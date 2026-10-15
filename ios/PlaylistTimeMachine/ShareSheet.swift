import SwiftUI
import UIKit

/// Presents the system share sheet from a clear host so the playlist image and link are one share.
struct ActivityPresenter: UIViewControllerRepresentable {
    let items: [Any]
    let onFinish: () -> Void

    func makeUIViewController(context: Context) -> ShareHostController {
        let controller = ShareHostController()
        controller.items = items
        controller.onFinish = onFinish
        return controller
    }

    func updateUIViewController(_ controller: ShareHostController, context: Context) {
        controller.items = items
        controller.onFinish = onFinish
    }
}

final class ShareHostController: UIViewController {
    var items: [Any] = []
    var onFinish: () -> Void = {}
    private var didPresent = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !didPresent, presentedViewController == nil else { return }
        didPresent = true
        let activity = UIActivityViewController(activityItems: items, applicationActivities: nil)
        activity.completionWithItemsHandler = { [weak self] _, _, _, _ in
            DispatchQueue.main.async { self?.onFinish() }
        }
        if let popover = activity.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        present(activity, animated: true)
    }
}
