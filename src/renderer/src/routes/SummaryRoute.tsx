import { useCallback, useMemo, useState } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  differenceInCalendarDays
} from 'date-fns'
import { PRIORITIES, PRIORITY_LABEL, type Priority, type Task } from '@renderer/db/database'
import { useCompletedTasks } from '@renderer/hooks/useTasks'
import { useProjects } from '@renderer/hooks/useProjects'
import { useSelectedProject } from '@renderer/state/SelectedProject'
import { priorityColorVar } from '@renderer/lib/format'
import { toCSV } from '@renderer/lib/csv'
import { Icon } from '@renderer/components/Icon'
import { TasksTable } from '@renderer/components/TasksTable'
import { ImportCsvModal } from '@renderer/components/ImportCsvModal'
import { useToast } from '@renderer/components/Toast'

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
  const [importOpen, setImportOpen] = useState(false)
  const [filteredRows, setFilteredRows] = useState<Task[]>([])
  const { projectId } = useSelectedProject()
  const { data: projects = [] } = useProjects()
  const { showToast } = useToast()

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

  const activeProjects = useMemo(() => new Set(inPeriod.map((t) => t.projectId)).size, [inPeriod])
  const maxByPrio = Math.max(1, ...PRIORITIES.map((p) => byPriority[p]))

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const pace = (inPeriod.length / days).toFixed(1)

  const projectName = useCallback(
    (id: string): string => projects.find((p) => p.id === id)?.name ?? '—',
    [projects]
  )

  const exportCsv = (): void => {
    const rows = filteredRows.map((t) => ({
      'Título': t.title,
      Prioridade: PRIORITY_LABEL[t.priority],
      Status: t.completedAt != null ? 'Concluída' : 'Ativa',
      Tags: (t.tags ?? []).join('; '),
      Projeto: projectName(t.projectId),
      'Descrição': t.description ?? '',
      'Criada em': new Date(t.createdAt).toISOString(),
      'Concluída em': t.completedAt != null ? new Date(t.completedAt).toISOString() : ''
    }))
    const csv = toCSV(rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `tarefas-${stamp}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${rows.length} ${rows.length === 1 ? 'tarefa exportada' : 'tarefas exportadas'}`)
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Resumo</h1>
        <div className="segmented">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <label className="all-projects-toggle">
          <input
            type="checkbox"
            checked={allProjects}
            onChange={(e) => setAllProjects(e.target.checked)}
          />
          Todos os projetos
        </label>
        <span className="spacer" />
        <div className="csv-actions">
          <button
            className="btn"
            onClick={exportCsv}
            disabled={filteredRows.length === 0}
            title="Exportar tarefas filtradas para CSV"
          >
            <Icon name="download" size={16} /> Exportar
          </button>
          <button className="btn" onClick={() => setImportOpen(true)} title="Importar tarefas de CSV">
            <Icon name="upload" size={16} /> Importar
          </button>
        </div>
      </div>

      <div className="stat-grid stat-grid-compact">
        <div className="stat">
          <div className="stat-value">{inPeriod.length}</div>
          <div className="stat-label">Concluídas ({PERIOD_LABEL[period].toLowerCase()})</div>
        </div>
        <div className="stat">
          <div className="stat-value">{byPriority.urgent + byPriority.high}</div>
          <div className="stat-label">Urgentes + Altas</div>
        </div>
        <div className="stat">
          <div className="stat-value">{activeProjects}</div>
          <div className="stat-label">Projetos ativos</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {pace}
            <span className="stat-unit">/dia</span>
          </div>
          <div className="stat-label">Pace</div>
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

      <h2 className="section-title">Tarefas</h2>
      <TasksTable scope={scope} allProjects={allProjects} onFilteredChange={setFilteredRows} />

      {importOpen && <ImportCsvModal onClose={() => setImportOpen(false)} />}
    </div>
  )
}
