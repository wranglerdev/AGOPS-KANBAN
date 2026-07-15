import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export const qk = {
  projects: ['projects'] as const,
  activeTasks: (projectId: string) => ['tasks', 'active', projectId] as const,
  completedTasks: (projectId?: string) => ['tasks', 'completed', projectId ?? 'all'] as const,
  allTasks: (projectId?: string) => ['tasks', 'all', projectId ?? 'all'] as const,
  notes: ['notes'] as const
}
