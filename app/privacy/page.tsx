import Link from "next/link"
import { siteMetadata } from "@/lib/site/metadata"

export const metadata = siteMetadata({
  title: "Privacy Policy · Playlist Time Machine",
  description: "Privacy Policy for Playlist Time Machine, operated by abeba co LLC.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <main className="sheet legal px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <h1>Privacy Policy</h1>
      <p className="quiet">Last updated: October 16, 2026</p>
      <h2>Introduction</h2>
      <p>
        Playlist Time Machine (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is operated by abeba co LLC. This
        Privacy Policy explains how we collect, use, and protect your information when you use the website at
        playlisttimemachine.com or the Playlist Time Machine app for iPhone and iPad.
      </p>
      <h2>Information we collect</h2>
      <p>We collect the minimum we need to build a playlist of number one hits:</p>
      <ul>
        <li>
          <strong>Graduation year.</strong> The year you enter chooses the number one hits. On the website, it stays
          in this browser so you can revisit the playlist. In the iOS app, it stays on your device so the year is
          still there the next time you open the app. If you create a share link, we store that year on our server so
          the link can be opened later. A request that only builds the playlist is not saved as a share.
        </li>
        <li>
          <strong>Playlist name.</strong> When you create a share link, we store the title you enter. If you leave the
          name empty, we store &quot;Class of&quot; plus the graduation year. In the iOS app, the last results view
          (cover collage or list) stays on the device and is not sent to us.
        </li>
        <li>
          <strong>Photos.</strong> If you tap Save to Photos in the iOS app, the collage is added to your photo
          library on the device. We do not receive that photo.
        </li>
        <li>
          <strong>Apple Music on the website.</strong> When you save a playlist, MusicKit asks you to approve access.
          The user token is sent with that save request and is not stored.
        </li>
        <li>
          <strong>Apple Music in the iOS app.</strong> The app uses MusicKit to save a playlist, to check whether you
          subscribe, and to start playback when you tap Listen on Apple Music and this device is already allowed to
          play Apple Music. The iOS app does not send an Apple ID, a Music user token, or listening history to our
          server. A 30 second preview uses a public catalog preview URL and does not require a subscription or a
          sign-in.
        </li>
      </ul>
      <h2>What a share link stores</h2>
      <p>
        Creating a share link stores an id, the graduation year, the playlist title, the genre list (the iOS app sends
        an empty list), and the time the link was created. The record is not linked to your name, email, Apple ID, or
        any other identity. There is no account.
      </p>
      <h2>Information we do not collect</h2>
      <ul>
        <li>We do not collect your name, email address, or personal contact information.</li>
        <li>We do not store your Apple Music username, password, or listening history.</li>
        <li>We do not track your location.</li>
        <li>We do not use advertising identifiers, and we do not track you across apps or websites.</li>
        <li>We do not use cookies for advertising or tracking.</li>
        <li>We do not sell or share user data with third parties.</li>
      </ul>
      <h2>How we use Apple Music</h2>
      <p>When you save a playlist, we use Apple Music only to:</p>
      <ul>
        <li>Search for songs that match the number one hits from your graduation window.</li>
        <li>Create a playlist in your Apple Music library with your permission.</li>
        <li>Add the matched songs to that playlist.</li>
      </ul>
      <p>
        On the website, that save uses MusicKit JS. In the iOS app, it uses MusicKit. A 30 second preview uses a
        public catalog preview URL and does not require a sign-in. Full playback in Apple Music is offered only when
        Apple Music can play the song. A cover collage loads album artwork from Apple so you can save or share a
        picture. We do not store those image files, and we do not sell prints.
      </p>
      <h2>Data security</h2>
      <p>
        We use HTTPS for data in transit. The graduation year and view choice kept by the iOS app stay in the app&apos;s
        storage on the device. Because we do not store Apple Music credentials or a personal profile, there is little
        personal information to expose.
      </p>
      <h2>Third-party services</h2>
      <p>
        Apple Music is a separate service. When you use it, Apple&apos;s privacy policy also applies:{" "}
        <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer">
          apple.com/legal/privacy
        </a>
        . The website uses Vercel Web Analytics to count page views. It does not receive your name, email, or
        graduation year, and it is not used for advertising. The iOS app does not use that analytics service.
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
