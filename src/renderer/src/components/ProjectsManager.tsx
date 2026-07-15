import { useEffect, useState } from 'react'
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useRenameProject
} from '@renderer/hooks/useProjects'
import { useSelectedProject } from '@renderer/state/SelectedProject'
import { useConfirm } from './ConfirmDialog'
import { useToast } from './Toast'
import { Icon } from './Icon'

export function ProjectsManager({ onClose }: { onClose: () => void }): JSX.Element {
  const { data: projects = [] } = useProjects()
  const { projectId, setProjectId } = useSelectedProject()
  const createProject = useCreateProject()
  const renameProject = useRenameProject()
  const deleteProject = useDeleteProject()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !editingId) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editingId])

  const create = async (): Promise<void> => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const project = await createProject.mutateAsync(trimmed)
    setProjectId(project.id)
    setNewName('')
    showToast('Projeto criado')
  }

  const startEdit = (id: string, name: string): void => {
    setEditingId(id)
    setEditingName(name)
  }

  const saveEdit = async (): Promise<void> => {
    if (!editingId) return
    const trimmed = editingName.trim()
    if (trimmed) {
      await renameProject.mutateAsync({ id: editingId, name: trimmed })
      showToast('Projeto renomeado')
    }
    setEditingId(null)
    setEditingName('')
  }

  const remove = async (id: string, name: string): Promise<void> => {
    const ok = await confirm({
      title: 'Excluir projeto',
      message: `Excluir o projeto "${name}" e todas as suas tarefas? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true
    })
    if (!ok) return
    await deleteProject.mutateAsync(id)
    if (projectId === id) {
      const next = projects.find((p) => p.id !== id)
      setProjectId(next ? next.id : null)
    }
    showToast('Projeto excluído')
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Gerenciar projetos</h3>

        <div className="projects-list">
          {projects.length === 0 && (
            <div className="projects-empty">Nenhum projeto ainda. Crie o primeiro abaixo.</div>
          )}
          {projects.map((p) => (
            <div key={p.id} className="project-row">
              {editingId === p.id ? (
                <input
                  className="input"
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') {
                      setEditingId(null)
                      setEditingName('')
                    }
                  }}
                  onBlur={saveEdit}
                />
              ) : (
                <span className="project-name">{p.name}</span>
              )}

              {editingId === p.id ? (
                <button className="icon-btn" onClick={saveEdit} title="Salvar">
                  <Icon name="save" size={16} />
                </button>
              ) : (
                <>
                  <button
                    className="icon-btn"
                    onClick={() => startEdit(p.id, p.name)}
                    title="Renomear"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => remove(p.id, p.name)}
                    title="Excluir"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="projects-create">
          <input
            className="input"
            placeholder="Novo projeto..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
            }}
          />
          <button className="btn btn-primary" onClick={create}>
            <Icon name="add" size={16} /> Criar
          </button>
        </div>

        <div className="modal-actions">
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
