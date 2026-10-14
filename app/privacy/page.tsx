import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy · Playlist Time Machine",
  description: "Privacy Policy for Playlist Time Machine, operated by abeba co LLC.",
}

export default function PrivacyPage() {
  return (
    <main className="sheet legal px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <h1>Privacy Policy</h1>
      <p className="quiet">Last updated: October 14, 2026</p>
      <h2>Introduction</h2>
      <p>
        Playlist Time Machine (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is operated by abeba co LLC. This
        Privacy Policy explains how we collect, use, and protect your information when you use our web application at
        playlisttimemachine.com.
      </p>
      <h2>Information we collect</h2>
      <p>We collect the minimum we need to build a playlist:</p>
      <ul>
        <li>
          <strong>Graduation year.</strong> The year you enter is used to choose the No. 1s. It stays in this browser
          so you can revisit the playlist. If you create a share link, we store that year and the playlist title so
          the link can be opened later.
        </li>
        <li>
          <strong>Apple Music authorization.</strong> When you save a playlist, MusicKit asks you to approve access.
          The user token is sent with that save request and is not stored.
        </li>
      </ul>
      <h2>Information we do not collect</h2>
      <ul>
        <li>We do not collect your name, email address, or personal contact information.</li>
        <li>We do not store your Apple Music username, password, or listening history.</li>
        <li>We do not track your location.</li>
        <li>We do not use cookies for advertising or tracking.</li>
        <li>We do not sell or share user data with third parties.</li>
      </ul>
      <h2>How we use Apple Music</h2>
      <p>When you save a playlist, we use the Apple Music API and MusicKit JS only to:</p>
      <ul>
        <li>Search for songs that match the number one hits from your graduation window.</li>
        <li>Create a playlist in your Apple Music library with your permission.</li>
        <li>Add the matched songs to that playlist.</li>
      </ul>
      <p>
        A 30-second preview uses a public catalog preview URL and does not require a sign-in. Full playback is offered
        only after you have authorized MusicKit.
      </p>
      <h2>Data security</h2>
      <p>
        We use HTTPS for data in transit. Because we do not store Apple Music credentials or a personal profile, there
        is little personal information to expose.
      </p>
      <h2>Third-party services</h2>
      <p>
        Apple Music is a separate service. When you use it, Apple&apos;s privacy policy also applies:{" "}
        <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer">
          apple.com/legal/privacy
        </a>
        . We use Vercel Web Analytics to count page views. It does not receive your name, email, or graduation year,
        and it is not used for advertising.
      </p>
      <h2>Children&apos;s privacy</h2>
      <p>
        Our service is not directed to children under 13. We do not knowingly collect information from children under
        13. If you believe we have inadvertently collected such information, contact us and we will delete it.
      </p>
      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of this page
        will change when we do.
      </p>
      <h2>Contact us</h2>
      <p>
        abeba co LLC
        <br />
        <a href="mailto:legal@abeba.co">legal@abeba.co</a>
      </p>
    </main>
  )
}
