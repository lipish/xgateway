export interface Provider {
  id: number
  name: string
}

export interface UserInstance {
  id: number
  user_id: number
  provider_id: number
  granted_at: string
}

export interface User {
  id: number
  username: string
  role_id: string
  status: string
  created_at: string
}
