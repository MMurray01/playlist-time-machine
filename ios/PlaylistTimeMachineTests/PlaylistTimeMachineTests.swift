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
        XCTAssertEqual(PlaylistImages.yearRangeLabel(start: 1985, end: 1995), "1985 - 1995")
        XCTAssertFalse(PlaylistImages.yearRangeLabel(start: 1985, end: 1995).contains(","))
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

    func testLibraryWriteUsesTheLibraryCapability() {
        XCTAssertEqual(LibrarySavePolicy.decide(hasCloudLibraryEnabled: true, canBecomeSubscriber: false), .write)
        XCTAssertEqual(LibrarySavePolicy.decide(hasCloudLibraryEnabled: true, canBecomeSubscriber: true), .write)
        XCTAssertEqual(LibrarySavePolicy.decide(hasCloudLibraryEnabled: false, canBecomeSubscriber: true), .needsSubscription)
        XCTAssertEqual(LibrarySavePolicy.decide(hasCloudLibraryEnabled: false, canBecomeSubscriber: false), .libraryUnavailable)
        XCTAssertEqual(LibrarySavePolicy.decide(hasCloudLibraryEnabled: nil, canBecomeSubscriber: nil), .checkFailed)
        XCTAssertEqual(LibrarySavePolicy.decide(hasCloudLibraryEnabled: nil, canBecomeSubscriber: true), .checkFailed)
        XCTAssertNil(LibrarySavePolicy.blockMessage(hasCloudLibraryEnabled: true, canBecomeSubscriber: false))
        let blocked = LibrarySavePolicy.blockMessage(hasCloudLibraryEnabled: false, canBecomeSubscriber: true)
        XCTAssertTrue(blocked?.contains("Nothing was saved.") == true)
        XCTAssertNotEqual(blocked, LibrarySavePolicy.savedToast)
        XCTAssertEqual(
            LibrarySavePolicy.blockMessage(hasCloudLibraryEnabled: nil, canBecomeSubscriber: nil),
            LibrarySavePolicy.checkFailedMessage
        )
    }

    func testPartialLibraryWriteStaysOnePlaylist() {
        XCTAssertFalse(LibrarySavePolicy.keepReturnedPlaylist(created: false, added: 0, requested: 12))
        XCTAssertTrue(LibrarySavePolicy.keepReturnedPlaylist(created: true, added: 100, requested: 140))
        XCTAssertTrue(LibrarySavePolicy.stoppedEarly(created: true, added: 100, requested: 140))
        XCTAssertFalse(LibrarySavePolicy.stoppedEarly(created: true, added: 140, requested: 140))
        XCTAssertFalse(LibrarySavePolicy.stoppedEarly(created: false, added: 0, requested: 140))
        let note = LibrarySavePolicy.savedNote(count: 100, requested: 140, missingCount: 2, incomplete: true)
        XCTAssertTrue(note.contains("Saved 100 of 140 songs to Apple Music."))
        XCTAssertTrue(note.contains("2 songs were not in Apple Music."))
        XCTAssertTrue(note.contains("Saving again creates another copy."))
        XCTAssertEqual(
            LibrarySavePolicy.savedNote(count: 10, requested: 12, missingCount: 2, incomplete: false),
            "Saved 10 of 12 songs to Apple Music. 2 songs were not in Apple Music."
        )
        XCTAssertEqual(
            LibrarySavePolicy.savedNote(count: 11, requested: 12, missingCount: 1, incomplete: false),
            "Saved 11 of 12 songs to Apple Music. 1 song was not in Apple Music."
        )
        XCTAssertEqual(LibrarySavePolicy.successToast(incomplete: false), "Saved to Apple Music")
        XCTAssertNotEqual(LibrarySavePolicy.successToast(incomplete: true), LibrarySavePolicy.successToast(incomplete: false))
        XCTAssertEqual(LibrarySavePolicy.checkingLabel, "Checking Apple Music…")
        XCTAssertNotEqual(LibrarySavePolicy.checkingLabel, LibrarySavePolicy.savingLabel)
    }

    func testStaleSaveDoesNotClaimTheNextPlaylist() {
        let idle = AppleMusicSaveTrack.noTask
        let first = AppleMusicSaveTrack.begin(taskTicket: idle, generation: 1)
        XCTAssertEqual(first, 1)
        XCTAssertEqual(AppleMusicSaveTrack.begin(taskTicket: first, generation: 1), first)

        let released = AppleMusicSaveTrack.release()
        XCTAssertEqual(released, idle)
        let second = AppleMusicSaveTrack.begin(taskTicket: released, generation: 2)
        XCTAssertEqual(second, 2)

        let legacyClearsTheNewTask = idle
        let kept = AppleMusicSaveTrack.nextTaskTicket(taskTicket: second, ticket: first, generation: 2)
        XCTAssertEqual(kept, second)
        XCTAssertNotEqual(kept, legacyClearsTheNewTask)
        XCTAssertFalse(AppleMusicSaveTrack.clearsWorking(taskTicket: second, ticket: first, generation: 2))
        XCTAssertFalse(AppleMusicSaveTrack.isCurrent(taskTicket: second, ticket: first, generation: 2))

        XCTAssertTrue(AppleMusicSaveTrack.clearsWorking(taskTicket: second, ticket: second, generation: 2))
        XCTAssertEqual(AppleMusicSaveTrack.nextTaskTicket(taskTicket: second, ticket: second, generation: 2), idle)

        let samePlaylist = AppleMusicSaveTrack.begin(taskTicket: idle, generation: 4)
        XCTAssertTrue(AppleMusicSaveTrack.isCurrent(taskTicket: samePlaylist, ticket: samePlaylist, generation: 4))
        XCTAssertTrue(AppleMusicSaveTrack.clearsWorking(taskTicket: samePlaylist, ticket: samePlaylist, generation: 4))
    }

    func testNewDocumentDropsSaveChromeAndPrefetchDoesNotReplaceTheSaveError() {
        XCTAssertTrue(PlaylistSaveChrome.kept(value: true, replacedDocument: false))
        XCTAssertFalse(PlaylistSaveChrome.kept(value: true, replacedDocument: true))
        XCTAssertFalse(PlaylistSaveChrome.clearsSaveChrome(replacedDocument: false))
        XCTAssertTrue(PlaylistSaveChrome.clearsSaveChrome(replacedDocument: true))

        let saveError = "An Apple Music subscription is required to add these songs to your library. Nothing was saved."
        var shown = saveError
        if ShareErrorRouting.replacesPlaylistError(explicit: false, sameDocument: true) {
            shown = "The share link could not be saved."
        }
        XCTAssertEqual(shown, saveError)
        XCTAssertFalse(ShareErrorRouting.replacesPlaylistError(explicit: true, sameDocument: false))
        XCTAssertTrue(ShareErrorRouting.replacesPlaylistError(explicit: true, sameDocument: true))
        let legacyAlwaysReplaces = true
        XCTAssertNotEqual(ShareErrorRouting.replacesPlaylistError(explicit: false, sameDocument: true), legacyAlwaysReplaces)
    }

    func testDetachedLibrarySaveSurvivesCancellingTheSheetTask() async {
        let started = expectation(description: "library save started")
        let finished = expectation(description: "library save finished")
        let result = SaveSurvival()
        let sheet = Task {
            result.job = Task.detached {
                started.fulfill()
                do {
                    try await Task.sleep(nanoseconds: 200_000_000)
                    result.survived = !Task.isCancelled
                } catch {
                    result.survived = false
                }
                finished.fulfill()
            }
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 20_000_000)
            }
        }
        await fulfillment(of: [started], timeout: 2)
        sheet.cancel()
        await fulfillment(of: [finished], timeout: 2)
        XCTAssertEqual(result.survived, true)
    }
}

private final class SaveSurvival: @unchecked Sendable {
    var job: Task<Void, Never>?
    var survived = false
}
