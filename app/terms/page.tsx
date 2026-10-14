import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service · Playlist Time Machine",
  description: "Terms of Service for Playlist Time Machine, operated by abeba co LLC.",
}

export default function TermsPage() {
  return (
    <main className="sheet legal px-1 py-16 sm:py-24">
      <p className="wordmark">
        <Link href="/">Playlist Time Machine</Link>
      </p>
      <h1>Terms of Service</h1>
      <p className="quiet">Last updated: October 14, 2026</p>
      <h2>Agreement to terms</h2>
      <p>
        By accessing or using Playlist Time Machine (&quot;Service&quot;), operated by abeba co LLC
        (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to these Terms of Service.
        If you do not agree, do not use the Service.
      </p>
      <h2>Description of the service</h2>
      <p>
        Playlist Time Machine is a free web application that builds a playlist of number one hits, the popular songs
        of the time, from the years around a high school graduation year (five years before through five years after).
        You can save that playlist to Apple Music, or download a list of the artist, song, and year.
      </p>
      <h2>Use of the service</h2>
      <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
      <ul>
        <li>Use the Service in any way that violates any applicable law or regulation.</li>
        <li>Attempt to interfere with or disrupt the Service or its servers.</li>
        <li>Attempt to gain unauthorized access to any part of the Service.</li>
        <li>Use any automated means to access the Service without our permission.</li>
        <li>Impersonate any person or entity.</li>
      </ul>
      <h2>Apple Music</h2>
      <p>If you save a playlist to Apple Music, you acknowledge that:</p>
      <ul>
        <li>Playing the full songs requires an Apple Music subscription. A 30-second preview does not.</li>
        <li>You authorize us to create a playlist in your Apple Music library on your behalf.</li>
        <li>Your use of Apple Music is also governed by Apple&apos;s terms.</li>
        <li>We are not affiliated with, endorsed by, or sponsored by Apple Inc.</li>
        <li>Song availability may vary by region and by Apple Music&apos;s licensing.</li>
      </ul>
      <h2>Intellectual property</h2>
      <p>
        The Service and its original content, features, and functionality are owned by abeba co LLC and are protected
        by copyright, trademark, and other intellectual property laws. Lists of number one hits are used for
        informational purposes. Song titles, artist names, and recordings belong to their respective owners.
      </p>
      <h2>Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER
        EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL
        COMPONENTS. WE DO NOT GUARANTEE THAT EVERY SONG WILL BE AVAILABLE ON APPLE MUSIC OR THAT A SAVED PLAYLIST WILL
        INCLUDE EVERY TRACK.
      </p>
      <h2>Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, ABEBA CO LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR
        RELATED TO YOUR USE OF THE SERVICE.
      </p>
      <h2>Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless abeba co LLC and its officers, directors, employees, and agents from
        claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising out of your use of the
        Service or your violation of these Terms.
      </p>
      <h2>Changes to these terms</h2>
      <p>
        We may modify these Terms at any time. The &quot;Last updated&quot; date will change when we do. Continued use
        of the Service after a change means you accept the new Terms.
      </p>
      <h2>Termination</h2>
      <p>
        We may suspend or end access to the Service, without prior notice, for any reason, including a breach of these
        Terms. When access ends, your right to use the Service ends with it.
      </p>
      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the United States, without regard to conflict of law provisions.
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
