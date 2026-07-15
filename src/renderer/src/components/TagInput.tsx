import { useState, type KeyboardEvent } from 'react'
import { tagColor } from '@renderer/lib/format'
import { Icon } from './Icon'

export function TagInput({
  tags,
  onChange
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}): JSX.Element {
  const [draft, setDraft] = useState('')

  const addTag = (raw: string): void => {
    const value = raw.trim()
    if (!value) return
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...tags, value])
    setDraft('')
  }

  const removeTag = (tag: string): void => {
    onChange(tags.filter((t) => t !== tag))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="tag-input-row">
      {tags.map((tag) => {
        const c = tagColor(tag)
        return (
          <span
            key={tag}
            className="tag-chip removable"
            style={{ background: c.bg, color: c.fg }}
          >
            {tag}
            <button type="button" className="tag-remove" onClick={() => removeTag(tag)} aria-label={`Remover ${tag}`}>
              <Icon name="close" size={12} />
            </button>
          </span>
        )
      })}
      <input
        className="tag-input"
        value={draft}
        placeholder={tags.length === 0 ? 'digite e Enter...' : ''}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
      />
    </div>
  )
}
