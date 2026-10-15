import SwiftUI

enum Theme {
    static let paper = Color(red: 246 / 255, green: 246 / 255, blue: 247 / 255)
    static let surface = Color.white
    static let ink = Color(red: 17 / 255, green: 17 / 255, blue: 19 / 255)
    static let inkSoft = Color(red: 63 / 255, green: 63 / 255, blue: 70 / 255)
    static let line = Color(red: 228 / 255, green: 228 / 255, blue: 231 / 255)
    static let accent = Color(red: 29 / 255, green: 78 / 255, blue: 216 / 255)
    static let onAccent = Color.white
    static let dangerWash = Color(red: 254 / 255, green: 242 / 255, blue: 242 / 255)
    static let dangerInk = Color(red: 159 / 255, green: 18 / 255, blue: 57 / 255)
    static let cover = Color(red: 236 / 255, green: 236 / 255, blue: 238 / 255)
}

enum Copy {
    static let previewCourtesy = "Song previews provided courtesy of iTunes."
    static let appleTrademark = "Apple and Apple Music are trademarks of Apple Inc., registered in the U.S. and other countries."
    static let productLine = "a product of Abeba Co"
    static let contact = "legal@abeba.co"
}

struct PrimaryButtonStyle: ButtonStyle {
    var enabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundColor(Theme.onAccent)
            .background(enabled ? Theme.accent : Theme.accent.opacity(0.45))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundColor(Theme.ink)
            .background(Theme.surface)
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.line, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
