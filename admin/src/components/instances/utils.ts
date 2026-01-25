import type { Provider } from "./types"

export const parseProviderConfig = (provider: Provider) => {
  try {
    return JSON.parse(provider.config || "{}")
  } catch {
    return {}
  }
}

export const formatDate = (dateString: string) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export const getStatusBadgeVariant = (enabled: boolean): "default" | "secondary" => {
  return enabled ? "default" : "secondary"
}
