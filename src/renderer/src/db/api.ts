import { db, type Priority, type Project, type Task, type Note } from './database'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/* ----------------------------- Projects ----------------------------- */

export async function listProjects(): Promise<Project[]> {
  const projects = await db.projects.toArray()
  return projects.sort((a, b) => a.createdAt - b.createdAt)
}

export async function createProject(name: string): Promise<Project> {
  const project: Project = { id: uid(), name: name.trim(), createdAt: Date.now() }
  await db.projects.add(project)
  return project
}

export async function renameProject(id: string, name: string): Promise<void> {
  await db.projects.update(id, { name: name.trim() })
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, async () => {
    await db.tasks.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}

/* ------------------------------- Tasks ------------------------------- */

// Tarefas ativas (nao concluidas) do projeto, ordenadas por prioridade+fila.
export async function listActiveTasks(projectId: string): Promise<Task[]> {
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  return tasks
    .filter((t) => t.completedAt == null && t.archived === 0)
    .sort((a, b) => a.order - b.order)
}

// Tarefas concluidas (para os resumos). Se projectId for undefined, todas.
export async function listCompletedTasks(projectId?: string): Promise<Task[]> {
  let tasks: Task[]
  if (projectId) {
    tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  } else {
    tasks = await db.tasks.toArray()
  }
  return tasks
    .filter((t) => t.completedAt != null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
}

// Todas as tarefas nao arquivadas (ativas + concluidas), para a tabela do resumo.
// Concluidas primeiro por data desc; ativas depois por criacao desc.
export async function listAllTasks(projectId?: string): Promise<Task[]> {
  let tasks: Task[]
  if (projectId) {
    tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  } else {
    tasks = await db.tasks.toArray()
  }
  return tasks
    .filter((t) => t.archived === 0)
    .sort((a, b) => {
      const aKey = a.completedAt ?? a.createdAt
      const bKey = b.completedAt ?? b.createdAt
      return bKey - aKey
    })
}

export interface ImportRow {
  title: string
  priority?: Priority
  description?: string
  tags?: string[]
  projectName?: string
  completedAt?: number | null
  createdAt?: number
}

/**
 * Importa tarefas ja mapeadas. Resolve/cria projetos por nome (case-insensitive).
 * Linhas sem titulo sao ignoradas. Retorna contagens do que foi criado.
 */
export async function importTasks(
  rows: ImportRow[],
  opts: { fallbackProjectId?: string } = {}
): Promise<{ created: number; projectsCreated: number }> {
  return db.transaction('rw', db.projects, db.tasks, async () => {
    const projects = await db.projects.toArray()
    const byName = new Map<string, string>()
    for (const p of projects) byName.set(p.name.trim().toLowerCase(), p.id)

    let projectsCreated = 0
    const resolveProject = async (name?: string): Promise<string | null> => {
      const clean = name?.trim()
      if (!clean) return opts.fallbackProjectId ?? null
      const key = clean.toLowerCase()
      const existing = byName.get(key)
      if (existing) return existing
      const project: Project = { id: uid(), name: clean, createdAt: Date.now() }
      await db.projects.add(project)
      byName.set(key, project.id)
      projectsCreated++
      return project.id
    }

    // Cache de order por coluna (projectId+priority) para empilhar em sequencia.
    const orderCache = new Map<string, number>()
    const nextOrder = async (projectId: string, priority: Priority): Promise<number> => {
      const key = `${projectId}::${priority}`
      if (!orderCache.has(key)) {
        const existing = await db.tasks
          .where('[projectId+priority]')
          .equals([projectId, priority])
          .toArray()
        const active = existing.filter((t) => t.completedAt == null && t.archived === 0)
        orderCache.set(key, active.reduce((max, t) => Math.max(max, t.order), -1))
      }
      const next = (orderCache.get(key) as number) + 1
      orderCache.set(key, next)
      return next
    }

    let created = 0
    for (const row of rows) {
      const title = row.title?.trim()
      if (!title) continue
      const projectId = await resolveProject(row.projectName)
      if (!projectId) continue
      const priority = row.priority ?? 'medium'
      const task: Task = {
        id: uid(),
        projectId,
        title,
        description: row.description?.trim() ?? '',
        priority,
        order: await nextOrder(projectId, priority),
        tags: row.tags ?? [],
        createdAt: row.createdAt ?? Date.now(),
        completedAt: row.completedAt ?? null,
        archived: 0,
        blockedBy: [],
        noteId: null
      }
      await db.tasks.add(task)
      created++
    }
    return { created, projectsCreated }
  })
}

export async function createTask(input: {
  projectId: string
  title: string
  priority: Priority
  description?: string
  tags?: string[]
}): Promise<Task> {
  // Adiciona ao fim da fila da coluna (maior order + 1).
  const existing = await db.tasks
    .where('[projectId+priority]')
    .equals([input.projectId, input.priority])
    .toArray()
  const active = existing.filter((t) => t.completedAt == null && t.archived === 0)
  const maxOrder = active.reduce((max, t) => Math.max(max, t.order), -1)

  const task: Task = {
    id: uid(),
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    priority: input.priority,
    order: maxOrder + 1,
    tags: input.tags ?? [],
    createdAt: Date.now(),
    completedAt: null,
    archived: 0,
    blockedBy: [],
    noteId: null
  }
  await db.tasks.add(task)
  return task
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'blockedBy' | 'noteId'>>
): Promise<void> {
  await db.tasks.update(id, patch)
}

// order do fim de uma coluna (maior order + 1) entre as tarefas ativas.
async function nextOrderInColumn(projectId: string, priority: Priority): Promise<number> {
  const existing = await db.tasks
    .where('[projectId+priority]')
    .equals([projectId, priority])
    .toArray()
  const active = existing.filter((t) => t.completedAt == null && t.archived === 0)
  return active.reduce((max, t) => Math.max(max, t.order), -1) + 1
}

/** Duplica uma tarefa: copia no fim da mesma coluna, resetando conclusao. */
export async function duplicateTask(id: string): Promise<Task | null> {
  const src = await db.tasks.get(id)
  if (!src) return null
  const copy: Task = {
    ...src,
    id: uid(),
    title: `${src.title} (cópia)`,
    order: await nextOrderInColumn(src.projectId, src.priority),
    createdAt: Date.now(),
    completedAt: null,
    archived: 0
  }
  await db.tasks.add(copy)
  return copy
}

/** Muda a prioridade (coluna) fora do drag, mantendo order consistente no destino. */
export async function changeTaskPriority(id: string, priority: Priority): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task || task.priority === priority) return
  const order = await nextOrderInColumn(task.projectId, priority)
  await db.tasks.update(id, { priority, order })
}

