import { useEffect, useState } from 'react'
import { useCreateProject, useDeleteProject, useProjects } from '@renderer/hooks/useProjects'
import { useSelectedProject } from '@renderer/state/SelectedProject'

export function ProjectSelector(): JSX.Element {
  const { data: projects = [] } = useProjects()
  const { projectId, setProjectId } = useSelectedProject()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  // Garante que sempre haja um projeto selecionado valido.
  useEffect(() => {
    if (projects.length === 0) return
    if (!projectId || !projects.some((p) => p.id === projectId)) {
      setProjectId(projects[0].id)
    }
  }, [projects, projectId, setProjectId])

  const submit = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) {
      setCreating(false)
      return
    }
    const project = await createProject.mutateAsync(trimmed)
    setProjectId(project.id)
    setName('')
    setCreating(false)
  }

  const current = projects.find((p) => p.id === projectId)

  const removeCurrent = (): void => {
    if (!current) return
    if (!confirm(`Excluir o projeto "${current.name}" e todas as suas tarefas?`)) return
    deleteProject.mutate(current.id)
    const next = projects.find((p) => p.id !== current.id)
    setProjectId(next ? next.id : null)
  }

  if (creating) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className="input"
          autoFocus
          placeholder="Nome do projeto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') {
              setCreating(false)
              setName('')
            }
          }}
        />
        <button className="btn btn-primary" onClick={submit}>
          Criar
        </button>
        <button className="btn btn-ghost" onClick={() => setCreating(false)}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        className="select"
        value={projectId ?? ''}
        onChange={(e) => setProjectId(e.target.value || null)}
      >
        {projects.length === 0 && <option value="">Nenhum projeto</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button className="btn" onClick={() => setCreating(true)} title="Novo projeto">
        + Projeto
      </button>
      {current && (
        <button className="btn btn-ghost btn-danger" onClick={removeCurrent} title="Excluir projeto">
          ✕
        </button>
      )}
    </div>
  )
}
