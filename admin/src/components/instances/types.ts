export interface Provider {
  id: number;
  name: string;
  provider_type: string;
  config: string;
  enabled: boolean;
  priority: number;
  endpoint?: string;
  secret_id?: string;
  secret_key?: string;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  supports_tools?: boolean;
  context_length?: number;
  input_price?: number;
  output_price?: number;
}

export interface ProviderTypeConfig {
  id: string;
  label: string;
  base_url: string;
  models: ModelInfo[];
  docs_url?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface TestResult {
  id: number;
  success: boolean;
  message: string;
}