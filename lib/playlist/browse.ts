export const RESULTS_VIEW_KEY = "ptm-results-view"

export type ResultsView = "flow" | "list"

export function readResultsView(storage: Pick<Storage, "getItem"> | null): ResultsView {
  try {
    return storage?.getItem(RESULTS_VIEW_KEY) === "list" ? "list" : "flow"
  } catch {
    return "flow"
  }
}

export function writeResultsView(storage: Pick<Storage, "setItem"> | null, view: ResultsView) {
  try {
    storage?.setItem(RESULTS_VIEW_KEY, view)
  } catch {
    // Private browsing can reject storage writes. The choice still applies for this visit.
  }
}
