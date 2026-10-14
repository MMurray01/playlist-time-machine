import Link from "next/link"

export default function SharedPlaylistNotFound() {
  return (
    <main className="sheet px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <h1>This playlist link is not here.</h1>
      <p className="lede">The share link may be incomplete, or it may have been removed.</p>
      <p>
        <Link className="linkish" href="/">
          Build a class playlist
        </Link>
      </p>
    </main>
  )
}
