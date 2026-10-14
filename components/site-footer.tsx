import Link from "next/link"
import { getAffiliateToken } from "@/lib/server/env"

export function SiteFooter() {
  const affiliate = getAffiliateToken()
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
      {affiliate ? (
        <p className="affiliate-disclosure">
          Links to Apple Music on this site are affiliate links. Playlist Time Machine may earn a commission on
          qualifying subscriptions and purchases.
        </p>
      ) : null}
      <p className="attribution">
        Apple and Apple Music are trademarks of Apple Inc., registered in the U.S. and other countries.
      </p>
    </footer>
  )
}
