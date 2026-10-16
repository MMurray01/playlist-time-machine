import XCTest
@testable import PlaylistTimeMachine

final class PlaylistTimeMachineTests: XCTestCase {
    func testGraduationWindowMatchesTheWeb() {
        let window = YearWindow.window(1984)
        XCTAssertEqual(window.start, 1979)
        XCTAssertEqual(window.end, 1989)
        XCTAssertEqual(window.end - window.start + 1, 11)
        let limits = YearWindow.limits(
            now: Date(timeIntervalSince1970: 1_760_000_000),
            chartMin: 1960,
            chartMax: 2024
        )
        XCTAssertGreaterThanOrEqual(limits.min, YearWindow.minimumGraduationYear)
        XCTAssertFalse(YearWindow.isValid(1800, limits: limits))
        XCTAssertTrue(YearWindow.message(2099, limits: limits, nowYear: 2026).contains("hasn’t happened yet"))
        XCTAssertEqual(YearWindow.cleanTitle("   ", graduationYear: 1984), "Class of 1984")
        XCTAssertEqual(YearWindow.cleanTitle(String(repeating: "x", count: 120), graduationYear: 1984).count, 80)
        XCTAssertEqual(YearWindow.typedYear("1984"), 1984)
        XCTAssertNil(YearWindow.typedYear("198"))
    }

    func testDeepLinksStayOnPlaylistPages() {
        let page = URL(string: "https://www.playlisttimemachine.com/p/hvNkUNU7FX?collage=1#year-1984")!
        XCTAssertEqual(DeepLink.shareID(from: page), "hvNkUNU7FX")
        let apex = URL(string: "https://playlisttimemachine.com/p/hvNkUNU7FX")!
        XCTAssertEqual(DeepLink.shareID(from: apex), "hvNkUNU7FX")
        let image = URL(string: "https://www.playlisttimemachine.com/p/hvNkUNU7FX/opengraph-image")!
        XCTAssertNil(DeepLink.shareID(from: image))
        let other = URL(string: "https://example.com/p/hvNkUNU7FX")!
        XCTAssertNil(DeepLink.shareID(from: other))
        let scheme = URL(string: "playlisttimemachine://p/hvNkUNU7FX")!
        XCTAssertEqual(DeepLink.shareID(from: scheme), "hvNkUNU7FX")
        XCTAssertFalse(DeepLink.isShareID("no"))
    }

    func testPrintCollageKeepsRoomForThePlaylist() {
        let plan = CollagePlan(
            format: "square",
            layout: "grid",
            width: 1080,
            height: 1080,
            headline: "Class of 1990 · 1985–1995",
            mark: "Playlist Time Machine",
            titleSize: 52,
            markSize: 22,
            art: CollageBox(x: 54, y: 124, width: 972, height: 878),
            tiles: [CollageTile(key: "a", x: 54, y: 124, size: 120, hero: true)],
            heroKeys: ["a"]
        )
        let print = PlaylistImages.printPlan(plan)
        XCTAssertGreaterThanOrEqual(print.width, 3000)
        XCTAssertGreaterThanOrEqual(print.height, 3000)
        XCTAssertEqual(print.headline, plan.headline)
        XCTAssertGreaterThan(print.tiles[0].size, plan.tiles[0].size)
        XCTAssertEqual(print.tiles[0].key, "a")
        let source = "https://is1-ssl.mzstatic.com/image/thumb/Music/a/100x100bb.jpg"
        XCTAssertEqual(
            PlaylistImages.sizedArtwork(source, size: 3000),
            "https://is1-ssl.mzstatic.com/image/thumb/Music/a/3000x3000bb.jpg"
        )
        XCTAssertEqual(YearWindow.digits(1985), "1985")
        XCTAssertFalse(YearWindow.digits(1985).contains(","))
        XCTAssertEqual(YearWindow.cleanTitle("", graduationYear: 1990), "Class of 1990")
        XCTAssertEqual(YearWindow.cleanTitle("   ", graduationYear: 1990), "Class of 1990")
    }

    func testStoryPicksSpreadAcrossYears() {
        struct Row { let year: Int }
        var hits: [Row] = []
        for year in 1979...1989 {
            for _ in 0..<8 { hits.append(Row(year: year)) }
        }
        let picked = PlaylistImages.pickStoryHits(hits, yearOf: { $0.year }, limit: 20)
        XCTAssertEqual(picked.count, 20)
        XCTAssertEqual(Set(picked.map(\.year)).count, 11)
        XCTAssertEqual(picked[0].year, 1979)
        XCTAssertTrue(picked.contains { $0.year == 1989 })
    }

    func testPlaylistJSONDecodes() throws {
        let json = """
        {
          "courtesy": "Song previews provided courtesy of iTunes.",
          "limits": { "min": 1955, "max": 2026 },
          "limitsError": null,
          "availableGenres": ["Pop"],
          "playlist": {
            "graduationYear": 1984,
            "startYear": 1979,
            "endYear": 1989,
            "genres": [],
            "title": "Class of 1984",
            "hits": [
              {
                "key": "song:1",
                "songId": 1,
                "year": 1979,
                "weekNumber": 1,
                "chartDate": "1979-01-06",
                "title": "Too Much Heaven",
                "artist": "Bee Gees",
                "genre": "Pop",
                "weeksAtNumberOne": 2,
                "catalog": {
                  "catalogId": "111",
                  "artworkUrl": "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg",
                  "artworkLargeUrl": null,
                  "previewUrl": "https://audio-ssl.itunes.apple.com/preview.m4a",
                  "url": "https://music.apple.com/us/song/111"
                },
                "matchReason": null,
                "appleMusicUrl": "https://music.apple.com/us/song/111"
              }
            ],
            "years": [
              {
                "year": 1979,
                "story": {
                  "year": 1979,
                  "decade": 1970,
                  "facts": { "year": 1979, "hitCount": 1, "longestRuns": [], "topArtists": [] },
                  "summary": "In 1979, one song reaches No. 1.",
                  "editorial": null
                },
                "hits": [
                  {
                    "key": "song:1",
                    "songId": 1,
                    "year": 1979,
                    "weekNumber": 1,
                    "chartDate": "1979-01-06",
                    "title": "Too Much Heaven",
                    "artist": "Bee Gees",
                    "genre": "Pop",
                    "weeksAtNumberOne": 2,
                    "catalog": null,
                    "matchReason": "not_in_catalog",
                    "appleMusicUrl": "https://music.apple.com/us/search?term=Too%20Much%20Heaven"
                  }
                ]
              }
            ]
          },
          "artwork": null,
          "library": {
            "name": "Class of 1984 · Playlist Time Machine",
            "description": "Number one hits from 1979 through 1989, the popular songs of the time. Made at playlisttimemachine.com",
            "coverTip": "In Apple Music, open the playlist, tap …, tap Edit, then tap the photo button to choose this image."
          },
          "share": null,
          "recipient": null,
          "filterMessage": null
        }
        """.data(using: .utf8)!
        let document = try JSONDecoder().decode(PlaylistDocument.self, from: json)
        XCTAssertEqual(document.playlist.hits[0].catalog?.catalogId, "111")
        XCTAssertEqual(document.playlist.years[0].hits[0].matchReason, "not_in_catalog")
        XCTAssertEqual(document.courtesy, Copy.previewCourtesy)
        XCTAssertNil(document.artwork)
        XCTAssertEqual(document.library.name, "Class of 1984 · Playlist Time Machine")
    }
}
