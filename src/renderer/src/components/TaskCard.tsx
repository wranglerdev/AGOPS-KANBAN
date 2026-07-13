import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@renderer/db/database'
import { priorityColorVar, formatDate } from '@renderer/lib/format'

export function TaskCard({
  task,
  onOpen
}: {
  task: Task
  onOpen: (task: Task) => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', priority: task.priority }
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ['--card-accent' as string]: priorityColorVar[task.priority]
  }

  const hasDesc = task.description.trim().length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onOpen(task)
      }}
    >
      <div className="card-title">{task.title}</div>
      <div className="card-meta">
        <span>Criada {formatDate(task.createdAt)}</span>
        {hasDesc && <span className="card-desc-flag" title="Tem descrição">📝</span>}
      </div>
    </div>
  )
}
