---
name: fe-typescript-patterns
description: >
  Quy tắc TypeScript cho dự án React + Flask API. Bắt buộc đọc khi định
  nghĩa types/interfaces mới, type API response, type component props, dùng
  generics, hoặc gặp type error không rõ. Dùng khi phân vân "dùng type hay
  interface", "đặt type ở đâu", "tránh any thế nào". Stack: TypeScript strict
  mode + React 18.
---

# TypeScript Patterns Skill

## Nguyên tắc cốt lõi

- `interface` cho object shapes có thể extend — props, models, API types
- `type` cho unions, intersections, computed types, primitives
- **Không dùng `any`** — dùng `unknown` nếu thực sự không biết type
- **Không assert `as Type`** trừ khi không còn cách nào khác
- Types sống gần nơi dùng — chỉ move lên `src/types/` khi dùng ở 2+ nơi

---

## Tổ chức Types

```
src/types/
├── api.types.ts      # ApiResponse<T>, PaginationMeta — dùng toàn app
├── auth.types.ts     # User, AuthTokens
└── index.ts          # Re-export tất cả

src/pages/Users/
└── users.types.ts    # UserFilter, UserTableRow — chỉ dùng trong page này
```

---

## API Types

```ts
// src/types/api.types.ts

// Wrapper chuẩn cho mọi response từ BE
export interface ApiResponse<T> {
  success: boolean
  message: string
  data:    T
  errors:  Record<string, string[]> | null
  meta:    PaginationMeta | null
}

export interface PaginationMeta {
  total:       number
  page:        number
  per_page:    number
  total_pages: number
  has_next:    boolean
  has_prev:    boolean
}

// Helper type — data kèm meta pagination
export interface PaginatedData<T> {
  data: T[]
  meta: PaginationMeta
}

// Filter params cơ bản — extend cho từng feature
export interface BaseFilter {
  page?:     number
  per_page?: number
  search?:   string
}
```

---

## Domain Types

```ts
// src/types/auth.types.ts
export interface User {
  id:         number
  name:       string
  email:      string
  role:       UserRole
  is_active:  boolean
  created_at: string
}

export type UserRole = "user" | "admin" | "manager"

export interface AuthTokens {
  access_token:  string
  refresh_token: string
  token_type:    "Bearer"
}

// src/pages/Users/users.types.ts
import type { BaseFilter } from "@/types/api.types"

export interface UserFilter extends BaseFilter {
  role?:      UserRole
  is_active?: boolean
}

// DTO — data gửi lên API (khác với domain model)
export interface CreateUserDto {
  name:     string
  email:    string
  password: string
  role?:    UserRole
}

export interface UpdateUserDto {
  name?:  string
  email?: string
  role?:  UserRole
}
```

---

## Component Props Patterns

```tsx
// Interface cho props — luôn dùng interface, không dùng type cho props
interface ButtonProps {
  variant?:   "primary" | "secondary" | "danger"
  size?:      "sm" | "md" | "lg"
  isLoading?: boolean
  disabled?:  boolean
  onClick?:   () => void
  children:   React.ReactNode
}

// Extend HTML element props — cho primitive components
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  hint?:     string
}

// Generic component props
interface TableProps<T> {
  data:      T[]
  columns:   Column<T>[]
  onRowClick?: (row: T) => void
  isLoading?: boolean
}

// Children variants
interface LayoutProps {
  children:    React.ReactNode   // Bất kỳ React node
  header?:     React.ReactElement // Phải là React element
  title?:      string
}
```

---

## Utility Types hay dùng

```ts
// Partial — tất cả fields optional (dùng cho Update DTOs)
type UpdateUserDto = Partial<User>

// Pick — chọn 1 số fields
type UserPreview = Pick<User, "id" | "name" | "email">

// Omit — bỏ 1 số fields
type UserWithoutPassword = Omit<User, "password">
type CreateUserDto = Omit<User, "id" | "created_at" | "updated_at">

// Required — tất cả fields required
type RequiredUser = Required<User>

// Record — map type
type RoleLabel = Record<UserRole, string>
const ROLE_LABELS: RoleLabel = {
  user:    "Người dùng",
  admin:   "Quản trị viên",
  manager: "Quản lý",
}

// Extract / Exclude từ union
type ActiveRole = Exclude<UserRole, "guest">      // "user" | "admin" | "manager"
type OnlyAdmin  = Extract<UserRole, "admin">      // "admin"

// ReturnType / Parameters — lấy type từ function
type QueryFn     = typeof getUsers
type GetUsersReturn = ReturnType<typeof getUsers>  // Promise<PaginatedData<User>>

// NonNullable — loại bỏ null/undefined
type UserId = NonNullable<User["id"]>
```

---

## Tránh `any` — Dùng `unknown` Đúng Cách

```ts
// ❌ Sai
function handleError(error: any) {
  console.log(error.message) // Có thể crash runtime
}

// ✅ Đúng — narrow type trước khi dùng
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message)  // TypeScript biết đây là Error
  }
  if (typeof error === "string") {
    console.log(error)
  }
}

// ✅ Đúng — type guard
function isApiError(error: unknown): error is AxiosError<ApiResponse<null>> {
  return axios.isAxiosError(error)
}

if (isApiError(error)) {
  const message = error.response?.data?.message  // Fully typed
}
```

---

## Generics Patterns hay dùng

```ts
// Generic API hook
function useApiQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>
) {
  return useQuery({ queryKey, queryFn })
}

// Generic response handler
function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.message)
  return response.data
}

// Generic store slice
interface CrudState<T> {
  items:     T[]
  selected:  T | null
  setItems:  (items: T[]) => void
  setSelected: (item: T | null) => void
}
```

---

## Enums vs Union Types

```ts
// ❌ Tránh dùng enum — gây issues với tree-shaking và serialization
enum Status { Active = "active", Inactive = "inactive" }

// ✅ Dùng union type + const object
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled"

export const ORDER_STATUS = {
  PENDING:    "pending",
  PROCESSING: "processing",
  COMPLETED:  "completed",
  CANCELLED:  "cancelled",
} as const

// Lấy type từ const object
type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]
```

---

## tsconfig.json chuẩn

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

---

## Quy tắc bắt buộc

1. **`strict: true`** — không tắt bất kỳ strict flag nào
2. **`interface`** cho object shapes, **`type`** cho unions và computed types
3. **Không dùng `any`** — dùng `unknown` + type guard khi cần
4. **Infer type từ Zod** bằng `z.infer<>` — không định nghĩa duplicate type
5. **DTO ≠ Domain model** — `CreateUserDto` khác `User`, define riêng
6. **Import type** khi chỉ dùng cho type checking: `import type { User } from "@/types"`
7. `as const` cho object/array literal cần type literal (không widening)