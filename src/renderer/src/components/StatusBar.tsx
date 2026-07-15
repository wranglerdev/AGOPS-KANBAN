import { useMemo } from 'react'
import { useProjects } from '@renderer/hooks/useProjects'
import { useActiveTasks, useCompletedTasks } from '@renderer/hooks/useTasks'
import { useSelectedProject } from '@renderer/state/SelectedProject'
import { PACE_WINDOW_MS } from '@renderer/lib/taskFilters'

export function StatusBar(): JSX.Element {
  const { data: projects = [] } = useProjects()
  const { projectId } = useSelectedProject()

  // Mesma resolucao do BoardRoute: selecionado valido, senao o primeiro.
  const activeId =
    projectId && projects.some((p) => p.id === projectId) ? projectId : projects[0]?.id ?? null

  const { data: active = [] } = useActiveTasks(activeId)
  const { data: completed = [] } = useCompletedTasks(activeId ?? undefined)

  const { urgent, high, pace } = useMemo(() => {
    const cutoff = Date.now() - PACE_WINDOW_MS
    return {
      urgent: active.filter((t) => t.priority === 'urgent').length,
      high: active.filter((t) => t.priority === 'high').length,
      pace: completed.filter((t) => (t.completedAt ?? 0) >= cutoff).length
    }
  }, [active, completed])

  return (
    <footer className="statusbar">
      {activeId ? (
        <>
          <span className="statusbar-item" title="Tarefas concluídas nos últimos 7 dias">
            ⚡ {pace}/7d
          </span>
          <span
            className="statusbar-item"
            title="Tarefas urgentes abertas"
          >
            <span className="dot dot-urgent" />
            {urgent} urgentes
          </span>
          <span className="statusbar-item" title="Tarefas de prioridade alta abertas">
            <span className="dot dot-high" />
            {high} alta
          </span>
        </>
      ) : (
        <span className="statusbar-item statusbar-empty">—</span>
      )}
    </footer>
  )
}
