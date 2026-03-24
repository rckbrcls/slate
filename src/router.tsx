import {
  Outlet,
  RouterProvider,
  Navigate,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { WelcomeRoute } from "@/routes/WelcomeRoute"
import { EditorRoute } from "@/routes/EditorRoute"

function RootLayout() {
  return (
    <TooltipProvider>
      <div className="dark">
        <Outlet />
        <Toaster />
      </div>
    </TooltipProvider>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <Navigate to="/" />,
})

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: WelcomeRoute,
})

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "editor",
  component: EditorRoute,
})

const routeTree = rootRoute.addChildren([welcomeRoute, editorRoute])

export function createAppRouter({
  history = createHashHistory(),
}: {
  history?: ReturnType<typeof createHashHistory>
} = {}) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: "intent",
  })
}

export const router = createAppRouter()

export function AppRouter() {
  return <RouterProvider router={router} />
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
