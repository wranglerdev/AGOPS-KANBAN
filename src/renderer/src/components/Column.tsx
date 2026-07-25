import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Priority, Task } from '@renderer/db/database'
import { PRIORITY_LABEL } from '@renderer/db/database'
import { priorityColorVar } from '@renderer/lib/format'
import { TaskCard } from './TaskCard'
import { QuickAdd } from './QuickAdd'
import { Icon } from './Icon'

export function Column({
  priority,
  tasks,
  projectId,
  onOpenTask,
  onContextMenu,
  highlightIds,
  onFocusBlockers
}: {
  priority: Priority
  tasks: Task[]
  projectId: string
  onOpenTask: (task: Task) => void
  onContextMenu: (e: React.MouseEvent, task: Task) => void
  highlightIds: Set<string> | null
  onFocusBlockers: (ids: Set<string> | null) => void
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: priority, data: { type: 'column', priority } })

  return (
    <div className="column">
      <div className="column-head">
        <span className="prio-dot" style={{ background: priorityColorVar[priority] }} />
        <span className="column-title">{PRIORITY_LABEL[priority]}</span>
        <span className="column-count">{tasks.length}</span>
      </div>

      <QuickAdd projectId={projectId} priority={priority} />

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`column-body ${isOver ? 'drop-active' : ''}`}>
          {tasks.length === 0 ? (
            <div className="column-empty">
              <Icon name="inbox" size={22} />
              <span>Sem tarefas</span>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                onContextMenu={onContextMenu}
                highlightIds={highlightIds}
                onFocusBlockers={onFocusBlockers}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}
