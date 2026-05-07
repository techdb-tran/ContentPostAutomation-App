import apiClient from "./client"
import type { ApiResponse } from "@/types/api.types"
import type { LoginPayload, LoginResponse } from "@/types/auth.types"

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<
    ApiResponse<{
      user: { username: string; display_name: string; role: string }
      tokens: { access_token: string; refresh_token: string; token_type: string }
    }>
  >("/auth/login", payload)

  return {
    user: {
      username: data.data.user.username,
      displayName: data.data.user.display_name,
      role: data.data.user.role,
    },
    tokens: {
      accessToken: data.data.tokens.access_token,
      refreshToken: data.data.tokens.refresh_token,
      tokenType: data.data.tokens.token_type,
    },
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ access_token: string }>>("/auth/refresh", null, {
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  })

  return data.data.access_token
}
