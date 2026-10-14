export interface MusicKitInstance {
  authorize: () => Promise<string>
  musicUserToken?: string
  isAuthorized?: boolean
  setQueue?: (options: { song: string }) => Promise<void>
  play?: () => Promise<void>
  pause?: () => Promise<void>
}

declare global {
  interface Window {
    MusicKit?: {
      configure: (config: {
        developerToken: string
        app: { name: string; build: string }
      }) => Promise<MusicKitInstance>
      getInstance: () => MusicKitInstance
    }
  }
}

export function loadMusicKit(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Apple Music only works in the browser."))
  }
  if (window.MusicKit) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Apple Music took too long to load.")), 15000)
    const ready = () => {
      if (!window.MusicKit) return
      window.clearTimeout(timeout)
      resolve()
    }
    window.addEventListener("musickitloaded", ready)
    const existing = document.querySelector<HTMLScriptElement>("script[data-musickit]")
    if (existing) {
      existing.addEventListener("load", ready)
      return
    }
    const script = document.createElement("script")
    script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js"
    script.async = true
    script.dataset.musickit = "true"
    script.onload = () => ready()
    script.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error("Apple Music could not be loaded."))
    }
    document.head.appendChild(script)
  })
}
