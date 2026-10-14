export default function Loading() {
  return (
    <main className="sheet sheet-screen px-1 py-16 sm:py-24">
      <p className="wordmark">Playlist Time Machine</p>
      <p role="status" className="lede">
        Loading.
      </p>
      <div className="pending" aria-hidden="true">
        <span />
      </div>
    </main>
  )
}
