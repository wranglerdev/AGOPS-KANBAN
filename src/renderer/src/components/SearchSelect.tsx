import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { Icon } from './Icon'

export interface SearchItem {
  id: string
  label: string
}

/**
 * Picker simples: input de texto + lista filtrada por Fuse sobre `label`.
 * Usado para vincular tarefas bloqueadoras e notas no diálogo de tarefa.
 */
export function SearchSelect({
  items,
  excludeIds = [],
  placeholder,
  emptyLabel = 'Nada encontrado',
  onPick
}: {
  items: SearchItem[]
  excludeIds?: string[]
  placeholder?: string
  emptyLabel?: string
  onPick: (id: string) => void
}): JSX.Element {
  const [query, setQuery] = useState('')

  const candidates = useMemo(() => {
    const exclude = new Set(excludeIds)
    return items.filter((it) => !exclude.has(it.id))
  }, [items, excludeIds])

  const fuse = useMemo(
    () => new Fuse(candidates, { keys: ['label'], threshold: 0.4, ignoreLocation: true }),
    [candidates]
  )

  const results = useMemo(() => {
    const q = query.trim()
    const list = q ? fuse.search(q).map((r) => r.item) : candidates
    return list.slice(0, 6)
  }, [query, fuse, candidates])

  const pick = (id: string): void => {
    onPick(id)
    setQuery('')
  }

  return (
    <div className="search-select">
      <div className="toolbar-search">
        <Icon name="search" size={16} className="toolbar-search-icon" />
        <input
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="search-select-list">
        {results.length === 0 ? (
          <div className="search-select-empty">{emptyLabel}</div>
        ) : (
          results.map((it) => (
            <button
              key={it.id}
              type="button"
              className="search-select-item"
              onClick={() => pick(it.id)}
            >
              <span className="ss-label">{it.label}</span>
              <Icon name="add" size={14} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
