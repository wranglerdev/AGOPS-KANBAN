import { useEffect, useRef, useState } from 'react'
import type { Project } from '@renderer/db/database'
import { Icon } from './Icon'

interface Props {
  projects: Project[]
  /** Ids selecionados. Vazio = todos os projetos. */
  selected: string[]
  onChange: (ids: string[]) => void
}

/**
 * Dropdown de múltipla seleção de projetos. O array vazio representa
 * "todos os projetos" (default), evitando estados inválidos sem seleção.
 */
export function ProjectMultiSelect({ projects, selected, onChange }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggle = (id: string): void =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  const isAll = selected.length === 0
  const label = isAll
    ? 'Todos os projetos'
    : selected.length === 1
      ? (projects.find((p) => p.id === selected[0])?.name ?? '1 projeto')
      : `${selected.length} projetos`

  return (
    <div className="project-multiselect" ref={ref}>
      <button
        className={`btn ${!isAll ? 'btn-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Filtrar por projetos"
      >
        <Icon name="folder" size={16} />
        <span className="pms-label">{label}</span>
        <span className="pms-caret">▾</span>
      </button>
      {open && (
        <div className="pms-popover">
          <div className="pms-head">
            <span>Projetos</span>
            {!isAll && (
              <button className="btn-link" onClick={() => onChange([])}>
                Todos
              </button>
            )}
          </div>
          <div className="pms-list">
            {projects.length === 0 && <div className="pms-empty">Nenhum projeto.</div>}
            {projects.map((p) => {
              const active = isAll || selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  className={`pms-item ${active ? 'active' : ''}`}
                  onClick={() => toggle(p.id)}
                >
                  <span className="pms-check">
                    {selected.includes(p.id) && <Icon name="check_circle" size={15} />}
                  </span>
                  <span className="pms-name">{p.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
