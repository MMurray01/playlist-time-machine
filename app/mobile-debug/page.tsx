"use client"

import { MobileDebugPanel } from "@/components/mobile-debug-panel"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MobileDebugPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button onClick={() => router.push("/playlist-results")} variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Mobile Debug Panel</h1>
          <p className="text-gray-600 mt-2">Use this panel to debug Spotify authentication issues on mobile devices.</p>
        </div>

        <MobileDebugPanel />
      </div>
    </div>
  )
}
