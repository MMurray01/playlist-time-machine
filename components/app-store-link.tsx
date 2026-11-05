import { APP_STORE_URL } from "@/lib/site/app-store"

const BADGE_SRC = "/badges/download-on-the-app-store.svg"

/** Official Download on the App Store badge. The artwork file is unmodified. */
export function AppStoreBadge() {
  return (
    <a className="app-store-badge" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BADGE_SRC} alt="Download on the App Store" width={120} height={40} />
    </a>
  )
}

export function GetTheAppLink({ className }: { className?: string }) {
  return (
    <a className={className} href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
      Get the app
    </a>
  )
}
