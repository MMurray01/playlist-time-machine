import type { Metadata } from "next"
import type { CSSProperties } from "react"
import { Inter } from "next/font/google"
import { tokens } from "@/lib/playlist/tokens"
import "./globals.css"

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const theme = {
  "--ptm-paper": tokens.paper,
  "--ptm-surface": tokens.surface,
  "--ptm-ink": tokens.ink,
  "--ptm-ink-soft": tokens.inkSoft,
  "--ptm-line": tokens.line,
  "--ptm-accent": tokens.accent,
  "--ptm-on-accent": tokens.onAccent,
  "--ptm-on-ink": tokens.onInk,
  "--ptm-danger": tokens.dangerInk,
  "--ptm-danger-wash": tokens.dangerWash,
  "--ptm-cover": tokens.cover,
  "--ptm-cover-ink": tokens.coverInk,
} as CSSProperties

export const metadata: Metadata = {
  title: "Playlist Time Machine",
  description: "Every Billboard Hot 100 No. 1 from the years around your high school graduation.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={sans.variable} style={theme}>
      <body className={sans.className}>{children}</body>
    </html>
  )
}
