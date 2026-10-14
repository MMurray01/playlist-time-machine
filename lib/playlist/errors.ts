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
