import { useEffect, useState } from 'react'
import type { Priority, Task } from '@renderer/db/database'
import { PRIORITIES, PRIORITY_LABEL } from '@renderer/db/database'
import { formatDate, priorityColorVar } from '@renderer/lib/format'
import { useCompleteTask, useDeleteTask, useUpdateTask } from '@renderer/hooks/useTasks'
import { useConfirm } from './ConfirmDialog'
import { useToast } from './Toast'
import { TagInput } from './TagInput'
import { Icon } from './Icon'

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
  const [tags, setTags] = useState<string[]>(task.tags ?? [])

  const updateTask = useUpdateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const confirm = useConfirm()
  const { showToast } = useToast()

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
      patch: { title: trimmed, description: description.trim(), priority, tags }
    })
    onClose()
  }

  const complete = (): void => {
    completeTask.mutate(task.id)
    onClose()
  }

  const remove = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Excluir tarefa',
      message: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      danger: true
    })
    if (!ok) return
    deleteTask.mutate(task.id)
    showToast('Tarefa excluída')
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Editar tarefa</h3>
          <span
            className="badge"
            style={{ background: priorityColorVar[priority] }}
          >
            {PRIORITY_LABEL[priority]}
          </span>
        </div>

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

        <div className="field">
          <label>Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          Criada em {formatDate(task.createdAt)}
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={complete}>
            <Icon name="check_circle" size={16} /> Concluir
          </button>
          <button className="btn btn-ghost btn-danger" onClick={remove}>
            <Icon name="delete" size={16} /> Excluir
          </button>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="save" size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
