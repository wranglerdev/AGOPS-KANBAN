import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useCreateNote, useNotes } from '@renderer/hooks/useNotes'
import { NoteEditor } from '@renderer/components/NoteEditor'
import { Icon } from '@renderer/components/Icon'
import { formatDate } from '@renderer/lib/format'

export function NotesRoute(): JSX.Element {
  const { data: notes = [] } = useNotes()
  const createNote = useCreateNote()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Deep-link vindo do card (Ctrl+clique na nota): pré-seleciona a nota do param `note`.
  const { note: noteParam } = useSearch({ strict: false }) as { note?: string }
  const lastApplied = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (noteParam && noteParam !== lastApplied.current && notes.some((n) => n.id === noteParam)) {
      lastApplied.current = noteParam
      setSelectedId(noteParam)
    }
  }, [noteParam, notes])

  // Mantem uma selecao valida.
  useEffect(() => {
    if (notes.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0].id)
    }
  }, [notes, selectedId])

  const addNote = async (): Promise<void> => {
    const note = await createNote.mutateAsync()
    setSelectedId(note.id)
  }

  const selected = notes.find((n) => n.id === selectedId) ?? null

  return (
    <div className="notes-layout">
      <aside className="notes-sidebar">
        <div className="notes-sidebar-head">
          <strong style={{ flex: 1 }}>Notas</strong>
          <button className="btn btn-primary" style={{ padding: '5px 12px' }} onClick={addNote}>
            <Icon name="add" size={16} /> Nova
          </button>
        </div>
        <div className="notes-list">
          {notes.length === 0 && (
            <div
              style={{
                color: 'var(--text-muted)',
                padding: 12,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Icon name="edit_note" size={16} /> Nenhuma nota. Crie a primeira.
            </div>
          )}
          {notes.map((n) => (
            <button
              key={n.id}
              className={`note-item ${n.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(n.id)}
            >
              <span className="n-title">{n.title || 'Sem título'}</span>
              <span className="n-date">{formatDate(n.updatedAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      {selected ? (
        <NoteEditor key={selected.id} note={selected} />
      ) : (
        <div className="empty">
          <div className="empty-inner">
            <div className="empty-illustration">
              <Icon name="edit_note" size={44} />
            </div>
            <h2 style={{ margin: 0 }}>Sem notas</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Crie uma nota em Markdown, alterne entre editar e ler, e exporte em .md.
            </p>
            <button className="btn btn-primary" onClick={addNote}>
              <Icon name="add" size={16} /> Nova nota
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
