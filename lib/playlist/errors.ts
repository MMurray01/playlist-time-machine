export function isMissingColumnError(
  error: { message?: string; code?: string } | null | undefined,
  column: string,
): boolean {
  if (!error) return false
  const message = (error.message ?? "").toLowerCase()
  const columnName = column.toLowerCase()
  if (!message.includes(columnName)) return false
  return (
    message.includes("column") ||
    message.includes("schema") ||
    error.code === "42703" ||
    error.code === "PGRST204"
  )
}

/** PostgREST has not loaded this function yet, so the migration is not applied. */
export function isMissingRpcFunction(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false
  if (error.code === "PGRST202") return true
  const message = (error.message ?? "").toLowerCase()
  return message.includes("could not find the function")
}
