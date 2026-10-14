import Link from "next/link"
import { tokens } from "@/lib/playlist/tokens"

export default function SharedPlaylistNotFound() {
  return (
    <main className="sheet px-4 py-16">
      <h1 className="display text-4xl" style={{ color: tokens.ink }}>
        This playlist link is not in the library.
      </h1>
      <p className="mt-4 text-lg" style={{ color: tokens.inkSoft }}>
        <Link href="/" className="font-semibold underline" style={{ color: tokens.ink }}>
          Build a new one
        </Link>
      </p>
    </main>
  )
}
