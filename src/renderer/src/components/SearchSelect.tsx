import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { Icon } from './Icon'

export interface SearchItem {
  id: string
  label: string
}

/**
 * Picker: input de texto que abre um popover com a lista filtrada por Fuse
 * apenas enquanto o usuário digita. Fecha ao selecionar, sair (blur/click fora)
 * ou pressionar Esc. Usado para vincular tarefas bloqueadoras e notas.
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
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

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
    if (!q) return []
    return fuse.search(q).map((r) => r.item).slice(0, 8)
  }, [query, fuse])

  // Popover só aparece quando há texto digitado.
  const showPopover = open && query.trim().length > 0

  useEffect(() => {
    setActive(0)
  }, [query])

  // Fecha ao clicar fora do componente.
  useEffect(() => {
    if (!showPopover) return
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showPopover])

  const pick = (id: string): void => {
    onPick(id)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      if (showPopover) {
        e.stopPropagation()
        setOpen(false)
      }
      return
    }
    if (!showPopover) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = results[active]
      if (it) pick(it.id)
    }
  }

  return (
    <div className="search-select" ref={rootRef}>
      <div className="toolbar-search">
        <Icon name="search" size={16} className="toolbar-search-icon" />
        <input
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showPopover && (
        <div className="search-select-popover">
          {results.length === 0 ? (
            <div className="search-select-empty">{emptyLabel}</div>
          ) : (
            results.map((it, i) => (
              <button
                key={it.id}
                type="button"
                className={'search-select-item' + (i === active ? ' is-active' : '')}
                // mousedown para selecionar antes do blur fechar o popover
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(it.id)
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="ss-label">{it.label}</span>
                <Icon name="add" size={14} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
