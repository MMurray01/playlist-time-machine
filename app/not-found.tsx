import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found · Playlist Time Machine",
  description: "That page is not on Playlist Time Machine.",
}

export default function NotFound() {
  return (
    <main className="sheet px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <h1>That page is not here.</h1>
      <p className="lede">The address may be mistyped, or the page may have moved.</p>
      <p>
        <Link className="linkish" href="/">
          Build a class playlist
        </Link>
      </p>
    </main>
  )
}
