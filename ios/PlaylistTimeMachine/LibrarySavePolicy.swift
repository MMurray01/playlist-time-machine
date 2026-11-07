import Foundation

enum LibraryWriteDecision: Equatable {
    case write
    case needsSubscription
    case libraryUnavailable
    case checkFailed
}

/// Decides whether a library playlist may be created.
///
/// `MusicSubscription.hasCloudLibraryEnabled` is the capability Apple documents
/// for modifying the iCloud music library. `canPlayCatalogContent` is playback
/// and is not an input. A failed subscription read is `.checkFailed`, which
/// must not continue into a write.
enum LibrarySavePolicy {
    static let checkingLabel = "Checking Apple Music…"
    static let savingLabel = "Saving to Apple Music…"

    static let needsSubscriptionMessage = "An Apple Music subscription is required to add these songs to your library. Nothing was saved."
    static let libraryUnavailableMessage = "Apple Music can’t add these songs to your library on this Apple ID. Nothing was saved."
    static let checkFailedMessage = "Apple Music could not be checked. Nothing was saved. Try again."
    static let savedToast = "Saved to Apple Music"
    static let partialSavedToast = "Saved part of the playlist to Apple Music."

    static func decide(hasCloudLibraryEnabled: Bool?, canBecomeSubscriber: Bool?) -> LibraryWriteDecision {
        if hasCloudLibraryEnabled == nil || canBecomeSubscriber == nil {
            return .checkFailed
        }
        if hasCloudLibraryEnabled == true {
            return .write
        }
        if canBecomeSubscriber == true {
            return .needsSubscription
        }
        return .libraryUnavailable
    }

    static func blockMessage(hasCloudLibraryEnabled: Bool?, canBecomeSubscriber: Bool?) -> String? {
        let decision = decide(hasCloudLibraryEnabled: hasCloudLibraryEnabled, canBecomeSubscriber: canBecomeSubscriber)
        if decision == .write {
            return nil
        }
        if decision == .needsSubscription {
            return needsSubscriptionMessage
        }
        if decision == .libraryUnavailable {
            return libraryUnavailableMessage
        }
        return checkFailedMessage
    }

    /// True only when createPlaylist returned a playlist. A later edit or add
    /// failure still keeps that playlist. Retry must not call create again.
    static func keepReturnedPlaylist(created: Bool, added _: Int, requested _: Int) -> Bool {
        if created == false {
            return false
        }
        return true
    }

    /// The playlist exists and does not yet hold every song we resolved.
    static func stoppedEarly(created: Bool, added: Int, requested: Int) -> Bool {
        if created == false {
            return false
        }
        if added < requested {
            return true
        }
        return false
    }

    static func savedNote(count: Int, requested: Int, missingCount: Int, incomplete: Bool) -> String {
        var text = "Saved " + String(count) + " of " + String(requested) + " songs to Apple Music."
        if missingCount > 0 {
            var noun = "songs were"
            if missingCount == 1 {
                noun = "song was"
            }
            text = text + " " + String(missingCount) + " " + noun + " not in Apple Music."
        }
        if incomplete == true {
            text = text + " The playlist is already in your library. Saving again creates another copy."
        }
        return text
    }

    static func successToast(incomplete: Bool) -> String {
        if incomplete == true {
            return partialSavedToast
        }
        return savedToast
    }
}
