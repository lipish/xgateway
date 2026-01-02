export interface ModelInfo {
  id: string
  name: string
  description?: string
  supports_tools?: boolean
  context_length?: number
  input_price?: number
  output_price?: number
}

export interface ProviderType {
  id: string
  label: string
  base_url: string
  default_model: string
  models: ModelInfo[]
  enabled: boolean
  sort_order: number
  docs_url?: string
}
