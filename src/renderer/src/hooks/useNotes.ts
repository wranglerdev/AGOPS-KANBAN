import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@renderer/lib/queryClient'
import * as api from '@renderer/db/api'

export function useNotes() {
  return useQuery({ queryKey: qk.notes, queryFn: api.listNotes })
}

function useInvalidateNotes() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: qk.notes })
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes()
  return useMutation({ mutationFn: () => api.createNote(), onSuccess: invalidate })
}

export function useUpdateNote() {
  const invalidate = useInvalidateNotes()
  return useMutation({
    mutationFn: (v: { id: string; patch: Partial<{ title: string; contentMd: string }> }) =>
      api.updateNote(v.id, v.patch),
    onSuccess: invalidate
  })
}

export function useDeleteNote() {
  const invalidate = useInvalidateNotes()
  return useMutation({ mutationFn: (id: string) => api.deleteNote(id), onSuccess: invalidate })
}

export function useDuplicateNote() {
  const invalidate = useInvalidateNotes()
  return useMutation({ mutationFn: (id: string) => api.duplicateNote(id), onSuccess: invalidate })
}

export function useImportNote() {
  const invalidate = useInvalidateNotes()
  return useMutation({
    mutationFn: (v: { title: string; contentMd: string }) =>
      api.createNoteFrom(v.title, v.contentMd),
    onSuccess: invalidate
  })
}
