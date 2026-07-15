import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Note } from '@renderer/db/database'
import { useDeleteNote, useUpdateNote } from '@renderer/hooks/useNotes'
import { useConfirm } from './ConfirmDialog'
import { useToast } from './Toast'
import { Icon } from './Icon'

function sanitizeFileName(name: string): string {
  return (name.trim() || 'nota').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)
}

export function NoteEditor({ note }: { note: Note }): JSX.Element {
  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.contentMd)
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recarrega ao trocar de nota.
  useEffect(() => {
    setTitle(note.title)
    setContent(note.contentMd)
    setMode('edit')
  }, [note.id])

  // Autosave (debounce).
  useEffect(() => {
    if (title === note.title && content === note.contentMd) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNote.mutate({ id: note.id, patch: { title, contentMd: content } })
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content])

  const exportMd = async (): Promise<void> => {
    const fileName = sanitizeFileName(title)
    // Download via Blob.
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Nota exportada')
  }

  const remove = async (): Promise<void> => {
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

  return (
    <div className="note-editor">
      <div className="note-editor-head">
        <input
          className="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da nota"
        />
        <div className="segmented">
          <button
            className={mode === 'edit' ? 'active' : ''}
            onClick={() => setMode('edit')}
          >
            <Icon name="edit" size={15} /> Editar
          </button>
          <button
            className={mode === 'read' ? 'active' : ''}
            onClick={() => setMode('read')}
          >
            <Icon name="visibility" size={15} /> Ler
          </button>
        </div>
        <button className="btn" onClick={exportMd}>
          <Icon name="download" size={16} /> Exportar .md
        </button>
        <button className="btn btn-ghost btn-danger" onClick={remove}>
          <Icon name="delete" size={16} /> Excluir
        </button>
      </div>

      <div className="note-body">
        {mode === 'edit' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Escreva em Markdown..."
            spellCheck={false}
          />
        ) : (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
