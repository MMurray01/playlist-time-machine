import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "How it works · Playlist Time Machine",
  description: "Enter your high school graduation year and get every Billboard No. 1 from the years around it.",
}

export default function HowItWorksPage() {
  return (
    <main className="sheet legal px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <h1>How it works</h1>
      <p>Your musical time travel, in a few steps.</p>
      <p>
        Playlist Time Machine builds a playlist of Billboard Hot 100 No. 1s from the years around high school. Enter
        the year you graduated. You get every No. 1 from five years before that year through five years after, in the
        order they reached No. 1.
      </p>
      <ol>
        <li>
          <strong>Enter your graduation year.</strong> The field asks for the year you graduated high school.
        </li>
        <li>
          <strong>Read the playlist.</strong> Songs are grouped by year, and each year shows how many No. 1s it has.
        </li>
        <li>
          <strong>Save or download.</strong> Save to Apple Music in one tap. If you don&apos;t use Apple Music, download
          a text or CSV list of the artist, song, and year.
        </li>
        <li>
          <strong>Share.</strong> A share link opens the same playlist for someone else, with the same save and download
          actions.
        </li>
      </ol>
    </main>
  )
}
