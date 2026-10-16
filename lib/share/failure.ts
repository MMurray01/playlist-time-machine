const SHARE_FAILURE = "ShareError"

export function shareFailure(message: string): Error {
  const error = new Error(message)
  error.name = SHARE_FAILURE
  return error
}

export function isShareFailure(error: unknown): error is Error {
  return error instanceof Error && error.name === SHARE_FAILURE && error.message.trim().length > 0
}

export function shareFailureNote(error: unknown, fallback: string): string {
  return isShareFailure(error) ? error.message : fallback
}
