import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@renderer/lib/queryClient'
import * as api from '@renderer/db/api'
import type { Priority } from '@renderer/db/database'

export function useActiveTasks(projectId: string | null) {
  return useQuery({
    queryKey: qk.activeTasks(projectId ?? ''),
    queryFn: () => api.listActiveTasks(projectId as string),
    enabled: !!projectId
  })
}

export function useCompletedTasks(projectId?: string) {
  return useQuery({
    queryKey: qk.completedTasks(projectId),
    queryFn: () => api.listCompletedTasks(projectId)
  })
}

function useInvalidateTasks() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['tasks'] })
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (input: {
      projectId: string
      title: string
      priority: Priority
      description?: string
    }) => api.createTask(input),
    onSuccess: invalidate
  })
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (v: {
      id: string
      patch: Partial<{ title: string; description: string; priority: Priority }>
    }) => api.updateTask(v.id, v.patch),
    onSuccess: invalidate
  })
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: invalidate
  })
}

export function useReopenTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => api.reopenTask(id),
    onSuccess: invalidate
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: invalidate
  })
}
