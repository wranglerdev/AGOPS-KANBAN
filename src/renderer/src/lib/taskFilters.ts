import Fuse from 'fuse.js'
import type { Task } from '@renderer/db/database'

/** Janela usada para o indicador de "pace" (tarefas concluidas por periodo). */
export const PACE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type DateRange = 'all' | 'today' | '7d' | '30d'

export const DATE_RANGE_LABEL: Record<DateRange, string> = {
  all: 'Qualquer data',
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias'
}

export const DATE_RANGES: DateRange[] = ['all', 'today', '7d', '30d']

/** Timestamp minimo de criacao aceito para o periodo escolhido. */
function rangeStart(range: DateRange): number {
  const now = Date.now()
  switch (range) {
    case 'today': {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000
    case '30d':
      return now - 30 * 24 * 60 * 60 * 1000
    default:
      return -Infinity
  }
}

/** Verdadeiro se a tarefa foi criada dentro do periodo. */
export function matchesDate(task: Task, range: DateRange): boolean {
  if (range === 'all') return true
  return task.createdAt >= rangeStart(range)
}

/** Tags unicas de um conjunto de tarefas, ordenadas alfabeticamente. */
export function collectTags(tasks: Task[]): string[] {
  const set = new Set<string>()
  for (const t of tasks) for (const tag of t.tags ?? []) set.add(tag)
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Fuse configurado para busca fuzzy sobre titulo, descricao e tags. */
export function buildTaskFuse(tasks: Task[]): Fuse<Task> {
  return new Fuse(tasks, {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'description', weight: 1 },
      { name: 'tags', weight: 1 }
    ],
    threshold: 0.4,
    ignoreLocation: true
  })
}
