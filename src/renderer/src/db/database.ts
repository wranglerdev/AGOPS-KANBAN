import Dexie, { type EntityTable } from 'dexie'

export type Priority = 'urgent' | 'high' | 'medium' | 'low'

export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
}

export interface Project {
  id: string
  name: string
  createdAt: number
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  priority: Priority
  order: number
  tags: string[]
  createdAt: number
  completedAt: number | null
  archived: number // 0 | 1 (IndexedDB nao indexa boolean)
  blockedBy: string[] // ids das tarefas que bloqueiam esta
  noteId: string | null // nota vinculada (1:1)
}

export interface Note {
  id: string
  title: string
  contentMd: string
  createdAt: number
  updatedAt: number
}

const db = new Dexie('agops-kanban') as Dexie & {
  projects: EntityTable<Project, 'id'>
  tasks: EntityTable<Task, 'id'>
  notes: EntityTable<Note, 'id'>
}

db.version(1).stores({
  projects: 'id, name, createdAt',
  tasks: 'id, projectId, priority, completedAt, archived, [projectId+priority], [projectId+completedAt]',
  notes: 'id, updatedAt'
})

// v2: adiciona tags (indice multiEntry *tags) e backfill nas tarefas existentes.
db
  .version(2)
  .stores({
    projects: 'id, name, createdAt',
    tasks:
      'id, projectId, priority, completedAt, archived, *tags, [projectId+priority], [projectId+completedAt]',
    notes: 'id, updatedAt'
  })
  .upgrade((tx) =>
    tx
      .table('tasks')
      .toCollection()
      .modify((t: Task) => {
        if (!Array.isArray(t.tags)) t.tags = []
      })
  )

// v3: adiciona relacoes (blockedBy + noteId). Campos nao indexados, entao a string de
// stores permanece igual; so faz backfill dos padroes nas tarefas existentes.
db
  .version(3)
  .stores({
    projects: 'id, name, createdAt',
    tasks:
      'id, projectId, priority, completedAt, archived, *tags, [projectId+priority], [projectId+completedAt]',
    notes: 'id, updatedAt'
  })
  .upgrade((tx) =>
    tx
      .table('tasks')
      .toCollection()
      .modify((t: Task) => {
        if (!Array.isArray(t.blockedBy)) t.blockedBy = []
        if (t.noteId === undefined) t.noteId = null
      })
  )

export { db }
