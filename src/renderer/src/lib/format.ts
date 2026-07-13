import type { Priority } from '@renderer/db/database'

export const priorityColorVar: Record<Priority, string> = {
  urgent: 'var(--prio-urgent)',
  high: 'var(--prio-high)',
  medium: 'var(--prio-medium)',
  low: 'var(--prio-low)'
}

const dtf = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dtfTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

export const formatDate = (ms: number): string => dtf.format(new Date(ms))
export const formatDateTime = (ms: number): string => dtfTime.format(new Date(ms))
