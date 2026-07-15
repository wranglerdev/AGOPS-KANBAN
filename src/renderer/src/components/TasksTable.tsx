import { useEffect, useMemo, useRef, useState } from 'react'
import type { Task } from '@renderer/db/database'
import { PRIORITY_LABEL } from '@renderer/db/database'
import { useAllTasks, useCompleteTask, useReopenTask, useDeleteTask } from '@renderer/hooks/useTasks'
import { useProjects } from '@renderer/hooks/useProjects'
import { buildTaskFuse, collectTags } from '@renderer/lib/taskFilters'
import { priorityColorVar, tagColor, formatDateTime } from '@renderer/lib/format'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmDialog'
import { Icon } from './Icon'

type StatusFilter = 'all' | 'active' | 'done'

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'Todos os status',
  active: 'Ativas',
  done: 'Concluídas'
}

const PAGE_SIZE = 15

interface Props {
  scope?: string
  allProjects: boolean
  /** Reporta ao pai a lista atualmente filtrada (para exportar CSV). */
  onFilteredChange?: (rows: Task[]) => void
}

export function TasksTable({ scope, allProjects, onFilteredChange }: Props): JSX.Element {
  const { data: tasks = [] } = useAllTasks(scope)
  const { data: projects = [] } = useProjects()
  const complete = useCompleteTask()
  const reopen = useReopenTask()
  const remove = useDeleteTask()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [tagsOpen, setTagsOpen] = useState(false)
  const tagsRef = useRef<HTMLDivElement>(null)

  const projectName = (id: string): string => projects.find((p) => p.id === id)?.name ?? '—'
  const allTags = useMemo(() => collectTags(tasks), [tasks])
  const fuse = useMemo(() => buildTaskFuse(tasks), [tasks])

  const filtered = useMemo(() => {
    let list = tasks
    if (status === 'active') list = list.filter((t) => t.completedAt == null)
    else if (status === 'done') list = list.filter((t) => t.completedAt != null)
    if (selectedTags.length > 0) {
      list = list.filter((t) => (t.tags ?? []).some((tag) => selectedTags.includes(tag)))
    }
    const q = search.trim()
    if (q) {
      const matchIds = new Set(fuse.search(q).map((r) => r.item.id))
      list = list.filter((t) => matchIds.has(t.id))
    }
    return list
  }, [tasks, status, selectedTags, search, fuse])

  // Reseta paginacao quando qualquer filtro muda.
  useEffect(() => setPage(0), [search, selectedTags, status])

  // Reporta o conjunto filtrado ao pai (export CSV).
  useEffect(() => onFilteredChange?.(filtered), [filtered, onFilteredChange])

  // Fecha popover de tags ao clicar fora.
  useEffect(() => {
    if (!tagsOpen) return
    const onDown = (e: MouseEvent): void => {
      if (tagsRef.current && !tagsRef.current.contains(e.target as Node)) setTagsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [tagsOpen])

  const toggleTag = (tag: string): void =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  const onDelete = async (t: Task): Promise<void> => {
    const ok = await confirm({
      title: 'Excluir tarefa',
      message: `“${t.title}” será removida permanentemente.`,
      confirmLabel: 'Excluir',
      danger: true
    })
    if (!ok) return
    await remove.mutateAsync(t.id)
    showToast('Tarefa excluída')
  }

  const onComplete = async (t: Task): Promise<void> => {
    await complete.mutateAsync(t.id)
    showToast('Tarefa concluída')
  }

  const onReopen = async (t: Task): Promise<void> => {
    await reopen.mutateAsync(t.id)
    showToast('Conclusão desfeita')
  }

  return (
    <div className="tasks-table-wrap">
      <div className="tasks-toolbar">
        <div className="toolbar-search">
          <Icon name="search" size={16} className="toolbar-search-icon" />
          <input
            className="input"
            placeholder="Buscar tarefas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-btn toolbar-search-clear"
              onClick={() => setSearch('')}
              title="Limpar busca"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          title="Filtrar por status"
        >
          {(['all', 'active', 'done'] as StatusFilter[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <div className="tags-filter" ref={tagsRef}>
          <button
            className={`btn ${selectedTags.length > 0 ? 'btn-active' : ''}`}
            onClick={() => setTagsOpen((o) => !o)}
            disabled={allTags.length === 0}
            title="Filtrar por tags"
          >
            Tags{selectedTags.length > 0 ? ` · ${selectedTags.length}` : ''}
          </button>
          {tagsOpen && (
            <div className="tags-popover">
              <div className="tags-popover-head">
                <span>Filtrar por tags</span>
                {selectedTags.length > 0 && (
                  <button className="btn-link" onClick={() => setSelectedTags([])}>
                    Limpar
                  </button>
                )}
              </div>
              <div className="tags-popover-list">
                {allTags.map((tag) => {
                  const active = selectedTags.includes(tag)
                  const c = tagColor(tag)
                  return (
                    <button
                      key={tag}
                      className={`tag-chip tag-chip-toggle ${active ? 'active' : ''}`}
                      style={{ background: c.bg, color: c.fg }}
                      onClick={() => toggleTag(tag)}
                    >
                      {active && <Icon name="check_circle" size={13} />}
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-row">
          <Icon name="checklist" size={18} /> Nenhuma tarefa encontrada.
        </p>
      ) : (
        <>
          <table className="tasks-table">
            <thead>
              <tr>
                <th className="col-prio" />
                <th>Título</th>
                <th className="col-status">Status</th>
                <th>Tags</th>
                {allProjects && <th className="col-project">Projeto</th>}
                <th className="col-when">Data</th>
                <th className="col-actions" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => {
                const done = t.completedAt != null
                return (
                  <tr key={t.id}>
                    <td className="col-prio">
                      <span
                        className="prio-dot"
                        style={{ background: priorityColorVar[t.priority] }}
                        title={PRIORITY_LABEL[t.priority]}
                      />
                    </td>
                    <td className="cell-title">{t.title}</td>
                    <td className="col-status">
                      <span className={`status-badge${done ? ' done' : ''}`}>
                        {done ? 'Concluída' : 'Ativa'}
                      </span>
                    </td>
                    <td>
                      <div className="cell-tags">
                        {(t.tags ?? []).map((tag) => {
                          const c = tagColor(tag)
                          return (
                            <span
                              key={tag}
                              className="tag-chip"
                              style={{ background: c.bg, color: c.fg }}
                            >
                              {tag}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    {allProjects && (
                      <td className="col-project cell-muted" title={projectName(t.projectId)}>
                        {projectName(t.projectId)}
                      </td>
                    )}
                    <td className="col-when cell-muted">
                      {formatDateTime((t.completedAt ?? t.createdAt) as number)}
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        {done ? (
                          <button
                            className="icon-btn"
                            onClick={() => onReopen(t)}
                            title="Desfazer conclusão"
                          >
                            <Icon name="replay" size={16} />
                          </button>
                        ) : (
                          <button
                            className="icon-btn"
                            onClick={() => onComplete(t)}
                            title="Concluir"
                          >
                            <Icon name="task_alt" size={16} />
                          </button>
                        )}
                        <button
                          className="icon-btn danger"
                          onClick={() => onDelete(t)}
                          title="Excluir"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="pager">
            <span className="pager-info">
              {filtered.length} {filtered.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
            <div className="pager-nav">
              <button
                className="icon-btn"
                disabled={clampedPage === 0}
                onClick={() => setPage(0)}
                title="Primeira página"
              >
                «
              </button>
              <button
                className="icon-btn"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                title="Página anterior"
              >
                ‹
              </button>
              <span className="pager-current">
                {clampedPage + 1} / {pageCount}
              </span>
              <button
                className="icon-btn"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                title="Próxima página"
              >
                ›
              </button>
              <button
                className="icon-btn"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage(pageCount - 1)}
                title="Última página"
              >
                »
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