/**
 * Move uma tarefa para outro projeto, preservando prioridade e status de conclusao.
 * Reposiciona no fim da coluna correspondente do projeto de destino e limpa
 * bloqueios (que referenciam tarefas do projeto de origem).
 */
export async function moveTaskToProject(id: string, projectId: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task || task.projectId === projectId) return
  const order = await nextOrderInColumn(projectId, task.priority)
  await db.tasks.update(id, { projectId, order, blockedBy: [] })
}

export async function completeTask(id: string): Promise<void> {
  await db.tasks.update(id, { completedAt: Date.now() })
}

export async function reopenTask(id: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  const active = await listActiveTasks(task.projectId)
  const sameCol = active.filter((t) => t.priority === task.priority)
  const maxOrder = sameCol.reduce((max, t) => Math.max(max, t.order), -1)
  await db.tasks.update(id, { completedAt: null, order: maxOrder + 1 })
}

export async function deleteTask(id: string): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    await db.tasks.delete(id)
    // Remove referencias penduradas: tira o id excluido do blockedBy das demais.
    await db.tasks
      .filter((t) => Array.isArray(t.blockedBy) && t.blockedBy.includes(id))
      .modify((t) => {
        t.blockedBy = t.blockedBy.filter((b) => b !== id)
      })
  })
}

/**
 * Persiste a nova ordem de UMA coluna reindexando order = indice.
 * `orderedIds` é a lista de ids na ordem final (topo -> base) da coluna `priority`.
 */
export async function reindexColumn(
  projectId: string,
  priority: Priority,
  orderedIds: string[]
): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.tasks.update(id, { priority, order: index, projectId })
      )
    )
  })
}

/**
 * Move um card entre colunas (muda prioridade) e reindexa origem e destino.
 */
export async function moveTaskAcross(params: {
  projectId: string
  fromPriority: Priority
  toPriority: Priority
  fromIds: string[]
  toIds: string[]
}): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    await Promise.all([
      ...params.fromIds.map((id, i) =>
        db.tasks.update(id, { priority: params.fromPriority, order: i })
      ),
      ...params.toIds.map((id, i) =>
        db.tasks.update(id, { priority: params.toPriority, order: i })
      )
    ])
  })
}

/* ------------------------------- Notes ------------------------------- */

export async function listNotes(): Promise<Note[]> {
  const notes = await db.notes.toArray()
  return notes.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function createNote(): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: uid(),
    title: 'Nova nota',
    contentMd: '# Nova nota\n\nEscreva aqui...\n',
    createdAt: now,
    updatedAt: now
  }
  await db.notes.add(note)
  return note
}

/** Cria uma nota a partir de conteudo importado (arquivo .md/.txt). */
export async function createNoteFrom(title: string, contentMd: string): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: uid(),
    title: title.trim() || 'Nota importada',
    contentMd,
    createdAt: now,
    updatedAt: now
  }
  await db.notes.add(note)
  return note
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'contentMd'>>
): Promise<void> {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() })
}

/** Duplica uma nota mantendo o conteudo; a copia entra no topo (updatedAt agora). */
export async function duplicateNote(id: string): Promise<Note | null> {
  const src = await db.notes.get(id)
  if (!src) return null
  const now = Date.now()
  const copy: Note = {
    id: uid(),
    title: `${src.title} (cópia)`,
    contentMd: src.contentMd,
    createdAt: now,
    updatedAt: now
  }
  await db.notes.add(copy)
  return copy
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}
