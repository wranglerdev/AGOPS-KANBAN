import { useEffect, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  useCreateNote,
  useDeleteNote,
  useDuplicateNote,
  useImportNote,
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
  const importNote = useImportNote()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const { openContextMenu } = useContextMenu()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

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

  // Importa arquivos .md/.txt arrastados para a área de notas.
  const SUPPORTED = /\.(md|markdown|txt)$/i

  const importFiles = async (files: File[]): Promise<void> => {
    const supported = files.filter((f) => SUPPORTED.test(f.name))
    const rejected = files.length - supported.length

    let lastId: string | null = null
    for (const file of supported) {
      const text = await file.text()
      const title = file.name.replace(/\.[^.]+$/, '')
      const note = await importNote.mutateAsync({ title, contentMd: text })
      lastId = note.id
    }

    if (lastId) {
      setSelectedId(lastId)
      showToast(
        supported.length === 1
          ? 'Nota importada'
          : `${supported.length} notas importadas`
      )
    }
    if (rejected > 0 && supported.length === 0) {
      showToast('Arquivo não suportado. Use .md ou .txt.')
    } else if (rejected > 0) {
      showToast(`${rejected} arquivo(s) ignorado(s): apenas .md ou .txt.`)
    }
  }

  const onDragEnter = (e: React.DragEvent): void => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  const onDragOver = (e: React.DragEvent): void => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeave = (e: React.DragEvent): void => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setDragging(false)
    }
  }

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) void importFiles(files)
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
    <div
      className={`notes-layout ${dragging ? 'is-dragover' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="notes-dropzone">
          <div className="notes-dropzone-inner">
            <Icon name="download" size={40} />
            <strong>Solte para importar</strong>
            <span>Arquivos .md ou .txt viram notas</span>
          </div>
        </div>
      )}
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
