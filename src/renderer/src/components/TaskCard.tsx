import { useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from '@tanstack/react-router'
import type { Task } from '@renderer/db/database'
import { PRIORITY_LABEL } from '@renderer/db/database'
import { priorityColorVar, formatDate, tagColor } from '@renderer/lib/format'
import { useNotes } from '@renderer/hooks/useNotes'
import { Icon } from './Icon'

const HOVER_DELAY = 300

export function TaskCard({
  task,
  onOpen,
  onContextMenu,
  highlightIds,
  onFocusBlockers
}: {
  task: Task
  onOpen: (task: Task) => void
  onContextMenu: (e: React.MouseEvent, task: Task) => void
  highlightIds: Set<string> | null
  onFocusBlockers: (ids: Set<string> | null) => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', priority: task.priority }
  })

  const navigate = useNavigate()
  const { data: notes = [] } = useNotes()
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ['--card-accent' as string]: priorityColorVar[task.priority]
  }

  const hasDesc = task.description.trim().length > 0
  const tags = task.tags ?? []
  const blockedBy = task.blockedBy ?? []
  const isBlocked = blockedBy.length > 0
  const linkedNote = task.noteId ? notes.find((n) => n.id === task.noteId) ?? null : null

  const dimmed = highlightIds != null && !highlightIds.has(task.id)

  const openNote = (e: React.MouseEvent): void => {
    if (!task.noteId) return
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation()
      navigate({ to: '/notes', search: { note: task.noteId } })
    }
  }

  const startFocus = (): void => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      onFocusBlockers(new Set([task.id, ...blockedBy]))
    }, HOVER_DELAY)
  }

  const endFocus = (): void => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    onFocusBlockers(null)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''} ${dimmed ? 'focus-dim' : ''}`}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onOpen(task)
      }}
      onContextMenu={(e) => onContextMenu(e, task)}
    >
      <div className="card-flag">
      <div className="card-title">{task.title}</div>

        <button
          className="card-menu"
          title="Opções"
          aria-label="Opções da tarefa"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(e, task)
          }}
        >
          <Icon name="more_vert" size={18} />
        </button>
      </div>
      
      {hasDesc && <div className="card-desc">{task.description}</div>}
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
      {(linkedNote || isBlocked) && (
        <div className="card-icons">
          {linkedNote && (
            <span
              className="card-icon card-icon-action"
              title={`Nota: ${linkedNote.title || 'Sem título'} (Ctrl+clique para abrir)`}
              onClick={openNote}
            >
              <Icon name="sticky_note_2" size={15} />
            </span>
          )}
          {isBlocked && (
            <span
              className="card-icon card-icon-lock"
              title="Bloqueada — passe o mouse para ver as bloqueadoras"
              onMouseEnter={startFocus}
              onMouseLeave={endFocus}
            >
              <Icon name="lock" size={15} />
            </span>
          )}
        </div>
      )}
      <div className="card-meta">
        <span>Criada {formatDate(task.createdAt)}</span>
      </div>
    </div>
  )
}
