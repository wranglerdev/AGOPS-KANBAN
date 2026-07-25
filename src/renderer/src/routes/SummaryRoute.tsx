import { useCallback, useEffect, useMemo, useState } from 'react'
import { PRIORITY_LABEL, type Priority, type Task } from '@renderer/db/database'
import { useCompletedTasks } from '@renderer/hooks/useTasks'
import { useProjects } from '@renderer/hooks/useProjects'
import { toCSV } from '@renderer/lib/csv'
import { Icon } from '@renderer/components/Icon'
import { TasksTable } from '@renderer/components/TasksTable'
import { Heatmap } from '@renderer/components/Heatmap'
import { ProjectMultiSelect } from '@renderer/components/ProjectMultiSelect'
import { ImportCsvModal } from '@renderer/components/ImportCsvModal'
import { useToast } from '@renderer/components/Toast'

const RANGES = [1, 3, 6, 12] as const
type Range = (typeof RANGES)[number]
const RANGE_LABEL: Record<Range, string> = { 1: '1 mês', 3: '3 meses', 6: '6 meses', 12: '1 ano' }

const RANGE_STORAGE_KEY = 'summary.heatmapMonths'
const isRange = (n: number): n is Range => (RANGES as readonly number[]).includes(n)

export function SummaryRoute(): JSX.Element {
  const [months, setMonths] = useState<Range>(() => {
    const stored = Number(localStorage.getItem(RANGE_STORAGE_KEY))
    return isRange(stored) ? stored : 6
  })

  useEffect(() => {
    localStorage.setItem(RANGE_STORAGE_KEY, String(months))
  }, [months])
  const [projectIds, setProjectIds] = useState<string[]>([]) // vazio = todos
  const [importOpen, setImportOpen] = useState(false)
  const [filteredRows, setFilteredRows] = useState<Task[]>([])
  const { data: projects = [] } = useProjects()
  const { showToast } = useToast()

  // Todas as concluídas; o filtro por projeto acontece no cliente (multi-select).
  const { data: completedAll = [] } = useCompletedTasks(undefined)

  const completed = useMemo(
    () =>
      projectIds.length === 0
        ? completedAll
        : completedAll.filter((t) => projectIds.includes(t.projectId)),
    [completedAll, projectIds]
  )

  const rangeStart = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).getTime()
  }, [months])
  const inRange = useMemo(
    () => completed.filter((t) => t.completedAt != null && t.completedAt >= rangeStart),
    [completed, rangeStart]
  )

  const byPriority = useMemo(() => {
    const map: Record<Priority, number> = { urgent: 0, high: 0, medium: 0, low: 0 }
    for (const t of inRange) map[t.priority]++
    return map
  }, [inRange])

  const days = Math.max(1, Math.round(months * 30.4))
  const pace = (inRange.length / days).toFixed(1)

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

  const scope = projectIds.length === 1 ? projectIds[0] : undefined
  const allProjects = projectIds.length !== 1

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Resumo</h1>
        <ProjectMultiSelect projects={projects} selected={projectIds} onChange={setProjectIds} />
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

      <div className="summary-top">
        <div className="summary-metrics">
          <div className="kpi">
            <span className="kpi-value">{inRange.length}</span>
            <span className="kpi-label">Concluídas</span>
          </div>
          <div className="kpi">
            <span className="kpi-value">{byPriority.urgent + byPriority.high}</span>
            <span className="kpi-label">Urgentes + Altas</span>
          </div>
          <div className="kpi">
            <span className="kpi-value">
              {pace}
              <span className="kpi-unit">/dia</span>
            </span>
            <span className="kpi-label">Pace médio</span>
          </div>
        </div>

        <div className="summary-heatmap">
          <div className="section-head">
            <h2 className="section-title">Atividade de conclusão</h2>
            <div className="segmented">
              {RANGES.map((r) => (
                <button
                  key={r}
                  className={months === r ? 'active' : ''}
                  onClick={() => setMonths(r)}
                >
                  {RANGE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <Heatmap tasks={completed} months={months} />
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 24 }}>
        Tarefas
      </h2>
      <TasksTable
        scope={scope}
        allProjects={allProjects}
        projectIds={projectIds}
        onFilteredChange={setFilteredRows}
      />

      {importOpen && <ImportCsvModal onClose={() => setImportOpen(false)} />}
    </div>
  )
}
