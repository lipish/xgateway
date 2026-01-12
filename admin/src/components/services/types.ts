export interface Service {
  id: string
  name: string
  enabled: boolean
  strategy: string
  fallback_chain?: string | null
  qps_limit: number
  concurrency_limit: number
  max_queue_size: number
  max_queue_wait_ms: number
  created_at: string
  updated_at: string
}

export interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
  priority?: number
}

export interface ApiKey {
  id: number
  name: string
  scope: string
  service_ids?: string[] | null
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
  { value: "Priority", label: "Priority" },
  { value: "RoundRobin", label: "RoundRobin" },
  { value: "LeastConnections", label: "LeastConnections" },
  { value: "LatencyBased", label: "LatencyBased" },
  { value: "LowestPrice", label: "LowestPrice" },
  { value: "QuotaAware", label: "QuotaAware" },
  { value: "Random", label: "Random" },
]
