import { Board } from '@renderer/components/Board'
import { Icon } from '@renderer/components/Icon'
import { useProjects, useCreateProject } from '@renderer/hooks/useProjects'
import { useSelectedProject } from '@renderer/state/SelectedProject'

export function BoardRoute(): JSX.Element {
  const { data: projects = [], isLoading } = useProjects()
  const { projectId, setProjectId } = useSelectedProject()
  const createProject = useCreateProject()

  const create = async (): Promise<void> => {
    const project = await createProject.mutateAsync('Meu projeto')
    setProjectId(project.id)
  }

  if (isLoading) return <div className="empty">Carregando…</div>

  if (projects.length === 0) {
    return (
      <div className="empty">
        <div className="empty-inner">
          <div className="empty-illustration">
            <Icon name="space_dashboard" size={44} />
          </div>
          <h2 style={{ margin: 0 }}>Nenhum projeto ainda</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Crie seu primeiro projeto para começar a adicionar tarefas ao quadro.
          </p>
          <button className="btn btn-primary" onClick={create}>
            <Icon name="add" size={16} /> Criar projeto
          </button>
        </div>
      </div>
    )
  }

  const activeId = projectId && projects.some((p) => p.id === projectId) ? projectId : projects[0].id

  return <Board key={activeId} projectId={activeId} />
}
