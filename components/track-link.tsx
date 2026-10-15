"use client"

import type { ReactNode } from "react"
import { trackEvent } from "@/lib/analytics"

export function TrackLink({
  href,
  className,
  children,
  event,
  params,
}: {
  href: string
  className?: string
  children: ReactNode
  event: string
  params?: Record<string, string | number>
}) {
  return (
    <a href={href} className={className} onClick={() => trackEvent(event, params)}>
      {children}
    </a>
  )
}
