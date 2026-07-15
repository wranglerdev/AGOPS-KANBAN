import { useEffect, useMemo, useState } from 'react'
import type { Priority } from '@renderer/db/database'
import { PRIORITY_LABEL } from '@renderer/db/database'
import { parseCSV } from '@renderer/lib/csv'
import type { ImportRow } from '@renderer/db/api'
import { priorityColorVar } from '@renderer/lib/format'
import { useImportTasks } from '@renderer/hooks/useTasks'
import { useProjects } from '@renderer/hooks/useProjects'
import { useSelectedProject } from '@renderer/state/SelectedProject'
import { useToast } from './Toast'
import { Icon } from './Icon'

// Campos-alvo mapeaveis. `title` e obrigatorio.
type Field = 'title' | 'priority' | 'description' | 'tags' | 'projectName' | 'createdAt' | 'completedAt'

const FIELDS: { key: Field; label: string; required?: boolean }[] = [
  { key: 'title', label: 'Título', required: true },
  { key: 'priority', label: 'Prioridade' },
  { key: 'description', label: 'Descrição' },
  { key: 'tags', label: 'Tags' },
  { key: 'projectName', label: 'Projeto' },
  { key: 'createdAt', label: 'Criada em' },
  { key: 'completedAt', label: 'Concluída em' }
]

const IGNORE = '__ignore__'

// Palavras-chave por campo para auto-mapeamento (sem acento, minusculo).
const AUTO: Record<Field, string[]> = {
  title: ['titulo', 'title', 'tarefa', 'nome'],
  priority: ['prioridade', 'priority'],
  description: ['descricao', 'description', 'detalhes'],
  tags: ['tags', 'etiquetas', 'labels'],
  projectName: ['projeto', 'project'],
  createdAt: ['criada em', 'criada', 'created', 'criacao'],
  completedAt: ['concluida em', 'concluida', 'completed', 'conclusao']
}

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

function normalizePriority(raw?: string): Priority {
  const v = norm(raw ?? '')
  if (v === 'urgent' || v === 'urgente') return 'urgent'
  if (v === 'high' || v === 'alta') return 'high'
  if (v === 'low' || v === 'baixa') return 'low'
  return 'medium'
}

function parseDate(raw?: string): number | null {
  const s = raw?.trim()
  if (!s) return null
  // dd/mm/yyyy [hh:mm]
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/)
  if (m) {
    const [, d, mo, y, h = '0', mi = '0'] = m
    const year = y.length === 2 ? 2000 + Number(y) : Number(y)
    const dt = new Date(year, Number(mo) - 1, Number(d), Number(h), Number(mi))
    return isNaN(dt.getTime()) ? null : dt.getTime()
  }
  const iso = Date.parse(s)
  return isNaN(iso) ? null : iso
}

