import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="About this site">
        <Link href="/how-it-works">How it works</Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">Terms</Link>
        <span aria-hidden="true">·</span>
        <span>a product of abeba co</span>
      </nav>
      <p className="attribution">
        Billboard and Billboard Hot 100 are trademarks of Billboard Media, LLC. The dates and weeks on this site are
        drawn from public lists of Hot 100 number ones. Playlist Time Machine is not affiliated with, endorsed by, or
        sponsored by Billboard.
      </p>
    </footer>
  )
}
