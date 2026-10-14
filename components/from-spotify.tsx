import Link from "next/link"

const SUBSCRIBE_URL = "https://music.apple.com/us/subscribe"
const TRANSFER_URL = "https://support.apple.com/en-us/118249"

export function FromSpotify({ compact = false }: { compact?: boolean }) {
  return (
    <section className="switch" aria-labelledby="from-spotify-title">
      {compact ? (
        <h2 id="from-spotify-title">Coming from Spotify?</h2>
      ) : (
        <h1 id="from-spotify-title">Coming from Spotify?</h1>
      )}
      {compact ? (
        <p>
          This playlist saves to Apple Music in one tap. New subscribers can start a trial on Apple’s subscribe page.
          One trial is available per person or family. Apple Music can also add songs and playlists you saved in another
          service.
        </p>
      ) : (
        <>
          <p>
            Playlists from this site save to Apple Music in one tap. New subscribers can start a trial on Apple’s
            subscribe page. One trial is available per person or family, and the offer depends on your country.
          </p>
          <p>
            If you already saved songs or playlists in another service, Apple Music can add them to your library.
            Apple’s guide explains what can transfer, including playlists you created, and what to do when a song needs
            another version. Nothing is removed from the other service.
          </p>
        </>
      )}
      <div className="switch-links">
        <a className="linkish" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
          Try Apple Music or subscribe
        </a>
        <a className="linkish" href={TRANSFER_URL} target="_blank" rel="noopener noreferrer">
          How Apple Music transfers music
        </a>
        {compact ? (
          <Link className="linkish" href="/from-spotify">
            Read how to switch
          </Link>
        ) : (
          <Link className="linkish" href="/">
            Build a class playlist
          </Link>
        )}
      </div>
    </section>
  )
}
