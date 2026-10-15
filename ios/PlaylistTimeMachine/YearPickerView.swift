import SwiftUI

struct YearPickerView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text("Playlist Time Machine")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(Theme.inkSoft)
                Text("Rediscover the soundtrack of your life")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Your first dance, graduation, those long summer nights. Enter your high school graduation year and get the number one hits from the eleven years that shaped you, the popular songs of the time.")
                    .font(.body)
                    .foregroundColor(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                Text("What year did you graduate high school?")
                    .font(.headline)
                    .foregroundColor(Theme.ink)

                HStack(spacing: 12) {
                    stepButton(delta: -1, label: "Earlier graduation year", symbol: "−")
                    TextField("Year", text: $model.yearText)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .font(.system(size: 40, weight: .semibold))
                        .foregroundColor(Theme.ink)
                        .onChange(of: model.yearText) { value in
                            let digits = value.filter(\.isNumber).prefix(4)
                            if digits != Substring(value) { model.yearText = String(digits) }
                        }
                        .accessibilityLabel("Graduation year")
                    stepButton(delta: 1, label: "Later graduation year", symbol: "+")
                }

                VStack(spacing: 6) {
                    Slider(
                        value: Binding(
                            get: { Double(model.sliderYear) },
                            set: { model.yearText = String(Int($0.rounded())) }
                        ),
                        in: Double(model.limits.min)...Double(model.limits.max),
                        step: 1
                    )
                    .tint(Theme.accent)
                    .accessibilityLabel("Graduation year")
                    HStack {
                        Text(String(model.limits.min))
                        Spacer()
                        Text(String(model.limits.max))
                    }
                    .font(.caption)
                    .foregroundColor(Theme.inkSoft)
                }

                Text(model.windowHint)
                    .font(.subheadline)
                    .foregroundColor(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)

                if let error = model.homeError {
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(Theme.dangerInk)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.dangerWash)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                Button(model.isBuilding ? "Building the playlist" : "Build my playlist") {
                    Task { await model.build() }
                }
                .buttonStyle(PrimaryButtonStyle(enabled: model.validYear != nil && model.chartConnected && !model.isBuilding))
                .disabled(model.validYear == nil || !model.chartConnected || model.isBuilding)

                if model.isBuilding, let year = model.validYear {
                    let window = YearWindow.window(year)
                    Text("Gathering every No. 1 from \(window.start) through \(window.end).")
                        .font(.subheadline)
                        .foregroundColor(Theme.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                LegalFooter()
            }
            .padding(24)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background {
            CoverWall()
        }
        .task { await model.loadLimits() }
    }

    private func stepButton(delta: Int, label: String, symbol: String) -> some View {
        Button(symbol) { model.step(delta) }
            .font(.title2.weight(.semibold))
            .frame(width: 48, height: 48)
            .foregroundColor(Theme.ink)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.line, lineWidth: 1))
            .accessibilityLabel(label)
    }
}
