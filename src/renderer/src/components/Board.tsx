import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useNavigate } from '@tanstack/react-router'
import type { Priority, Task } from '@renderer/db/database'
import { PRIORITIES, PRIORITY_LABEL } from '@renderer/db/database'
import {
  useActiveTasks,
  useChangeTaskPriority,
  useCompleteTask,
  useDeleteTask,
  useDuplicateTask
} from '@renderer/hooks/useTasks'
import { moveTaskAcross, reindexColumn } from '@renderer/db/api'
import { Column } from './Column'
import { TaskModal } from './TaskModal'
import { BoardToolbar } from './BoardToolbar'
import { useContextMenu, type MenuEntry } from './ContextMenu'
import { useConfirm } from './ConfirmDialog'
import { useToast } from './Toast'
import { priorityColorVar, formatDate, tagColor } from '@renderer/lib/format'
import { Icon } from './Icon'
import {
  buildTaskFuse,
  collectTags,
  matchesDate,
  type DateRange
} from '@renderer/lib/taskFilters'

type Cols = Record<Priority, Task[]>

const emptyCols = (): Cols => ({ urgent: [], high: [], medium: [], low: [] })

function buildCols(tasks: Task[]): Cols {
  const cols = emptyCols()
  for (const p of PRIORITIES) {
    cols[p] = tasks.filter((t) => t.priority === p).sort((a, b) => a.order - b.order)
  }
  return cols
}

