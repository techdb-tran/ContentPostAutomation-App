import { RouterProvider } from "react-router-dom"
import { Toaster } from "sonner"

import { appRouter } from "@/router"

export function App() {
  return (
    <>
      <RouterProvider router={appRouter} />
      <Toaster richColors position="top-right" />
    </>
  )
}
