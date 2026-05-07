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

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}
