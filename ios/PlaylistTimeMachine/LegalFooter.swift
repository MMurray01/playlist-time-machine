import SwiftUI

struct LegalFooter: View {
    var body: some View {
        VStack(spacing: 6) {
            Text(Copy.appleTrademark)
                .fixedSize(horizontal: false, vertical: true)
            Text(Copy.previewCourtesy)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 16) {
                Link("Privacy", destination: PlaylistAPI.privacyURL)
                Link("Terms", destination: PlaylistAPI.termsURL)
            }
            .foregroundColor(Theme.accent)
        }
        .font(.caption2)
        .foregroundColor(Theme.inkSoft)
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.top, 12)
    }
}
