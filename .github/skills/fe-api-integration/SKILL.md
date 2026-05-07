---
name: fe-api-integration
description: >
  Chuẩn gọi API trong React với Axios + TanStack Query. Bắt buộc đọc khi
  tạo API function mới, viết useQuery/useMutation, xử lý JWT auto-refresh,
  handle error từ API, setup Axios interceptors, hoặc bất cứ thao tác nào
  liên quan đến gọi backend. Stack: Axios + TanStack Query + JWT 15min access
  / 7 days refresh.
---

# API Integration Skill

## Axios Client (`src/api/client.ts`)

```ts
import axios from "axios"
import { useAuthStore } from "@/store/auth.store"

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1",
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
})

// ── REQUEST INTERCEPTOR — attach token ────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── RESPONSE INTERCEPTOR — auto refresh khi 401 ───────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)))
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Chỉ xử lý 401 và chưa retry
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Nếu đang refresh → queue request lại
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (!refreshToken) throw new Error("No refresh token")

      // Gọi thẳng axios để tránh interceptor loop
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })

      const newAccessToken = res.data.data.access_token
      setTokens({ accessToken: newAccessToken })
      processQueue(null, newAccessToken)
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      useAuthStore.getState().logout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default apiClient
```

---

## API Response Type (`src/types/api.types.ts`)

```ts
// Map đúng với format BE đã định nghĩa trong api-response skill
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errors: Record<string, string[]> | null
  meta: PaginationMeta | null
}

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface PaginatedData<T> {
  data: T[]
  meta: PaginationMeta
}
```

---

## API Functions (`src/api/user.api.ts`)

```ts
import apiClient from "./client"
import type { ApiResponse, PaginatedData } from "@/types/api.types"
import type { User, CreateUserDto, UpdateUserDto, UserFilter } from "@/types/user.types"

// GET list với pagination
export const getUsers = async (filter: UserFilter): Promise<PaginatedData<User>> => {
  const { data } = await apiClient.get<ApiResponse<User[]>>("/users", { params: filter })
  return { data: data.data, meta: data.meta! }
}

// GET single
export const getUserById = async (id: number): Promise<User> => {
  const { data } = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
  return data.data
}

// POST
export const createUser = async (payload: CreateUserDto): Promise<User> => {
  const { data } = await apiClient.post<ApiResponse<User>>("/users", payload)
  return data.data
}

// PUT
export const updateUser = async (id: number, payload: UpdateUserDto): Promise<User> => {
  const { data } = await apiClient.put<ApiResponse<User>>(`/users/${id}`, payload)
  return data.data
}

// DELETE
export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`/users/${id}`)
}
```

---

## TanStack Query Hooks

### useQuery — đọc data

```ts
// src/pages/Users/hooks/useUsers.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { getUsers } from "@/api/user.api"
import type { UserFilter } from "@/types/user.types"

// Query key conventions:
// ["resource"]                → toàn bộ list
// ["resource", id]            → single item
// ["resource", "list", filter] → filtered list

export const userKeys = {
  all:    ()       => ["users"] as const,
  lists:  ()       => ["users", "list"] as const,
  list:   (f: UserFilter) => ["users", "list", f] as const,
  detail: (id: number)    => ["users", id] as const,
}

export function useUsers(filter: UserFilter) {
  return useQuery({
    queryKey: userKeys.list(filter),
    queryFn:  () => getUsers(filter),
    staleTime: 1000 * 60 * 5,   // 5 phút — không refetch nếu data còn fresh
    placeholderData: keepPreviousData, // Giữ data cũ khi đổi filter/page
  })
}

export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn:  () => getUserById(id),
    enabled:  !!id,    // Không fetch nếu id undefined/null
    staleTime: 1000 * 60 * 10,
  })
}
```

### useMutation — thay đổi data

```ts
// src/pages/Users/hooks/useUserMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createUser, updateUser, deleteUser } from "@/api/user.api"
import { userKeys } from "./useUsers"
import { toast } from "sonner" // hoặc toast library bạn dùng

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Invalidate list → tự refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success("Tạo người dùng thành công")
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error))
    },
  })
}

export function useUpdateUser(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateUserDto) => updateUser(id, payload),
    onSuccess: (updatedUser) => {
      // Update cache trực tiếp — không cần refetch
      queryClient.setQueryData(userKeys.detail(id), updatedUser)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      toast.success("Cập nhật thành công")
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error))
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.removeQueries({ queryKey: userKeys.detail(deletedId) })
      toast.success("Xóa thành công")
    },
  })
}
```

---

## Error Handling tập trung

```ts
// src/utils/error.ts
import type { AxiosError } from "axios"
import type { ApiResponse } from "@/types/api.types"

export function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiResponse<null>>

  // Lỗi từ BE (có response)
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message
  }

  // Lỗi mạng / timeout
  if (axiosError.code === "ECONNABORTED") return "Request timeout"
  if (!axiosError.response) return "Không thể kết nối đến server"

  // HTTP status fallback
  const status = axiosError.response.status
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này"
  if (status === 404) return "Không tìm thấy dữ liệu"
  if (status >= 500) return "Lỗi server, vui lòng thử lại sau"

  return "Có lỗi xảy ra"
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const axiosError = error as AxiosError<ApiResponse<null>>
  const errors = axiosError.response?.data?.errors
  if (!errors) return {}
  // Lấy message đầu tiên của mỗi field
  return Object.fromEntries(
    Object.entries(errors).map(([field, msgs]) => [field, msgs[0]])
  )
}
```

---

## TanStack Query Provider Setup

```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,                    // Retry 1 lần khi fail
      staleTime: 1000 * 60 * 5,   // Default 5 phút
      refetchOnWindowFocus: false, // Không refetch khi focus lại tab
    },
    mutations: {
      retry: 0,  // Không retry mutation
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
```

---

## Quy tắc bắt buộc

1. **Không dùng** `useEffect` + `useState` để fetch data — luôn dùng `useQuery`
2. **Query keys** dùng factory pattern (`userKeys.list(filter)`) — không hardcode string
3. **Sau mutation** luôn `invalidateQueries` hoặc `setQueryData` — không để cache stale
4. **Không** gọi `apiClient` trực tiếp trong component — luôn qua API function trong `api/*.api.ts`
5. `enabled: !!id` khi query phụ thuộc vào param có thể undefined
6. `keepPreviousData` cho paginated list — tránh layout shift khi chuyển trang
7. **Error message** luôn qua `extractErrorMessage()` — không hiển thị raw error