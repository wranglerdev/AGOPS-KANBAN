import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { tagColor } from '@renderer/lib/format'
import { DATE_RANGES, DATE_RANGE_LABEL, type DateRange } from '@renderer/lib/taskFilters'

interface Props {
  search: string
  onSearch: (value: string) => void
  allTags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onClearTags: () => void
  dateRange: DateRange
  onDateRange: (range: DateRange) => void
}

export function BoardToolbar({
  search,
  onSearch,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  dateRange,
  onDateRange
}: Props): JSX.Element {
  const [tagsOpen, setTagsOpen] = useState(false)
  const tagsRef = useRef<HTMLDivElement>(null)

  // Fecha o popover de tags ao clicar fora.
  useEffect(() => {
    if (!tagsOpen) return
    const onDown = (e: MouseEvent): void => {
      if (tagsRef.current && !tagsRef.current.contains(e.target as Node)) setTagsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [tagsOpen])

  return (
    <div className="board-toolbar">
      <div className="toolbar-search">
        <Icon name="search" size={16} className="toolbar-search-icon" />
        <input
          className="input"
          placeholder="Buscar tarefas…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button
            className="icon-btn toolbar-search-clear"
            onClick={() => onSearch('')}
            title="Limpar busca"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      <select
        className="select"
        value={dateRange}
        onChange={(e) => onDateRange(e.target.value as DateRange)}
        title="Filtrar por data de criação"
      >
        {DATE_RANGES.map((r) => (
          <option key={r} value={r}>
            {DATE_RANGE_LABEL[r]}
          </option>
        ))}
      </select>

      <div className="tags-filter" ref={tagsRef}>
        <button
          className={`btn ${selectedTags.length > 0 ? 'btn-active' : ''}`}
          onClick={() => setTagsOpen((o) => !o)}
          disabled={allTags.length === 0}
          title="Filtrar por tags"
        >
          Tags{selectedTags.length > 0 ? ` · ${selectedTags.length}` : ''}
        </button>
        {tagsOpen && (
          <div className="tags-popover">
            <div className="tags-popover-head">
              <span>Filtrar por tags</span>
              {selectedTags.length > 0 && (
                <button className="btn-link" onClick={onClearTags}>
                  Limpar
                </button>
              )}
            </div>
            <div className="tags-popover-list">
              {allTags.map((tag) => {
                const active = selectedTags.includes(tag)
                const c = tagColor(tag)
                return (
                  <button
                    key={tag}
                    className={`tag-chip tag-chip-toggle ${active ? 'active' : ''}`}
                    style={{ background: c.bg, color: c.fg }}
                    onClick={() => onToggleTag(tag)}
                  >
                    {active && <Icon name="check_circle" size={13} />}
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
