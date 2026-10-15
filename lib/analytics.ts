type EventParams = Record<string, string | number | boolean>

type Gtag = (command: "event", name: string, params?: EventParams) => void

/** Sends a GA4 event when the measurement id is configured. No-ops otherwise. */
export function trackEvent(name: string, params?: EventParams) {
  if (typeof window === "undefined") return
  const gtag = (window as Window & { gtag?: Gtag }).gtag
  if (typeof gtag !== "function") return
  gtag("event", name, params)
}
