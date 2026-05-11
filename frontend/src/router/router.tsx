import { createBrowserRouter } from "react-router-dom"

import { FacebookPagesPage } from "@/pages/FacebookPages/FacebookPagesPage"
import { DashboardPage } from "@/pages/Dashboard/DashboardPage"
import { LoginPage } from "@/pages/Login/LoginPage"
import { RegisterPage } from "@/pages/Register/RegisterPage"
import { ViaAccountsPage } from "@/pages/ViaAccounts/ViaAccountsPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "via-accounts",
        element: <ViaAccountsPage />,
      },
      {
        path: "facebook-pages",
        element: <FacebookPagesPage />,
      },
    ],
  },
])
