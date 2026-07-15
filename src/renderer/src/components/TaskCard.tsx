import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@renderer/db/database'
import { priorityColorVar, formatDate, tagColor } from '@renderer/lib/format'
import { Icon } from './Icon'

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
  const tags = task.tags ?? []

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
      {tags.length > 0 && (
        <div className="card-tags">
          {tags.map((tag) => {
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
        <span>Criada {formatDate(task.createdAt)}</span>
        {hasDesc && (
          <span className="card-desc-flag" title="Tem descrição">
            <Icon name="notes" size={14} />
          </span>
        )}
      </div>
    </div>
  )
}
