import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  useCreateNote,
  useDeleteNote,
  useDuplicateNote,
  useNotes,
  useUpdateNote
} from '@renderer/hooks/useNotes'
import { NoteEditor } from '@renderer/components/NoteEditor'
import { Icon } from '@renderer/components/Icon'
import { useContextMenu, type MenuEntry } from '@renderer/components/ContextMenu'
import { useConfirm } from '@renderer/components/ConfirmDialog'
import { useToast } from '@renderer/components/Toast'
import { exportNoteMd } from '@renderer/lib/exportNote'
import { formatDate } from '@renderer/lib/format'
import type { Note } from '@renderer/db/database'

export function NotesRoute(): JSX.Element {
  const { data: notes = [] } = useNotes()
  const createNote = useCreateNote()
  const duplicateNote = useDuplicateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const { openContextMenu } = useContextMenu()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)

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

  const commitRename = (id: string, title: string): void => {
    setRenamingId(null)
    updateNote.mutate({ id, patch: { title: title.trim() } })
  }

  const openNoteMenu = (e: React.MouseEvent, note: Note): void => {
    const items: MenuEntry[] = [
      { label: 'Abrir', icon: 'visibility', onClick: () => setSelectedId(note.id) },
      { label: 'Renomear', icon: 'edit', onClick: () => setRenamingId(note.id) },
      {
        label: 'Duplicar',
        icon: 'content_copy',
        onClick: async () => {
          const copy = await duplicateNote.mutateAsync(note.id)
          if (copy) setSelectedId(copy.id)
          showToast('Nota duplicada')
        }
      },
      {
        label: 'Exportar .md',
        icon: 'download',
        onClick: () => {
          exportNoteMd(note.title, note.contentMd)
          showToast('Nota exportada')
        }
      },
      {
        label: 'Copiar título',
        icon: 'content_paste',
        onClick: () => {
          void navigator.clipboard?.writeText(note.title)
          showToast('Título copiado')
        }
      },
      'divider',
      {
        label: 'Excluir',
        icon: 'delete',
        danger: true,
        onClick: async () => {
          const ok = await confirm({
            title: 'Excluir nota',
            message: 'Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir',
            danger: true
          })
          if (!ok) return
          deleteNote.mutate(note.id)
          showToast('Nota excluída')
        }
      }
    ]
    openContextMenu(e, items)
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
          {notes.map((n) =>
            renamingId === n.id ? (
              <input
                key={n.id}
                className="note-item note-item-rename"
                defaultValue={n.title}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => commitRename(n.id, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  else if (e.key === 'Escape') {
                    e.currentTarget.value = n.title
                    setRenamingId(null)
                  }
                }}
              />
            ) : (
              <button
                key={n.id}
                className={`note-item ${n.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(n.id)}
                onContextMenu={(e) => openNoteMenu(e, n)}
              >
                <span className="n-title">{n.title || 'Sem título'}</span>
                <span className="n-date">{formatDate(n.updatedAt)}</span>
              </button>
            )
          )}
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
