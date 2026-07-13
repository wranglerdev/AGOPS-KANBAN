import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@renderer/lib/queryClient'
import * as api from '@renderer/db/api'

export function useProjects() {
  return useQuery({ queryKey: qk.projects, queryFn: api.listProjects })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createProject(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects })
  })
}

export function useRenameProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; name: string }) => api.renameProject(v.id, v.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects })
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}
