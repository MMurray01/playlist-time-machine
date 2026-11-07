import Foundation

/// Identity for one Apple Music save against the playlist on screen.
/// -1 means no task reference is held. The MusicKit work is not cancelled.
enum AppleMusicSaveTrack {
    static let noTask = -1

    static func begin(taskTicket: Int, generation: Int) -> Int {
        if taskTicket != noTask {
            return taskTicket
        }
        return generation
    }

    static func release() -> Int {
        return noTask
    }

    static func isCurrent(taskTicket: Int, ticket: Int, generation: Int) -> Bool {
        if taskTicket == noTask {
            return false
        }
        if taskTicket != ticket {
            return false
        }
        if generation != ticket {
            return false
        }
        return true
    }

    static func nextTaskTicket(taskTicket: Int, ticket: Int, generation: Int) -> Int {
        if isCurrent(taskTicket: taskTicket, ticket: ticket, generation: generation) == false {
            return taskTicket
        }
        return noTask
    }

    static func clearsWorking(taskTicket: Int, ticket: Int, generation: Int) -> Bool {
        return isCurrent(taskTicket: taskTicket, ticket: ticket, generation: generation)
    }
}

/// Save chrome belongs to the document on screen. Replacing that document drops it.
/// Closing the save sheet does not.
enum PlaylistSaveChrome {
    static func kept(value: Bool, replacedDocument: Bool) -> Bool {
        if replacedDocument {
            return false
        }
        return value
    }

    static func clearsSaveChrome(replacedDocument: Bool) -> Bool {
        return replacedDocument
    }
}

/// Background share prefetch must not replace the Apple Music save error.
/// An explicit Share failure still does, for the document that requested it.
enum ShareErrorRouting {
    static func replacesPlaylistError(explicit: Bool, sameDocument: Bool) -> Bool {
        if explicit == false {
            return false
        }
        if sameDocument == false {
            return false
        }
        return true
    }
}
