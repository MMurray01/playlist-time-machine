/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js-cdn.music.apple.com https://va.vercel-scripts.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.mzstatic.com https://*.apple.com https://toolbox.marketingtools.apple.com https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' blob: https://*.mzstatic.com https://audio-ssl.itunes.apple.com",
  "connect-src 'self' https://api.music.apple.com https://itunes.apple.com https://*.supabase.co https://js-cdn.music.apple.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
  "frame-src https://authorize.music.apple.com https://idmsa.apple.com",
  "font-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ")

const nextConfig = {
  poweredByHeader: false,
  // Bots listed here get metadata in the initial <head> instead of a streamed tag.
  // A string is what this Next.js version applies at runtime. ".*" covers every visitor,
  // including Lighthouse, so the share page title, description, and image are in <head>.
  htmlLimitedBots: ".*",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default nextConfig