export function Board({ projectId }: { projectId: string }): JSX.Element {
  const { data: tasks = [] } = useActiveTasks(projectId)
  const [cols, setCols] = useState<Cols>(emptyCols)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openTask, setOpenTask] = useState<Task | null>(null)
  // Conjunto em destaque quando o usuário passa o mouse no cadeado (foco nas bloqueadoras).
  const [highlightIds, setHighlightIds] = useState<Set<string> | null>(null)

  // Estado dos filtros da barra (busca fuzzy + tags + data de criacao).
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const navigate = useNavigate()
  const { openContextMenu } = useContextMenu()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const completeTask = useCompleteTask()
  const duplicateTask = useDuplicateTask()
  const changePriority = useChangeTaskPriority()
  const deleteTask = useDeleteTask()

  const allTags = useMemo(() => collectTags(tasks), [tasks])
  const fuse = useMemo(() => buildTaskFuse(tasks), [tasks])

  // Tarefas visiveis apos aplicar data + tags (OR) + busca fuzzy.
  const filtered = useMemo(() => {
    let list = tasks.filter((t) => matchesDate(t, dateRange))
    if (selectedTags.length > 0) {
      list = list.filter((t) => (t.tags ?? []).some((tag) => selectedTags.includes(tag)))
    }
    const q = search.trim()
    if (q) {
      const matchIds = new Set(fuse.search(q).map((r) => r.item.id))
      list = list.filter((t) => matchIds.has(t.id))
    }
    return list
  }, [tasks, dateRange, selectedTags, search, fuse])

  const colsRef = useRef(cols)
  colsRef.current = cols
  const startContainer = useRef<Priority | null>(null)
  const isDragging = useRef(false)

  // Sincroniza estado local com o banco/filtros quando nao estamos arrastando.
  useEffect(() => {
    if (!isDragging.current) setCols(buildCols(filtered))
  }, [filtered])

  const toggleTag = (tag: string): void =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const findContainer = (id: string): Priority | null => {
    if (PRIORITIES.includes(id as Priority)) return id as Priority
    const current = colsRef.current
    return (PRIORITIES.find((p) => current[p].some((t) => t.id === id)) as Priority) ?? null
  }

  const activeTask = useMemo(() => {
    if (!activeId) return null
    for (const p of PRIORITIES) {
      const found = cols[p].find((t) => t.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, cols])

  const onDragStart = (e: DragStartEvent): void => {
    isDragging.current = true
    setActiveId(e.active.id as string)
    startContainer.current = findContainer(e.active.id as string)
  }

  const onDragOver = (e: DragOverEvent): void => {
    const { active, over } = e
    if (!over) return
    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setCols((prev) => {
      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]
      const activeIndex = activeItems.findIndex((t) => t.id === active.id)
      if (activeIndex < 0) return prev

      const moved = { ...activeItems[activeIndex], priority: overContainer }

      // Posicao de insercao na coluna destino.
      let overIndex = overItems.findIndex((t) => t.id === over.id)
      if (overIndex < 0) overIndex = overItems.length

      return {
        ...prev,
        [activeContainer]: activeItems.filter((t) => t.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, overIndex),
          moved,
          ...overItems.slice(overIndex)
        ]
      }
    })
  }

  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e
    const start = startContainer.current
    setActiveId(null)
    startContainer.current = null

    if (!over || !start) {
      isDragging.current = false
      setCols(buildCols(filtered))
      return
    }

    const finalContainer = findContainer(active.id as string)
    if (!finalContainer) {
      isDragging.current = false
      return
    }

    const current = colsRef.current
    const items = current[finalContainer]
    const oldIndex = items.findIndex((t) => t.id === active.id)
    let newIndex = items.findIndex((t) => t.id === over.id)
    if (PRIORITIES.includes(over.id as Priority)) newIndex = items.length - 1
    if (newIndex < 0) newIndex = oldIndex

    const reordered = arrayMove(items, oldIndex, newIndex)
    const next: Cols = { ...current, [finalContainer]: reordered }
    setCols(next)

    // Persiste no IndexedDB.
    const done =
      finalContainer === start
        ? reindexColumn(projectId, finalContainer, reordered.map((t) => t.id))
        : moveTaskAcross({
            projectId,
            fromPriority: start,
            toPriority: finalContainer,
            fromIds: next[start].map((t) => t.id),
            toIds: reordered.map((t) => t.id)
          })

    done.finally(() => {
      isDragging.current = false
    })
  }

  const openTaskMenu = (e: React.MouseEvent, task: Task): void => {
    const items: MenuEntry[] = [
      { label: 'Editar', icon: 'edit', onClick: () => setOpenTask(task) },
      {
        label: 'Concluir',
        icon: 'check_circle',
        onClick: () => {
          completeTask.mutate(task.id)
          showToast('Tarefa concluída')
        }
      },
      'divider',
      {
        label: 'Mover para',
        icon: 'swap_vert',
        submenu: PRIORITIES.map((p) => ({
          label: PRIORITY_LABEL[p],
          disabled: p === task.priority,
          onClick: () => {
            changePriority.mutate({ id: task.id, priority: p })
            showToast(`Movida para ${PRIORITY_LABEL[p]}`)
          }
        }))
      },
      {
        label: 'Duplicar',
        icon: 'content_copy',
        onClick: () => {
          duplicateTask.mutate(task.id)
          showToast('Tarefa duplicada')
        }
      },
      {
        label: 'Copiar título',
        icon: 'content_paste',
        onClick: () => {
          void navigator.clipboard?.writeText(task.title)
          showToast('Título copiado')
        }
      }
    ]

    const noteId = task.noteId
    if (noteId) {
      items.push({
        label: 'Abrir nota vinculada',
        icon: 'sticky_note_2',
        onClick: () => navigate({ to: '/notes', search: { note: noteId } })
      })
    }

    items.push('divider', {
      label: 'Excluir',
      icon: 'delete',
      danger: true,
      onClick: async () => {
        const ok = await confirm({
          title: 'Excluir tarefa',
          message: 'Esta ação não pode ser desfeita.',
          confirmLabel: 'Excluir',
          danger: true
        })
        if (!ok) return
        deleteTask.mutate(task.id)
        showToast('Tarefa excluída')
      }
    })

    openContextMenu(e, items)
  }

  return (
    <div className="board-view">
      <BoardToolbar
        search={search}
        onSearch={setSearch}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        onClearTags={() => setSelectedTags([])}
        dateRange={dateRange}
        onDateRange={setDateRange}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          startContainer.current = null
          isDragging.current = false
          setCols(buildCols(filtered))
        }}
      >
        <div className="board">
          {PRIORITIES.map((p) => (
            <Column
              key={p}
              priority={p}
              tasks={cols[p]}
              projectId={projectId}
              onOpenTask={setOpenTask}
              onContextMenu={openTaskMenu}
              highlightIds={highlightIds}
              onFocusBlockers={setHighlightIds}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div
              className="card"
              style={{ ['--card-accent' as string]: priorityColorVar[activeTask.priority] }}
            >
              <div className="card-flag">
                <Icon name="flag" size={14} />
                <span className="card-flag-label">{PRIORITY_LABEL[activeTask.priority]}</span>
              </div>
              <div className="card-title">{activeTask.title}</div>
              {activeTask.description.trim().length > 0 && (
                <div className="card-desc">{activeTask.description}</div>
              )}
              {(activeTask.tags ?? []).length > 0 && (
                <div className="card-tags">
                  {(activeTask.tags ?? []).map((tag) => {
                    const c = tagColor(tag)
                    return (
                      <span key={tag} className="tag-chip" style={{ background: c.bg, color: c.fg }}>
                        {tag}
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="card-meta">
                <span>Criada {formatDate(activeTask.createdAt)}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTask && <TaskModal task={openTask} onClose={() => setOpenTask(null)} />}
    </div>
  )
}
