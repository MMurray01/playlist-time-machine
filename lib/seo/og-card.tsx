import { tokens } from "@/lib/playlist/tokens"

/** Text-only share card. Remote covers are skipped so every year image stays cheap to render. */
export function SeoCard({ kicker, title, detail }: { kicker: string; title: string; detail: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: tokens.ink,
        color: tokens.onInk,
        padding: "72px 76px",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, letterSpacing: "-0.02em", color: "#d4d4d8" }}>{kicker}</div>
      <div style={{ display: "flex", flexDirection: "column", width: 1040 }}>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 600,
            letterSpacing: "-0.045em",
            lineHeight: 1.05,
            width: 1040,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, lineHeight: 1.35, color: "#d4d4d8", width: 980 }}>
          {detail}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#a1a1aa" }}>playlisttimemachine.com</div>
    </div>
  )
}
