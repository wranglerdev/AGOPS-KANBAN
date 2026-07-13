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
import type { Priority, Task } from '@renderer/db/database'
import { PRIORITIES } from '@renderer/db/database'
import { useActiveTasks } from '@renderer/hooks/useTasks'
import { moveTaskAcross, reindexColumn } from '@renderer/db/api'
import { Column } from './Column'
import { TaskModal } from './TaskModal'
import { priorityColorVar, formatDate } from '@renderer/lib/format'

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

  const colsRef = useRef(cols)
  colsRef.current = cols
  const startContainer = useRef<Priority | null>(null)
  const isDragging = useRef(false)

  // Sincroniza estado local com o banco quando nao estamos arrastando.
  useEffect(() => {
    if (!isDragging.current) setCols(buildCols(tasks))
  }, [tasks])

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
      setCols(buildCols(tasks))
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

  return (
    <>
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
          setCols(buildCols(tasks))
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
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div
              className="card"
              style={{ ['--card-accent' as string]: priorityColorVar[activeTask.priority] }}
            >
              <div className="card-title">{activeTask.title}</div>
              <div className="card-meta">
                <span>Criada {formatDate(activeTask.createdAt)}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTask && <TaskModal task={openTask} onClose={() => setOpenTask(null)} />}
    </>
  )
}
