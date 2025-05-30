import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function CallbackLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md mx-auto px-4 w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting to Spotify
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">Please wait while we connect to your Spotify account...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
