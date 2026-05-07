---
name: fe-state-management
description: >
  Quy tắc phân chia và quản lý state trong React với Zustand + TanStack Query.
  Bắt buộc đọc khi tạo Zustand store mới, phân vân state để ở đâu (local vs
  global vs server), cấu trúc store, persist state, hoặc tránh re-render
  không cần thiết. Stack: Zustand cho client state, TanStack Query cho server
  state.
---

# State Management Skill

## Phân loại State — Quyết định đặt ở đâu

```
Câu hỏi: State này thuộc loại nào?
         │
         ├─ Data từ API? (users, orders, products...)
         │   └─→ TanStack Query  (server state)
         │
         ├─ Dùng ở nhiều component/page khác nhau?
         │   ├─ Liên quan đến auth/user?  → Zustand auth.store
         │   ├─ Liên quan đến UI global?  → Zustand ui.store
         │   └─ Liên quan đến domain?     → Zustand <domain>.store
         │
         └─ Chỉ dùng trong 1 component?
             └─→ useState / useReducer  (local state)
```

### Ví dụ thực tế

| State | Đặt ở đâu | Lý do |
|-------|-----------|-------|
| Danh sách users | TanStack Query | Data từ API, cần cache |
| User đang đăng nhập | Zustand auth.store | Global, cần persist |
| Sidebar mở/đóng | Zustand ui.store | Global UI state |
| Modal đang mở | useState | Local trong component |
| Tab đang active | useState | Local trong component |
| Filter/search params | useState + URL params | Local + shareable |
| Theme dark/light | Zustand ui.store + persist | Global, cần persist |

---

## Zustand Store Pattern chuẩn

### Auth Store (`src/store/auth.store.ts`)

```ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface AuthState {
  // State
  accessToken:  string | null
  refreshToken: string | null
  user: {
    id:    number
    name:  string
    email: string
    role:  string
  } | null

  // Computed (getters)
  isAuthenticated: boolean
  isAdmin: boolean

  // Actions
  setTokens:    (tokens: { accessToken: string; refreshToken?: string }) => void
  setUser:      (user: AuthState["user"]) => void
  logout:       () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      accessToken:  null,
      refreshToken: null,
      user:         null,

      // Computed
      get isAuthenticated() { return !!get().accessToken },
      get isAdmin()         { return get().user?.role === "admin" },

      // Actions
      setTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),

      setUser: (user) => set({ user }),

      logout: () => set({
        accessToken:  null,
        refreshToken: null,
        user:         null,
      }),
    }),
    {
      name:    "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Chỉ persist những field cần thiết
      partialize: (state) => ({
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
      }),
    }
  )
)
```

### UI Store (`src/store/ui.store.ts`)

```ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface UIState {
  sidebarOpen:  boolean
  theme:        "light" | "dark"

  toggleSidebar: () => void
  setSidebar:    (open: boolean) => void
  toggleTheme:   () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme:       "light",

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar:    (open) => set({ sidebarOpen: open }),
      toggleTheme:   () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
    }),
    {
      name:    "ui-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### Domain Store — khi thực sự cần (`src/store/cart.store.ts`)

```ts
// Chỉ tạo domain store khi:
// - State cần dùng ở nhiều page/component
// - KHÔNG phải data từ API (đó là TanStack Query)
// - Ví dụ: cart, draft order, wizard step, selection...

import { create } from "zustand"

interface CartItem { productId: number; quantity: number; price: number }

interface CartState {
  items:      CartItem[]
  addItem:    (item: CartItem) => void
  removeItem: (productId: number) => void
  clearCart:  () => void
  total:      () => number
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],

  addItem: (item) => set((s) => {
    const existing = s.items.find((i) => i.productId === item.productId)
    if (existing) {
      return { items: s.items.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      )}
    }
    return { items: [...s.items, item] }
  }),

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}))
```

---

## Cách dùng Store trong Component

```tsx
// ✅ Chỉ subscribe field cần — tránh re-render thừa
const user         = useAuthStore((s) => s.user)
const isAdmin      = useAuthStore((s) => s.isAdmin)
const logout       = useAuthStore((s) => s.logout)
const sidebarOpen  = useUIStore((s) => s.sidebarOpen)

// ❌ Sai — subscribe toàn bộ store → re-render mọi thay đổi
const authStore    = useAuthStore()
const { sidebarOpen, theme, toggleSidebar } = useUIStore()

// ✅ Lấy nhiều field cùng lúc — dùng shallow để tối ưu
import { useShallow } from "zustand/react/shallow"
const { user, isAuthenticated } = useAuthStore(
  useShallow((s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }))
)
```

---

## Combine TanStack Query + Zustand

```tsx
// Đây là pattern phổ biến nhất — Query fetch data, Store giữ auth
function UserProfilePage() {
  const user     = useAuthStore((s) => s.user)       // Zustand: ai đang login
  const setUser  = useAuthStore((s) => s.setUser)

  // TanStack Query: fetch full profile từ API
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn:  () => getProfile(),
    enabled:  !!user,
    onSuccess: (data) => setUser(data), // Sync về store nếu cần
  })

  return <ProfileCard profile={profile} />
}
```

---

## Zustand Outside Component (dùng trong Axios interceptor, utils...)

```ts
// Truy cập store bên ngoài React component
import { useAuthStore } from "@/store/auth.store"

// Đọc state
const token = useAuthStore.getState().accessToken

// Update state
useAuthStore.getState().logout()
useAuthStore.getState().setTokens({ accessToken: newToken })

// Subscribe to changes
const unsubscribe = useAuthStore.subscribe(
  (state) => state.accessToken,
  (token) => console.log("Token changed:", token)
)
```

---

## Quy tắc bắt buộc

1. **Server state** (data từ API) → **TanStack Query** — không lưu vào Zustand
2. **Không tạo** store mới nếu `useState` đủ dùng
3. **Chỉ subscribe field cần** trong component — không destructure toàn bộ store
4. **Actions** đặt trong store, không tạo helper function bên ngoài mutate store
5. **Persist** chỉ những gì thực sự cần giữ sau reload (token, theme, user)
6. **Không** lưu sensitive data nhạy cảm vào localStorage ngoài token đã mã hóa
7. Tạo store mới khi: state dùng ở **3+ component không liên quan** — dưới đó dùng props