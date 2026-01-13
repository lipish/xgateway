export interface ApiKey {
  id: number
  name: string
  key_hash: string
  scope: string
  provider_id: number | null
  provider_ids: number[] | null
  service_ids?: string[] | null
  qps_limit: number
  concurrency_limit: number
  status: string
  expires_at: string | null
  created_at: string
}

export interface Service {
  id: string
  name: string
  enabled: boolean
}

export interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
}
