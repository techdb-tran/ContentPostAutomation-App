import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { toast } from "sonner"
import axios from "axios"

import { login } from "@/api/auth.api"
import { useAuthStore } from "@/store/auth.store"

const loginSchema = z.object({
  username: z.string().min(2, "Vui lòng nhập username"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const accessToken = useAuthStore((state) => state.accessToken)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data)
      toast.success(`Chào mừng, ${data.user.displayName}!`)
      navigate("/", { replace: true })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true })
    }
  }, [accessToken, navigate])

  const onSubmit = (data: LoginFormData) => {
    mutation.mutate(data)
  }

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
            <p className="subtle">Đăng nhập để tiếp tục</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="field">
            <span>Username</span>
            <input
              {...register("username")}
              placeholder="Admin1"
              autoComplete="username"
              autoFocus
            />
            {errors.username && <small className="field-error">{errors.username.message}</small>}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && <small className="field-error">{errors.password.message}</small>}
          </label>

          <button className="primary-button login-submit" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          {mutation.isError && (
            <p className="field-error login-server-error">
              {serverError ?? "Sai tài khoản hoặc mật khẩu."}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
