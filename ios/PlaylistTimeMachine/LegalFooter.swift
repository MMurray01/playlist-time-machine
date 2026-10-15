import SwiftUI

struct LegalFooter: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 14) {
                Link("Privacy", destination: PlaylistAPI.privacyURL)
                Link("Terms", destination: PlaylistAPI.termsURL)
                Link(Copy.contact, destination: URL(string: "mailto:\(Copy.contact)")!)
            }
            .font(.subheadline.weight(.semibold))
            Text(Copy.productLine)
                .font(.footnote)
                .foregroundColor(Theme.inkSoft)
            Text(Copy.appleTrademark)
                .font(.footnote)
                .foregroundColor(Theme.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }
}
