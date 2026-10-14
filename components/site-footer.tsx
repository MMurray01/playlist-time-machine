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
    </footer>
  )
}