function splitTags(raw?: string): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[;,]/)) {
    const t = part.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

export function ImportCsvModal({ onClose }: { onClose: () => void }): JSX.Element {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [mapping, setMapping] = useState<Record<Field, string>>({
    title: IGNORE,
    priority: IGNORE,
    description: IGNORE,
    tags: IGNORE,
    projectName: IGNORE,
    createdAt: IGNORE,
    completedAt: IGNORE
  })

  const importTasks = useImportTasks()
  const { data: projects = [] } = useProjects()
  const { projectId } = useSelectedProject()
  const { showToast } = useToast()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onFile = async (file: File): Promise<void> => {
    setError('')
    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      if (parsed.headers.length === 0) {
        setError('CSV vazio ou inválido.')
        return
      }
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setFileName(file.name)
      // Auto-mapeamento por nome de coluna.
      const auto: Record<Field, string> = { ...mapping }
      for (const { key } of FIELDS) {
        const found = parsed.headers.find((h) => AUTO[key].some((kw) => norm(h).includes(kw)))
        auto[key] = found ?? IGNORE
      }
      setMapping(auto)
    } catch {
      setError('Não foi possível ler o arquivo.')
    }
  }

  const colIndex = (field: Field): number =>
    mapping[field] === IGNORE ? -1 : headers.indexOf(mapping[field])

  const importRows = useMemo<ImportRow[]>(() => {
    const tIdx = colIndex('title')
    if (tIdx < 0) return []
    const pIdx = colIndex('priority')
    const dIdx = colIndex('description')
    const tagIdx = colIndex('tags')
    const projIdx = colIndex('projectName')
    const createdIdx = colIndex('createdAt')
    const completedIdx = colIndex('completedAt')
    const out: ImportRow[] = []
    for (const r of rows) {
      const title = (r[tIdx] ?? '').trim()
      if (!title) continue
      out.push({
        title,
        priority: pIdx >= 0 ? normalizePriority(r[pIdx]) : undefined,
        description: dIdx >= 0 ? r[dIdx] : undefined,
        tags: tagIdx >= 0 ? splitTags(r[tagIdx]) : undefined,
        projectName: projIdx >= 0 ? r[projIdx]?.trim() : undefined,
        createdAt: createdIdx >= 0 ? parseDate(r[createdIdx]) ?? undefined : undefined,
        completedAt: completedIdx >= 0 ? parseDate(r[completedIdx]) : undefined
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, headers, mapping])

  const hasTitle = mapping.title !== IGNORE
  const doneCount = importRows.filter((r) => r.completedAt != null).length
  const newProjects = useMemo(() => {
    const existing = new Set(projects.map((p) => p.name.trim().toLowerCase()))
    const names = new Set<string>()
    for (const r of importRows) {
      const n = r.projectName?.trim().toLowerCase()
      if (n && !existing.has(n)) names.add(n)
    }
    return names.size
  }, [importRows, projects])

  const canImport = hasTitle && importRows.length > 0 && !importTasks.isPending

  const run = async (): Promise<void> => {
    const res = await importTasks.mutateAsync({
      rows: importRows,
      fallbackProjectId: projectId ?? projects[0]?.id
    })
    showToast(
      `${res.created} ${res.created === 1 ? 'tarefa importada' : 'tarefas importadas'}` +
        (res.projectsCreated > 0 ? ` · ${res.projectsCreated} projeto(s) novo(s)` : '')
    )
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Importar CSV</h3>
        </div>

        <div className="field">
          <label>Arquivo</label>
          <label className="file-drop">
            <Icon name="upload" size={18} />
            <span>{fileName || 'Selecionar arquivo .csv'}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
          </label>
          {error && <p className="import-error">{error}</p>}
        </div>

        {headers.length > 0 && (
          <>
            <div className="field">
              <label>Mapear campos</label>
              <div className="field-map-grid">
                {FIELDS.map((f) => (
                  <div key={f.key} className="field-map-row">
                    <span className="field-map-label">
                      {f.label}
                      {f.required && <span className="req">*</span>}
                    </span>
                    <select
                      className="select"
                      value={mapping[f.key]}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                      }
                    >
                      <option value={IGNORE}>— ignorar</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <p className="import-summary">
              <strong>{importRows.length}</strong> tarefa(s) serão importadas
              {doneCount > 0 && <> · {doneCount} concluída(s)</>}
              {newProjects > 0 && <> · {newProjects} projeto(s) novo(s)</>}
              {!hasTitle && <span className="req"> · mapeie a coluna de Título</span>}
            </p>

            {importRows.length > 0 && (
              <div className="import-preview">
                <div className="import-preview-head">Prévia</div>
                {importRows.slice(0, 5).map((r, i) => (
                  <div key={i} className="import-preview-row">
                    <span
                      className="prio-dot"
                      style={{ background: priorityColorVar[r.priority ?? 'medium'] }}
                    />
                    <span className="cell-title">{r.title}</span>
                    <span className="cell-muted">
                      {PRIORITY_LABEL[r.priority ?? 'medium']}
                      {r.projectName ? ` · ${r.projectName}` : ''}
                      {r.completedAt != null ? ' · concluída' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!canImport} onClick={run}>
            <Icon name="upload" size={16} /> Importar
          </button>
        </div>
      </div>
    </div>
  )
}
