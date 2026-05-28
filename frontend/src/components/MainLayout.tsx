import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth.store"

export function MainLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="page-shell">
      <div className="ops-layout">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">A</div>
            <div>
              <p className="eyebrow">Auto Posting Studio</p>
              <h1 className="ops-title">Quản lý Via & Automation</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <nav className="platform-tabs">
              <NavLink
                to="/fb"
                className={({ isActive }) => `platform-tab fb-tab${isActive ? " active" : ""}`}
              >
                Facebook
              </NavLink>
              <NavLink
                to="/ig"
                className={({ isActive }) => `platform-tab ig-tab${isActive ? " active" : ""}`}
              >
                Instagram
              </NavLink>
            </nav>
            <span className="chip">{user?.displayName ?? "User"}</span>
            <button className="secondary-button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
