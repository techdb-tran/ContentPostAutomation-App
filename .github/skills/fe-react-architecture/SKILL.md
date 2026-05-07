---
name: fe-react-architecture
description: >
  Chuẩn kiến trúc React 18 + TypeScript + Vite cho dự án. Bắt buộc đọc
  trước khi tạo component mới, page mới, tổ chức lại file/folder, đặt tên
  file hoặc hỏi về cách phân chia logic. Dùng khi phân vân "đặt file này
  ở đâu", "tách component thế nào", "logic này để ở đâu".
---

# React Architecture Skill

## Cấu trúc thư mục chuẩn

```
frontend/src/
├── api/                    # Axios instance + API call functions
│   ├── client.ts           # Axios instance, interceptors
│   └── <feature>.api.ts    # API functions theo feature
│
├── components/             # Reusable UI components
│   ├── ui/                 # Primitive components (Button, Input, Modal...)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.types.ts
│   │   │   └── index.ts
│   └── <feature>/          # Feature-specific shared components
│       └── UserAvatar/
│
├── pages/                  # Route-level components (1 page = 1 folder)
│   └── Users/
│       ├── UsersPage.tsx           # Page container
│       ├── components/             # Components chỉ dùng trong page này
│       │   ├── UserTable.tsx
│       │   └── UserFilter.tsx
│       ├── hooks/                  # Hooks chỉ dùng trong page này
│       │   └── useUserTable.ts
│       └── index.ts
│
├── hooks/                  # Global custom hooks
│   ├── useAuth.ts
│   └── useDebounce.ts
│
├── store/                  # Zustand stores
│   ├── auth.store.ts
│   └── ui.store.ts
│
├── router/                 # React Router config
│   ├── index.tsx
│   ├── ProtectedRoute.tsx
│   └── routes.ts           # Route constants
│
├── types/                  # Global TypeScript types
│   ├── api.types.ts        # API response/request types
│   ├── auth.types.ts
│   └── index.ts
│
├── utils/                  # Pure utility functions
│   ├── format.ts           # Format date, currency, string
│   ├── validation.ts       # Zod schemas
│   └── constants.ts
│
├── App.tsx
└── main.tsx
```

---

## Phân loại Component

### `components/ui/` — Primitive, không có business logic
```tsx
// ✅ Đúng — chỉ nhận props, không biết về User, Order...
<Button variant="primary" onClick={handleClick}>Submit</Button>
<Input label="Email" error={errors.email} {...register("email")} />
<Modal isOpen={isOpen} onClose={onClose} title="Confirm">...</Modal>
```

### `components/<feature>/` — Shared feature components
```tsx
// Dùng ở nhiều pages — biết về domain nhưng không gọi API
<UserAvatar userId={user.id} size="sm" />
<OrderStatusBadge status={order.status} />
```

### `pages/<Feature>/components/` — Page-local components
```tsx
// Chỉ dùng trong 1 page — đặt gần nơi dùng
// Không export ra ngoài page folder
```

---

## Quy tắc đặt tên

| Loại | Pattern | Ví dụ |
|------|---------|-------|
| Component file | `PascalCase.tsx` | `UserTable.tsx` |
| Hook | `use` + camelCase | `useUserTable.ts` |
| Store | camelCase + `.store.ts` | `auth.store.ts` |
| API file | camelCase + `.api.ts` | `user.api.ts` |
| Types file | camelCase + `.types.ts` | `user.types.ts` |
| Util file | camelCase + `.ts` | `format.ts` |
| Page folder | PascalCase | `Users/`, `OrderDetail/` |
| Route path | kebab-case | `/user-profile`, `/order-detail` |

---

## Luồng dữ liệu chuẩn

```
Page
 ├── gọi TanStack Query hook (useQuery/useMutation)
 │       ↓
 │   api/<feature>.api.ts   ← gọi Axios client
 │       ↓
 │   Backend API
 │
 ├── đọc global state từ Zustand store (auth, ui...)
 │
 └── render Components (truyền data qua props)
```

**Quy tắc:**
- **Page** orchestrate data — gọi queries, truyền data xuống components
- **Component** nhận data qua props — không tự gọi API trừ khi có lý do rõ ràng
- **TanStack Query** = server state (data từ API)
- **Zustand** = client state (auth, UI state, user preferences)
- **useState** = local component state (form input, toggle, modal)

---

## Khi nào tách Component

Tách khi component hiện tại:
- Dài hơn **150 lines** → tách thành sub-components
- Có **logic lặp lại** → tách thành reusable component
- Có **logic phức tạp** → tách thành custom hook
- Được dùng ở **2+ nơi** → chuyển lên `components/`

Không tách khi:
- Component đang ngắn và rõ ràng
- Tách xong lại chỉ có 1 chỗ dùng và không giảm complexity

---

## Template Page chuẩn

```tsx
// pages/Users/UsersPage.tsx
import { useState } from "react"
import { useUsers } from "./hooks/useUsers"
import { UserTable } from "./components/UserTable"
import { UserFilter } from "./components/UserFilter"
import { Button } from "@/components/ui/Button"
import type { UserFilter as UserFilterType } from "@/types/user.types"

export default function UsersPage() {
  const [filter, setFilter] = useState<UserFilterType>({ page: 1, per_page: 20 })

  const { data, isLoading, isError } = useUsers(filter)

  if (isLoading) return <div>Loading...</div>
  if (isError)   return <div>Có lỗi xảy ra</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Danh sách người dùng</h1>
        <Button variant="primary">Thêm mới</Button>
      </div>
      <UserFilter value={filter} onChange={setFilter} />
      <UserTable data={data?.data ?? []} meta={data?.meta} />
    </div>
  )
}
```

## Template Custom Hook chuẩn

```tsx
// pages/Users/hooks/useUsers.ts
import { useQuery } from "@tanstack/react-query"
import { getUsers } from "@/api/user.api"
import type { UserFilter } from "@/types/user.types"

export function useUsers(filter: UserFilter) {
  return useQuery({
    queryKey: ["users", filter],   // Key thay đổi → tự refetch
    queryFn: () => getUsers(filter),
    staleTime: 1000 * 60 * 5,     // Cache 5 phút
  })
}
```

---

## Path Aliases (vite.config.ts)

```ts
// Dùng @/ thay vì ../../../ — bắt buộc setup
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

---

## Quy tắc bắt buộc

1. **Không** import component của page A vào page B — nếu cần dùng chung, chuyển lên `components/`
2. **Không** gọi API trực tiếp trong component — luôn qua custom hook hoặc TanStack Query
3. **Không** để business logic trong JSX — tách ra hook hoặc utils
4. **Luôn** dùng `@/` alias — không dùng relative path quá 2 cấp (`../../`)
5. **Mỗi folder** component phải có `index.ts` để export — import gọn hơn