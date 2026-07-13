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
  createdAt: number
  completedAt: number | null
  archived: number // 0 | 1 (IndexedDB nao indexa boolean)
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

export { db }
