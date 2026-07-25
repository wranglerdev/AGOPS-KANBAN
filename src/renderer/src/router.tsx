import {
  createRootRoute,
  createRoute,
  createRouter,
  createHashHistory,
  Outlet
} from '@tanstack/react-router'
import { AppShell } from '@renderer/components/AppShell'
import { BoardRoute } from '@renderer/routes/BoardRoute'
import { SummaryRoute } from '@renderer/routes/SummaryRoute'
import { NotesRoute } from '@renderer/routes/NotesRoute'

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  )
})

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: BoardRoute
})

const summaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/summary',
  component: SummaryRoute
})

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  validateSearch: (search: Record<string, unknown>): { note?: string } => {
    const note = search.note
    return typeof note === 'string' && note ? { note } : {}
  },
  component: NotesRoute
})

const routeTree = rootRoute.addChildren([boardRoute, summaryRoute, notesRoute])

export const router = createRouter({
  routeTree,
  history: createHashHistory()
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
