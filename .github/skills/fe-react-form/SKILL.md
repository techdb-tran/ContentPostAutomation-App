---
name: fe-react-form
description: >
  Chuẩn xây dựng form trong React với React Hook Form + Zod validation.
  Bắt buộc đọc khi tạo form mới, viết validation schema, xử lý submit,
  hiển thị lỗi từ API, tạo reusable form components, hoặc bất kỳ thứ gì
  liên quan đến input/form. Stack: React Hook Form + Zod.
---

# React Form Skill

## Cài đặt

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## Pattern Form chuẩn

```tsx
// src/pages/Users/components/CreateUserForm.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCreateUser } from "../hooks/useUserMutations"
import { extractFieldErrors } from "@/utils/error"

// 1. Định nghĩa Zod schema
const createUserSchema = z.object({
  name: z.string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được quá 100 ký tự"),
  email: z.string()
    .email("Email không hợp lệ"),
  password: z.string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  confirmPassword: z.string(),
  role: z.enum(["user", "admin"]).default("user"),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Mật khẩu không khớp", path: ["confirmPassword"] }
)

// 2. Infer TypeScript type từ schema — không định nghĩa type riêng
type CreateUserFormData = z.infer<typeof createUserSchema>

// 3. Component
export function CreateUserForm({ onSuccess }: { onSuccess?: () => void }) {
  const createUser = useCreateUser()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "user" },
  })

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      const { confirmPassword, ...payload } = data
      await createUser.mutateAsync(payload)
      reset()
      onSuccess?.()
    } catch (error) {
      // Map lỗi từ API về từng field
      const fieldErrors = extractFieldErrors(error)
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setError(field as keyof CreateUserFormData, { message })
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormField label="Họ tên" error={errors.name?.message} required>
        <input {...register("name")} placeholder="Nguyễn Văn A" />
      </FormField>

      <FormField label="Email" error={errors.email?.message} required>
        <input {...register("email")} type="email" />
      </FormField>

      <FormField label="Mật khẩu" error={errors.password?.message} required>
        <input {...register("password")} type="password" />
      </FormField>

      <FormField label="Xác nhận mật khẩu" error={errors.confirmPassword?.message} required>
        <input {...register("confirmPassword")} type="password" />
      </FormField>

      <FormField label="Vai trò" error={errors.role?.message}>
        <select {...register("role")}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </FormField>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang xử lý..." : "Tạo người dùng"}
      </button>
    </form>
  )
}
```

---

## Zod Schema Patterns phổ biến

```ts
import { z } from "zod"

// String validations
z.string().min(1, "Bắt buộc nhập")
z.string().min(2).max(100)
z.string().email("Email không hợp lệ")
z.string().url("URL không hợp lệ")
z.string().regex(/^\d{10}$/, "Số điện thoại không hợp lệ")
z.string().optional()                 // Có thể undefined
z.string().nullable()                 // Có thể null
z.string().nullish()                  // Có thể null hoặc undefined

// Number
z.number().min(0, "Phải >= 0").max(100)
z.number().int("Phải là số nguyên")
z.number().positive("Phải là số dương")
z.coerce.number()                     // Auto convert string → number (dùng cho input type="number")

// Enum
z.enum(["active", "inactive", "pending"])

// Optional field với default
z.string().default("user")

// Date
z.string().datetime()                 // ISO datetime string
z.coerce.date()                       // Convert string → Date

// Array
z.array(z.string()).min(1, "Chọn ít nhất 1")

// Object
z.object({ id: z.number(), name: z.string() })

// Cross-field validation
const schema = z.object({
  startDate: z.string(),
  endDate:   z.string(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: "Ngày kết thúc phải sau ngày bắt đầu", path: ["endDate"] }
)

// Conditional validation
const schema = z.object({
  hasShipping: z.boolean(),
  address: z.string().optional(),
}).refine(
  (data) => !data.hasShipping || (data.address && data.address.length > 0),
  { message: "Địa chỉ là bắt buộc khi giao hàng", path: ["address"] }
)
```

---

## Reusable FormField Component (`src/components/ui/FormField/`)

```tsx
// src/components/ui/FormField/FormField.tsx
interface FormFieldProps {
  label:    string
  error?:   string
  required?: boolean
  children: React.ReactNode
  hint?:    string
}

export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div className="form-field">
      <label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {children}

      {hint && !error && (
        <p className="text-gray-500 text-sm mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}
```

---

## Edit Form — Pre-populate từ API

```tsx
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useUser } from "../hooks/useUsers"
import { useUpdateUser } from "../hooks/useUserMutations"

export function EditUserForm({ userId }: { userId: number }) {
  const { data: user, isLoading } = useUser(userId)
  const updateUser = useUpdateUser(userId)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<UpdateUserFormData>({
      resolver: zodResolver(updateUserSchema),
    })

  // Populate form khi data load xong
  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email, role: user.role })
    }
  }, [user, reset])

  if (isLoading) return <div>Loading...</div>

  const onSubmit = async (data: UpdateUserFormData) => {
    await updateUser.mutateAsync(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* fields... */}
      <button type="submit" disabled={!isDirty || updateUser.isPending}>
        {updateUser.isPending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  )
}
```

---

## Đặt Zod Schemas ở đâu

```
src/
├── utils/
│   └── validation.ts      ← Schemas dùng chung (email, phone, password rules...)
│
└── pages/
    └── Users/
        └── users.schema.ts ← Schemas chỉ dùng trong page này
```

```ts
// src/utils/validation.ts — shared rules
export const passwordSchema = z.string()
  .min(8, "Ít nhất 8 ký tự")
  .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
  .regex(/[0-9]/, "Cần ít nhất 1 số")

export const phoneSchema = z.string()
  .regex(/^(0|\+84)[0-9]{9}$/, "Số điện thoại không hợp lệ")
```

---

## Quy tắc bắt buộc

1. **Luôn dùng** `zodResolver` — không validate thủ công trong `onSubmit`
2. **Infer type** từ Zod schema bằng `z.infer<typeof schema>` — không viết type riêng
3. **Map API errors** về field bằng `setError` sau khi submit fail
4. **`isDirty`** check trước khi enable Submit button ở Edit form — tránh submit không đổi gì
5. **`noValidate`** trên `<form>` — tắt browser validation, để Zod xử lý
6. `isSubmitting` hoặc `mutation.isPending` để disable button khi đang submit
7. **Không dùng** `useEffect` để watch form values — dùng `watch()` hoặc `useWatch()` từ RHF