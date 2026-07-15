import { useMemo, useState } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval
} from 'date-fns'
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '@renderer/db/database'
import { useCompletedTasks } from '@renderer/hooks/useTasks'
import { useProjects } from '@renderer/hooks/useProjects'
import { useSelectedProject } from '@renderer/state/SelectedProject'
import { priorityColorVar, formatDateTime } from '@renderer/lib/format'
import { Icon } from '@renderer/components/Icon'

type Period = 'day' | 'week' | 'month'

const PERIOD_LABEL: Record<Period, string> = { day: 'Dia', week: 'Semana', month: 'Mês' }

function intervalFor(period: Period): { start: Date; end: Date } {
  const now = new Date()
  if (period === 'day') return { start: startOfDay(now), end: endOfDay(now) }
  if (period === 'week')
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
  return { start: startOfMonth(now), end: endOfMonth(now) }
}

export function SummaryRoute(): JSX.Element {
  const [period, setPeriod] = useState<Period>('week')
  const [allProjects, setAllProjects] = useState(true)
  const { projectId } = useSelectedProject()
  const { data: projects = [] } = useProjects()

  const scope = allProjects ? undefined : projectId ?? undefined
  const { data: completed = [] } = useCompletedTasks(scope)

  const { start, end } = useMemo(() => intervalFor(period), [period])

  const inPeriod = useMemo(
    () =>
      completed.filter(
        (t) => t.completedAt != null && isWithinInterval(new Date(t.completedAt), { start, end })
      ),
    [completed, start, end]
  )

  const byPriority = useMemo(() => {
    const map: Record<Priority, number> = { urgent: 0, high: 0, medium: 0, low: 0 }
    for (const t of inPeriod) map[t.priority]++
    return map
  }, [inPeriod])

  const projectName = (id: string): string => projects.find((p) => p.id === id)?.name ?? '—'
  const maxByPrio = Math.max(1, ...PRIORITIES.map((p) => byPriority[p]))

  const byProject = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of inPeriod) map.set(t.projectId, (map.get(t.projectId) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [inPeriod])

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Resumo de conclusões</h1>
        <div className="segmented">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              className={period === p ? 'active' : ''}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginLeft: 6 }}
        >
          <input
            type="checkbox"
            checked={allProjects}
            onChange={(e) => setAllProjects(e.target.checked)}
          />
          Todos os projetos
        </label>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <Icon name="task_alt" size={20} className="stat-icon" />
          <div className="stat-value">{inPeriod.length}</div>
          <div className="stat-label">Concluídas ({PERIOD_LABEL[period].toLowerCase()})</div>
        </div>
        <div className="stat">
          <Icon name="priority_high" size={20} className="stat-icon" />
          <div className="stat-value">{byPriority.urgent + byPriority.high}</div>
          <div className="stat-label">Urgentes + Altas</div>
        </div>
        <div className="stat">
          <Icon name="folder" size={20} className="stat-icon" />
          <div className="stat-value">{byProject.length}</div>
          <div className="stat-label">Projetos ativos</div>
        </div>
      </div>

      <h2 className="section-title">Por prioridade</h2>
      <div className="bars">
        {PRIORITIES.map((p) => (
          <div className="bar-row" key={p}>
            <span>{PRIORITY_LABEL[p]}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(byPriority[p] / maxByPrio) * 100}%`,
                  background: priorityColorVar[p]
                }}
              />
            </div>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>{byPriority[p]}</span>
          </div>
        ))}
      </div>

      {allProjects && byProject.length > 0 && (
        <>
          <h2 className="section-title">Por projeto</h2>
          <div className="bars">
            {byProject.map(([id, count]) => (
              <div className="bar-row" key={id}>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={projectName(id)}
                >
                  {projectName(id)}
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(count / (byProject[0]?.[1] || 1)) * 100}%`,
                      background: 'var(--accent)'
                    }}
                  />
                </div>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Tarefas concluídas</h2>
      {inPeriod.length === 0 ? (
        <p
          style={{
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Icon name="checklist" size={18} /> Nenhuma tarefa concluída neste período.
        </p>
      ) : (
        <div className="completed-list">
          {inPeriod
            .slice()
            .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
            .map((t) => (
              <div className="completed-item" key={t.id}>
                <span
                  className="prio-dot"
                  style={{ background: priorityColorVar[t.priority] }}
                />
                <span className="title">{t.title}</span>
                {allProjects && (
                  <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>
                    {projectName(t.projectId)}
                  </span>
                )}
                <span className="when">{formatDateTime(t.completedAt as number)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
