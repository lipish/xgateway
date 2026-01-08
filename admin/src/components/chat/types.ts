export interface Provider {
  id: number
  name: string
  provider_type: string
  enabled: boolean
}

export interface ConversationItem {
  id: number
  title: string
  provider_id: number
  provider_name: string | null
  updated_at: string
  message_count: number
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatPanel {
  id: string
  providerId: number | null
  conversationId: number | null
  messages: ChatMessage[]
  loading: boolean
  input: string
  maximized?: boolean
}
