import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import { toast } from "sonner"
import axios from "axios"

import { register } from "@/api/auth.api"
import { useAuthStore } from "@/store/auth.store"

const registerSchema = z.object({
  display_name: z.string().min(2, "Tên hiển thị phải có ít nhất 2 ký tự"),
  username: z.string().min(2, "Username phải có ít nhất 2 ký tự").max(50),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const accessToken = useAuthStore((state) => state.accessToken)

  const mutation = useMutation({
    mutationFn: (data: RegisterFormData) =>
      register({ username: data.username, password: data.password, display_name: data.display_name }),
    onSuccess: (data) => {
      setSession(data)
      toast.success(`Đăng ký thành công! Chào mừng, ${data.user.displayName}!`)
      navigate("/", { replace: true })
    },
  })

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  useEffect(() => {
    if (accessToken) navigate("/", { replace: true })
  }, [accessToken, navigate])

  const onSubmit = (data: RegisterFormData) => mutation.mutate(data)

  const serverError = axios.isAxiosError(mutation.error)
    ? (mutation.error.response?.data as { message?: string })?.message
    : null

  return (
    <div className="page-shell centered login-page">
      <div className="glass-card login-card">
        <div className="login-header">
          <div className="brand-mark">A</div>
          <div>
            <h1 className="login-title">Auto Posting Studio</h1>
            <p className="subtle">Tạo tài khoản mới</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="field">
            <span>Tên hiển thị</span>
            <input
              {...formRegister("display_name")}
              placeholder="Nguyễn Văn A"
              autoFocus
            />
            {errors.display_name && <small className="field-error">{errors.display_name.message}</small>}
          </label>

          <label className="field">
            <span>Username</span>
            <input
              {...formRegister("username")}
              placeholder="username123"
              autoComplete="username"
            />
            {errors.username && <small className="field-error">{errors.username.message}</small>}
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <input
              {...formRegister("password")}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.password && <small className="field-error">{errors.password.message}</small>}
          </label>

          <label className="field">
            <span>Xác nhận mật khẩu</span>
            <input
              {...formRegister("confirmPassword")}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}
          </label>

          <button className="primary-button login-submit" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Đang đăng ký..." : "Đăng ký"}
          </button>

          {mutation.isError && (
            <p className="field-error login-server-error">
              {serverError ?? "Đã xảy ra lỗi, vui lòng thử lại."}
            </p>
          )}
        </form>

        <p className="subtle" style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem" }}>
          Đã có tài khoản?{" "}
          <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
