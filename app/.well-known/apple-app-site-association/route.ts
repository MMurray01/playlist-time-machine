import { NextResponse } from "next/server"
import { appleAppSiteAssociation } from "@/lib/playlist/ios-api"

export const dynamic = "force-static"
export const revalidate = 3600

export function GET() {
  return new NextResponse(JSON.stringify(appleAppSiteAssociation()), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
