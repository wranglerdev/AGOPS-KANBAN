import { useEffect, useMemo, useState } from 'react'
import type { Priority, Task } from '@renderer/db/database'
import { PRIORITIES, PRIORITY_LABEL } from '@renderer/db/database'
import { formatDate, priorityColorVar } from '@renderer/lib/format'
import {
  useActiveTasks,
  useCompleteTask,
  useDeleteTask,
  useUpdateTask
} from '@renderer/hooks/useTasks'
import { useNotes } from '@renderer/hooks/useNotes'
import { useLockBodyScroll } from '@renderer/hooks/useLockBodyScroll'
import { useConfirm } from './ConfirmDialog'
import { useToast } from './Toast'
import { TagInput } from './TagInput'
import { SearchSelect } from './SearchSelect'
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
  const [blockedBy, setBlockedBy] = useState<string[]>(task.blockedBy ?? [])
  const [noteId, setNoteId] = useState<string | null>(task.noteId ?? null)

  const updateTask = useUpdateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const { data: projectTasks = [] } = useActiveTasks(task.projectId)
  const { data: notes = [] } = useNotes()

  // Candidatos a bloqueadoras: tarefas ativas do projeto (a própria é excluída no picker).
  const taskItems = useMemo(
    () => projectTasks.map((t) => ({ id: t.id, label: t.title })),
    [projectTasks]
  )
  const taskById = useMemo(() => new Map(projectTasks.map((t) => [t.id, t])), [projectTasks])
  const noteItems = useMemo(() => notes.map((n) => ({ id: n.id, label: n.title || 'Sem título' })), [notes])
  const linkedNote = noteId ? notes.find((n) => n.id === noteId) ?? null : null

  useLockBodyScroll()

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
      patch: { title: trimmed, description: description.trim(), priority, tags, blockedBy, noteId }
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
      <div className="modal task-modal is-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Editar tarefa</h3>
          <span
            className="badge"
            style={{ background: priorityColorVar[priority] }}
          >
            {PRIORITY_LABEL[priority]}
          </span>
        </div>

        <div className="modal-body">
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

        <div className="field">
          <label>
            <Icon name="lock" size={14} /> Bloqueada por
          </label>
          {blockedBy.length > 0 && (
            <div className="relation-chips">
              {blockedBy.map((id) => {
                const blocker = taskById.get(id)
                return (
                  <span key={id} className="relation-chip">
                    <span className="rc-label">{blocker?.title ?? 'Tarefa removida'}</span>
                    <button
                      type="button"
                      className="rc-remove"
                      title="Remover"
                      onClick={() => setBlockedBy((prev) => prev.filter((b) => b !== id))}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
          <SearchSelect
            items={taskItems}
            excludeIds={[task.id, ...blockedBy]}
            placeholder="Buscar tarefa que bloqueia…"
            emptyLabel="Nenhuma tarefa disponível"
            onPick={(id) => setBlockedBy((prev) => [...prev, id])}
          />
        </div>

        <div className="field">
          <label>
            <Icon name="sticky_note_2" size={14} /> Nota vinculada
          </label>
          {noteId ? (
            <div className="relation-chips">
              <span className="relation-chip">
                <span className="rc-label">{linkedNote?.title || 'Nota removida'}</span>
                <button
                  type="button"
                  className="rc-remove"
                  title="Desvincular"
                  onClick={() => setNoteId(null)}
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            </div>
          ) : (
            <SearchSelect
              items={noteItems}
              placeholder="Buscar nota…"
              emptyLabel="Nenhuma nota"
              onPick={(id) => setNoteId(id)}
            />
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          Criada em {formatDate(task.createdAt)}
        </div>
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
