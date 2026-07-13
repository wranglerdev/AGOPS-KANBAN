import { useState } from 'react'
import type { Priority } from '@renderer/db/database'
import { useCreateTask } from '@renderer/hooks/useTasks'

export function QuickAdd({
  projectId,
  priority
}: {
  projectId: string
  priority: Priority
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const createTask = useCreateTask()

  const add = (keepOpen: boolean): void => {
    const title = value.trim()
    if (title) {
      createTask.mutate({ projectId, priority, title })
    }
    setValue('')
    if (!keepOpen) setOpen(false)
  }

  if (!open) {
    return (
      <div className="quickadd">
        <button className="quickadd-btn" onClick={() => setOpen(true)}>
          + Adicionar tarefa
        </button>
      </div>
    )
  }

  return (
    <div className="quickadd">
      <textarea
        autoFocus
        rows={2}
        placeholder="Título da tarefa e Enter..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            add(true) // estilo Trello: continua adicionando
          }
          if (e.key === 'Escape') {
            setValue('')
            setOpen(false)
          }
        }}
        onBlur={() => add(false)}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          className="btn btn-primary"
          style={{ padding: '5px 12px' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => add(true)}
        >
          Adicionar
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: '5px 10px' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setValue('')
            setOpen(false)
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
