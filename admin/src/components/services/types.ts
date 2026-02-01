export interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
  priority?: number
}

export interface ApiKey {
  id: number
  key_hash?: string
  name: string
  scope: string
  provider_ids?: number[] | null
  strategy?: string
  fallback_chain?: string | null
  qps_limit: number
  concurrency_limit: number
  status: string
  expires_at: string | null
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message: string
}

export const STRATEGY_OPTIONS = [
  { value: "Priority", labelKey: "services.strategyOptions.priority", descriptionKey: "services.strategyDescriptions.priority" },
  { value: "RoundRobin", labelKey: "services.strategyOptions.roundRobin", descriptionKey: "services.strategyDescriptions.roundRobin" },
  { value: "LeastConnections", labelKey: "services.strategyOptions.leastConnections", descriptionKey: "services.strategyDescriptions.leastConnections" },
  { value: "LatencyBased", labelKey: "services.strategyOptions.latencyBased", descriptionKey: "services.strategyDescriptions.latencyBased" },
  { value: "LowestPrice", labelKey: "services.strategyOptions.lowestPrice", descriptionKey: "services.strategyDescriptions.lowestPrice" },
  { value: "QuotaAware", labelKey: "services.strategyOptions.quotaAware", descriptionKey: "services.strategyDescriptions.quotaAware" },
  { value: "Random", labelKey: "services.strategyOptions.random", descriptionKey: "services.strategyDescriptions.random" },
]
