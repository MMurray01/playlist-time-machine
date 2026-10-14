import Link from "next/link"
import { siteMetadata } from "@/lib/site/metadata"

export const metadata = siteMetadata({
  title: "Page not found · Playlist Time Machine",
  description: "That page is not on Playlist Time Machine.",
  path: "/",
})

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
