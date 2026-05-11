export interface AuthUser {
  username: string
  displayName: string
  role: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
  display_name: string
}

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}
