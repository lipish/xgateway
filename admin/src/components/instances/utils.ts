import type { Provider } from "./types"

export const parseProviderConfig = (provider: Provider) => {
  try {
    return JSON.parse(provider.config || "{}")
  } catch {
    return {}
  }
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

export const getStatusBadgeVariant = (enabled: boolean): "default" | "secondary" => {
  return enabled ? "default" : "secondary"
}
