import { useEffect, useState } from 'react'
import type { Priority, Task } from '@renderer/db/database'
import { PRIORITIES, PRIORITY_LABEL } from '@renderer/db/database'
import { formatDate } from '@renderer/lib/format'
import { useCompleteTask, useDeleteTask, useUpdateTask } from '@renderer/hooks/useTasks'

export function TaskModal({
  task,
  onClose
}: {
  task: Task
  onClose: () => void
}): JSX.Element {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<Priority>(task.priority)

  const updateTask = useUpdateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = (): void => {
    const trimmed = title.trim()
    if (!trimmed) return
    updateTask.mutate({
      id: task.id,
      patch: { title: trimmed, description: description.trim(), priority }
    })
    onClose()
  }

  const complete = (): void => {
    completeTask.mutate(task.id)
    onClose()
  }

  const remove = (): void => {
    if (!confirm('Excluir esta tarefa?')) return
    deleteTask.mutate(task.id)
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Editar tarefa</h3>

        <div className="field">
          <label>Título</label>
          <input
            className="input"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea
            className="textarea"
            rows={5}
            value={description}
            placeholder="Detalhes (opcional)"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Prioridade</label>
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          Criada em {formatDate(task.createdAt)}
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={complete}>
            ✓ Concluir
          </button>
          <button className="btn btn-ghost btn-danger" onClick={remove}>
            Excluir
          </button>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
