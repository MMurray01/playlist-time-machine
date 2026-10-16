import XCTest

/// Store screenshots for the 6.9-inch iPhone slot. The test runner writes PNGs on the Mac.
final class ScreenshotTests: XCTestCase {
    private let shotDirectory = "/tmp/ptm-screenshots"

    func testStoreScreenshots() throws {
        let directory = URL(fileURLWithPath: shotDirectory, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
            try FileManager.default.removeItem(at: file)
        }

        let app = XCUIApplication()
        app.launchArguments = ["-ptm-graduation-year", "1995"]
        app.launch()

        let build = app.buttons["Build my playlist"]
        XCTAssertTrue(build.waitForExistence(timeout: 30), app.debugDescription)
        let enabled = NSPredicate(format: "isEnabled == true")
        expectation(for: enabled, evaluatedWith: build)
        waitForExpectations(timeout: 40)
        // Let the cover wall finish loading before the first frame.
        sleep(3)
        try save("01-year-picker", from: app, to: directory)

        build.tap()

        let artwork = app.buttons["Playlist artwork"]
        XCTAssertTrue(artwork.waitForExistence(timeout: 90), app.debugDescription)
        sleep(4)
        try save("02-results-collage", from: app, to: directory)

        let list = app.buttons["List View"]
        XCTAssertTrue(list.waitForExistence(timeout: 10))
        list.tap()
        sleep(2)
        try save("03-list-view", from: app, to: directory)

        let songs = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", " by "))
        XCTAssertTrue(songs.firstMatch.waitForExistence(timeout: 15), app.debugDescription)
        var swipes = 0
        while !songs.firstMatch.isHittable && swipes < 5 {
            app.swipeUp()
            swipes += 1
        }
        songs.firstMatch.tap()

        let preview = app.buttons[":30 Preview"]
        let listen = app.buttons["Listen on Apple Music"]
        let songVisible = preview.waitForExistence(timeout: 15) || listen.waitForExistence(timeout: 5)
        XCTAssertTrue(songVisible, app.debugDescription)
        sleep(2)
        try save("04-song-sheet", from: app, to: directory)

        app.buttons["Close"].tap()
        let saveMusic = app.buttons["Save to Apple Music"]
        XCTAssertTrue(saveMusic.waitForExistence(timeout: 10))
        var dockSwipes = 0
        while !saveMusic.isHittable && dockSwipes < 3 {
            app.swipeUp()
            dockSwipes += 1
        }
        saveMusic.tap()

        let name = app.staticTexts["Name your Playlist"]
        XCTAssertTrue(name.waitForExistence(timeout: 10), app.debugDescription)
        sleep(1)
        try save("05-save-apple-music", from: app, to: directory)
    }

    private func save(_ name: String, from app: XCUIApplication, to directory: URL) throws {
        let screenshot = XCUIScreen.main.screenshot()
        let data = screenshot.pngRepresentation
        let url = directory.appendingPathComponent("\(name).png")
        try data.write(to: url)
        let (width, height) = pngPixelSize(data)
        let accepted = [(1320, 2868), (1290, 2796), (1260, 2736)]
        XCTAssertTrue(
            accepted.contains { $0.0 == width && $0.1 == height },
            "\(name) is \(width)x\(height). The 6.9-inch slot needs 1320x2868, 1290x2796, or 1260x2736."
        )
        _ = app
    }

    private func pngPixelSize(_ data: Data) -> (Int, Int) {
        let bytes = [UInt8](data)
        guard bytes.count > 24,
              bytes.starts(with: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) else {
            return (0, 0)
        }
        let width = (Int(bytes[16]) << 24) | (Int(bytes[17]) << 16) | (Int(bytes[18]) << 8) | Int(bytes[19])
        let height = (Int(bytes[20]) << 24) | (Int(bytes[21]) << 16) | (Int(bytes[22]) << 8) | Int(bytes[23])
        return (width, height)
    }
}
