export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errors: Record<string, string[]> | null
  meta: Record<string, unknown> | null
}
