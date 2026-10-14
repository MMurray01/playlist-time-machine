import Link from "next/link"

export default function SharedPlaylistNotFound() {
  return (
    <main className="sheet px-1 py-16 sm:py-24">
      <p className="wordmark">Playlist Time Machine</p>
      <h1>This playlist link is not in the library.</h1>
      <p className="lede">
        <Link href="/" className="linkish">
          Build a new one
        </Link>
      </p>
    </main>
  )
}
