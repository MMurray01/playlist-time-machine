# Playlist Time Machine for iOS

SwiftUI and MusicKit app for iOS 16 and later. It reads playlists from `GET /api/playlist` and creates share links with `POST /api/share`, so the Apple Music server key stays on the website.

The Xcode project is generated from `project.yml`. Signing uses team `WS2R3SYV4W`.

## Open it

Install [XcodeGen](https://github.com/yonaskolb/XcodeGen), then from this directory:

```bash
brew install xcodegen
xcodegen generate
open PlaylistTimeMachine.xcodeproj
```

In Xcode, the signing team is `WS2R3SYV4W`. The bundle id is `com.abeba.playlisttimemachine`. The display name is Playlist Time Machine.

`PTMAPIBaseURL` in `Info.plist` points at `https://www.playlisttimemachine.com`. Change it only to call a preview deployment.

## What the app does

Enter a graduation year. The app shows that eleven-year window of number one hits, year notes, Cover Flow, and a list. Tap a song for the cover and playback. A subscriber hears the full song through MusicKit. Everyone else gets the 30-second preview, the iTunes attribution, and a link to the song in Apple Music. Nothing plays until you tap.

The square cover collage is the playlist artwork. It is labeled with the playlist and, once the share link exists, the `/p/<id>` URL. Share sends the story image and that link together. Save creates the Apple Music playlist with the same title and description rules as the website.

Opening a `https://www.playlisttimemachine.com/p/<id>` link shows that playlist and asks for your own graduation year.

## TestFlight

`.github/workflows/testflight.yml` runs on a push to `cursor/ios-app-v1-d049` and from Actions → Run workflow. It archives with automatic signing and uploads to App Store Connect. The build number is the GitHub Actions run number. `ITSAppUsesNonExemptEncryption` is false.

The workflow reads three repository secrets: `ASC_ISSUER_ID`, `ASC_KEY_ID`, and `ASC_PRIVATE_KEY`. `ASC_ISSUER_ID` is the Issuer ID UUID at the top of App Store Connect → Users and Access → Integrations → Team Keys, not the Team ID. `ASC_KEY_ID` is that key's Key ID. `ASC_PRIVATE_KEY` is the contents of its `.p8` file. The key needs the Admin role so Xcode can cloud-sign the App Store build. The signed IPA is uploaded with the App Store Connect build upload API. If any secret is missing, the job says so and does not upload.
