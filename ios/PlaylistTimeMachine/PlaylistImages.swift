import UIKit

actor ArtworkImageCache {
    static let shared = ArtworkImageCache()
    private var images: [URL: UIImage] = [:]

    func image(for url: URL) async -> UIImage? {
        if let cached = images[url] { return cached }
        guard url.scheme == "https" else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode),
              let image = UIImage(data: data)
        else { return nil }
        images[url] = image
        return image
    }
}

enum PlaylistImages {
    @MainActor
    static func renderArtwork(_ artwork: PlaylistArtwork, headline: String, link: String?) async -> UIImage {
        let covers = await loadCovers(artwork.covers)
        let plan = artwork.plan
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: plan.width, height: plan.height), format: format)
        return renderer.image { context in
            let ctx = context.cgContext
            UIColor(red: 246 / 255, green: 246 / 255, blue: 247 / 255, alpha: 1).setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: plan.width, height: plan.height))
            let title = fitted(headline, maxWidth: plan.width - 108, size: plan.titleSize, weight: .semibold)
            drawCentered(title.text, font: title.font, color: UIColor(red: 17 / 255, green: 17 / 255, blue: 19 / 255, alpha: 1), midY: plan.art.y / 2, canvasWidth: plan.width, maxWidth: plan.width - 108)
            for tile in plan.tiles {
                drawTile(tile, title: covers[tile.key]?.title ?? "", image: covers[tile.key]?.image, in: ctx)
            }
            drawFooter(mark: artwork.mark, link: link, plan: plan)
        }
    }

    @MainActor
    static func renderStory(title: String, link: String, hits: [ApiHit]) async -> UIImage {
        let picked = pickStoryHits(hits, yearOf: { $0.year }, limit: 20)
        var tiles: [(title: String, image: UIImage?)] = []
        for hit in picked {
            let art = hit.catalog?.artworkLargeUrl ?? hit.catalog?.artworkUrl
            let image = await imageForArtwork(art, size: 360)
            tiles.append((hit.title, image))
        }
        let width = 1080.0
        let height = 1920.0
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format)
        return renderer.image { _ in
            UIColor(red: 12 / 255, green: 8 / 255, blue: 20 / 255, alpha: 1).setFill()
            UIBezierPath(rect: CGRect(x: 0, y: 0, width: width, height: height)).fill()
            let columns = tiles.count > 15 ? 4 : 3
            let rows = max(1, Int(ceil(Double(max(tiles.count, 1)) / Double(columns))))
            let gap = 14.0
            let pad = 36.0
            let cell = floor((width - pad * 2 - gap * Double(columns - 1)) / Double(columns))
            let gridHeight = Double(rows) * cell + gap * Double(max(0, rows - 1))
            let offsetY = max(pad, ((height - gridHeight) / 2).rounded())
            let gridWidth = Double(columns) * cell + gap * Double(columns - 1)
            let offsetX = ((width - gridWidth) / 2).rounded()
            for (index, tile) in tiles.enumerated() {
                let column = index % columns
                let row = index / columns
                let x = offsetX + Double(column) * (cell + gap)
                let y = offsetY + Double(row) * (cell + gap)
                drawCover(image: tile.image, title: tile.title, rect: CGRect(x: x, y: y, width: cell, height: cell), radius: min(18, cell * 0.08), dark: true)
            }
            let colors = [
                UIColor(red: 8 / 255, green: 5 / 255, blue: 16 / 255, alpha: 0.86).cgColor,
                UIColor(red: 8 / 255, green: 5 / 255, blue: 16 / 255, alpha: 0.62).cgColor,
                UIColor(red: 8 / 255, green: 5 / 255, blue: 16 / 255, alpha: 0.18).cgColor,
            ] as CFArray
            let space = CGColorSpaceCreateDeviceRGB()
            if let gradient = CGGradient(colorsSpace: space, colors: colors, locations: [0, 0.42, 1]) {
                UIGraphicsGetCurrentContext()?.drawRadialGradient(
                    gradient,
                    startCenter: CGPoint(x: width / 2, y: height / 2),
                    startRadius: 40,
                    endCenter: CGPoint(x: width / 2, y: height / 2),
                    endRadius: height * 0.48,
                    options: []
                )
            }
            let titleFit = fitted(title, maxWidth: width - 120, size: 78, weight: .bold)
            drawCentered(titleFit.text, font: titleFit.font, color: UIColor(red: 1, green: 253 / 255, blue: 248 / 255, alpha: 1), midY: height / 2 - 28, canvasWidth: width, maxWidth: width - 120)
            let tagline = fitted("The number one hits from the years that shaped me.", maxWidth: width - 160, size: 36, weight: .medium)
            drawCentered(tagline.text, font: tagline.font, color: UIColor(red: 244 / 255, green: 241 / 255, blue: 234 / 255, alpha: 0.94), midY: height / 2 + 64, canvasWidth: width, maxWidth: width - 120)
            let mark = fitted(link, maxWidth: width - 80, size: 28, weight: .medium)
            drawCentered(mark.text, font: mark.font, color: UIColor(red: 244 / 255, green: 241 / 255, blue: 234 / 255, alpha: 0.9), midY: height / 2 + 140, canvasWidth: width, maxWidth: width - 80)
        }
    }

    static func pickStoryHits<T>(_ hits: [T], yearOf: (T) -> Int, limit: Int = 20) -> [T] {
        if hits.count <= limit { return hits }
        var byYear: [Int: [T]] = [:]
        for hit in hits {
            byYear[yearOf(hit), default: []].append(hit)
        }
        let years = byYear.keys.sorted()
        var picked: [T] = []
        var round = 0
        while picked.count < limit {
            var added = false
            for year in years {
                guard let hit = byYear[year]?[safe: round] else { continue }
                picked.append(hit)
                added = true
                if picked.count >= limit { break }
            }
            if !added { break }
            round += 1
        }
        return picked
    }

    private struct LoadedCover {
        let title: String
        let image: UIImage?
    }

    private static func loadCovers(_ covers: [ArtworkCover]) async -> [String: LoadedCover] {
        await withTaskGroup(of: (String, LoadedCover).self) { group in
            for cover in covers {
                group.addTask {
                    let image = await imageForArtwork(cover.artworkUrl, size: nil)
                    return (cover.key, LoadedCover(title: cover.title, image: image))
                }
            }
            var loaded: [String: LoadedCover] = [:]
            for await (key, cover) in group {
                loaded[key] = cover
            }
            return loaded
        }
    }

    private static func imageForArtwork(_ raw: String?, size: Int?) async -> UIImage? {
        guard var raw, let url = URL(string: raw), url.scheme == "https" else { return nil }
        if let size {
            raw = sizedArtwork(raw, size: size)
            guard let sized = URL(string: raw) else { return nil }
            return await ArtworkImageCache.shared.image(for: sized)
        }
        return await ArtworkImageCache.shared.image(for: url)
    }

    private static func sizedArtwork(_ value: String, size: Int) -> String {
        guard let regex = try? NSRegularExpression(pattern: #"(\d+)x(\d+)(bb)?(?=\.(?:jpg|jpeg|png|webp)\b)"#, options: [.caseInsensitive]) else {
            return value
        }
        let range = NSRange(value.startIndex..., in: value)
        return regex.stringByReplacingMatches(in: value, range: range, withTemplate: "\(size)x\(size)$3")
    }

    private static func drawTile(_ tile: CollageTile, title: String, image: UIImage?, in context: CGContext) {
        drawCover(
            image: image,
            title: title,
            rect: CGRect(x: tile.x, y: tile.y, width: tile.size, height: tile.size),
            radius: min(12, tile.size * 0.08),
            dark: false
        )
        _ = context
    }

    private static func drawCover(image: UIImage?, title: String, rect: CGRect, radius: CGFloat, dark: Bool) {
        let context = UIGraphicsGetCurrentContext()
        context?.saveGState()
        defer { context?.restoreGState() }
        let path = UIBezierPath(roundedRect: rect, cornerRadius: radius)
        path.addClip()
        if let image, image.size.width > 0 {
            let scale = max(rect.width / image.size.width, rect.height / image.size.height)
            let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            let origin = CGPoint(x: rect.midX - size.width / 2, y: rect.midY - size.height / 2)
            image.draw(in: CGRect(origin: origin, size: size))
        } else {
            (dark ? UIColor(red: 42 / 255, green: 36 / 255, blue: 51 / 255, alpha: 1) : UIColor(red: 236 / 255, green: 236 / 255, blue: 238 / 255, alpha: 1)).setFill()
            UIBezierPath(rect: rect).fill()
            let font = UIFont.systemFont(ofSize: max(12, rect.width * 0.22), weight: .semibold)
            let color = dark ? UIColor(red: 246 / 255, green: 246 / 255, blue: 247 / 255, alpha: 1) : UIColor(red: 17 / 255, green: 17 / 255, blue: 19 / 255, alpha: 1)
            let initials = coverInitials(title)
            let textSize = (initials as NSString).size(withAttributes: [.font: font])
            initials.draw(at: CGPoint(x: rect.midX - textSize.width / 2, y: rect.midY - textSize.height / 2), withAttributes: [
                .font: font,
                .foregroundColor: color,
            ])
        }
    }

    private static func drawFooter(mark: String, link: String?, plan: CollagePlan) {
        let color = UIColor(red: 63 / 255, green: 63 / 255, blue: 70 / 255, alpha: 1)
        if let link, !link.isEmpty {
            let markFont = UIFont.systemFont(ofSize: plan.markSize, weight: .medium)
            let linkFont = UIFont.systemFont(ofSize: max(16, plan.markSize - 4), weight: .medium)
            drawCentered(mark, font: markFont, color: color, midY: plan.height - 52, canvasWidth: plan.width, maxWidth: plan.width - 108)
            let fittedLink = fitted(link, maxWidth: plan.width - 108, size: linkFont.pointSize, weight: .medium)
            drawCentered(fittedLink.text, font: fittedLink.font, color: color, midY: plan.height - 24, canvasWidth: plan.width, maxWidth: plan.width - 108)
        } else {
            let font = UIFont.systemFont(ofSize: plan.markSize, weight: .medium)
            let textSize = (mark as NSString).size(withAttributes: [.font: font])
            mark.draw(at: CGPoint(x: plan.width - 54 - textSize.width, y: plan.height - 39 - textSize.height / 2), withAttributes: [
                .font: font,
                .foregroundColor: color,
            ])
        }
    }

    private static func drawCentered(_ text: String, font: UIFont, color: UIColor, midY: Double, canvasWidth: Double, maxWidth: Double) {
        let bounds = (text as NSString).size(withAttributes: [.font: font])
        let drawWidth = min(bounds.width, maxWidth)
        let x = (canvasWidth - drawWidth) / 2
        text.draw(
            in: CGRect(x: x, y: midY - bounds.height / 2, width: drawWidth, height: bounds.height + 4),
            withAttributes: [
                .font: font,
                .foregroundColor: color,
            ]
        )
    }

    private static func fitted(_ text: String, maxWidth: Double, size: Double, weight: UIFont.Weight) -> (text: String, font: UIFont) {
        var current = size
        var font = UIFont.systemFont(ofSize: current, weight: weight)
        while current > 22 && (text as NSString).size(withAttributes: [.font: font]).width > maxWidth {
            current -= 2
            font = UIFont.systemFont(ofSize: current, weight: weight)
        }
        if (text as NSString).size(withAttributes: [.font: font]).width <= maxWidth {
            return (text, font)
        }
        var clipped = text
        while clipped.count > 1 && (("\(clipped)…") as NSString).size(withAttributes: [.font: font]).width > maxWidth {
            clipped.removeLast()
        }
        return ("\(clipped)…", font)
    }

    static func coverInitials(_ title: String) -> String {
        let letters = title
            .replacingOccurrences(of: "[^A-Za-z0-9 ]", with: " ", options: .regularExpression)
            .split(whereSeparator: \.isWhitespace)
            .prefix(2)
            .compactMap { $0.first }
            .map { String($0).uppercased() }
            .joined()
        return letters.isEmpty ? "1" : letters
    }

    static func headline(title: String, start: Int, end: Int) -> String {
        let name = title.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        let shown = name.isEmpty ? "Playlist" : name
        return "\(shown) · \(start)\u{2013}\(end)"
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
