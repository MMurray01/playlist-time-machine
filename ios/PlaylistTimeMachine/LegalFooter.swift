import SwiftUI

struct LegalFooter: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 14) {
                Link("Privacy", destination: PlaylistAPI.privacyURL)
                Link("Terms", destination: PlaylistAPI.termsURL)
            }
            .font(.subheadline.weight(.semibold))
            Text(Copy.productLine)
                .font(.footnote)
                .foregroundColor(Theme.inkSoft)
            Text(Copy.appleTrademark)
                .font(.caption2)
                .foregroundColor(Theme.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }
}
