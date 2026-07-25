import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table'
import { PRIORITIES, PRIORITY_LABEL, type Priority, type Task } from '@renderer/db/database'
import {
  useAllTasks,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
  useDuplicateTask,
  useChangeTaskPriority,
  useMoveTaskToProject
} from '@renderer/hooks/useTasks'
import { useProjects } from '@renderer/hooks/useProjects'
import { buildTaskFuse, collectTags } from '@renderer/lib/taskFilters'
import { priorityColorVar, tagColor, formatDateTime, formatRelative } from '@renderer/lib/format'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmDialog'
import { useContextMenu, type MenuEntry } from './ContextMenu'
import { Icon } from './Icon'

type StatusFilter = 'all' | 'active' | 'done'

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'Todos os status',
  active: 'Ativas',
  done: 'Concluídas'
}

const PAGE_SIZE = 15
const TAGS_SHOWN = 2
const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

interface Props {
  scope?: string
  allProjects: boolean
  /** Ids de projeto para filtrar (vazio = todos dentro do escopo). */
  projectIds?: string[]
  /** Reporta ao pai a lista atualmente filtrada (para exportar CSV). */
  onFilteredChange?: (rows: Task[]) => void
}

export function TasksTable({
  scope,
  allProjects,
  projectIds = [],
  onFilteredChange
}: Props): JSX.Element {
  const { data: rawTasks = [] } = useAllTasks(scope)
  const { data: projects = [] } = useProjects()
  const complete = useCompleteTask()
  const reopen = useReopenTask()
  const remove = useDeleteTask()
  const duplicate = useDuplicateTask()
  const changePriority = useChangeTaskPriority()
  const moveToProject = useMoveTaskToProject()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const { openContextMenu } = useContextMenu()

  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  const tagsRef = useRef<HTMLDivElement>(null)

  // Filtra por projetos selecionados (multi-select do Resumo).
  const tasks = useMemo(
    () => (projectIds.length === 0 ? rawTasks : rawTasks.filter((t) => projectIds.includes(t.projectId))),
    [rawTasks, projectIds]
  )

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

  /* --------------------------- Ações --------------------------- */
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

  const openRowMenu = (e: React.MouseEvent, t: Task): void => {
    const done = t.completedAt != null
    const others = projects.filter((p) => p.id !== t.projectId)
    const items: MenuEntry[] = [
      done
        ? { label: 'Reabrir', icon: 'replay', onClick: () => onReopen(t) }
        : { label: 'Concluir', icon: 'task_alt', onClick: () => onComplete(t) },
      {
        label: 'Mudar prioridade',
        icon: 'swap_vert',
        submenu: PRIORITIES.map((p) => ({
          label: PRIORITY_LABEL[p],
          disabled: p === t.priority,
          onClick: () => {
            changePriority.mutate({ id: t.id, priority: p })
            showToast(`Prioridade: ${PRIORITY_LABEL[p]}`)
          }
        }))
      },
      {
        label: 'Mover para projeto',
        icon: 'folder',
        disabled: others.length === 0,
        submenu:
          others.length === 0
            ? [{ label: 'Nenhum outro projeto', disabled: true }]
            : others.map((p) => ({
                label: p.name,
                onClick: () => {
                  moveToProject.mutate({ id: t.id, projectId: p.id })
                  showToast(`Movida para ${p.name}`)
                }
              }))
      },
      {
        label: 'Duplicar',
        icon: 'content_copy',
        onClick: () => {
          duplicate.mutate(t.id)
          showToast('Tarefa duplicada')
        }
      },
      {
        label: 'Copiar título',
        icon: 'content_paste',
        onClick: () => {
          void navigator.clipboard?.writeText(t.title)
          showToast('Título copiado')
        }
      },
      'divider',
      { label: 'Excluir', icon: 'delete', danger: true, onClick: () => onDelete(t) }
    ]
    openContextMenu(e, items)
  }

  /* --------------------------- Colunas --------------------------- */
  const columns = useMemo<ColumnDef<Task>[]>(() => {
    const cols: ColumnDef<Task>[] = [
      {
        id: 'priority',
        header: '',
        accessorFn: (t) => PRIORITY_RANK[t.priority],
        cell: ({ row }) => (
          <span
            className="prio-dot"
            style={{ background: priorityColorVar[row.original.priority] }}
            title={PRIORITY_LABEL[row.original.priority]}
          />
        ),
        meta: { className: 'col-prio' }
      },
      {
        id: 'title',
        header: 'Título',
        accessorFn: (t) => t.title,
        cell: ({ row }) => (
          <span className="cell-title" title={row.original.title}>
            {row.original.title}
          </span>
        ),
        meta: { className: 'col-title' }
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (t) => (t.completedAt != null ? 1 : 0),
        cell: ({ row }) => {
          const done = row.original.completedAt != null
          return (
            <span className={`status-badge${done ? ' done' : ''}`}>
              {done ? 'Concluída' : 'Ativa'}
            </span>
          )
        },
        meta: { className: 'col-status' }
      },
      {
        id: 'tags',
        header: 'Tags',
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags ?? []
          const shown = tags.slice(0, TAGS_SHOWN)
          const extra = tags.slice(TAGS_SHOWN)
          return (
            <div className="cell-tags">
              {shown.map((tag) => {
                const c = tagColor(tag)
                return (
                  <span
                    key={tag}
                    className="tag-chip"
                    style={{ background: c.bg, color: c.fg }}
                    title={tag}
                  >
                    {tag}
                  </span>
                )
              })}
              {extra.length > 0 && (
                <span className="tag-chip tag-chip-more" title={extra.join(', ')}>
                  +{extra.length}
                </span>
              )}
            </div>
          )
        },
        meta: { className: 'col-tags' }
      }
    ]

    if (allProjects) {
      cols.push({
        id: 'project',
        header: 'Projeto',
        accessorFn: (t) => projectName(t.projectId),
        cell: ({ getValue }) => (
          <span className="cell-muted" title={getValue<string>()}>
            {getValue<string>()}
          </span>
        ),
        meta: { className: 'col-project' }
      })
    }

    cols.push(
      {
        id: 'when',
        header: 'Data',
        accessorFn: (t) => (t.completedAt ?? t.createdAt) as number,
        cell: ({ row }) => {
          const t = row.original
          const done = t.completedAt != null
          const ms = (t.completedAt ?? t.createdAt) as number
          return (
            <div className="cell-date" title={formatDateTime(ms)}>
              <span className={`date-kind${done ? ' done' : ''}`}>
                {done ? 'Concluída' : 'Criada'}
              </span>
              <span className="date-rel">{formatRelative(ms)}</span>
            </div>
          )
        },
        meta: { className: 'col-when' }
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const t = row.original
          const done = t.completedAt != null
          return (
            <div className="row-actions">
              {done ? (
                <button className="icon-btn" onClick={() => onReopen(t)} title="Desfazer conclusão">
                  <Icon name="replay" size={16} />
                </button>
              ) : (
                <button className="icon-btn" onClick={() => onComplete(t)} title="Concluir">
                  <Icon name="task_alt" size={16} />
                </button>
              )}
              <button
                className="icon-btn"
                onClick={(e) => openRowMenu(e, t)}
                title="Mais ações"
              >
                <Icon name="more_vert" size={16} />
              </button>
            </div>
          )
        },
        meta: { className: 'col-actions' }
      }
    )
    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProjects, projects])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    autoResetPageIndex: false
  })

  // Reseta paginação quando os filtros mudam.
  useEffect(() => table.setPageIndex(0), [search, selectedTags, status, projectIds])

  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex

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
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    const className = (header.column.columnDef.meta as { className?: string })?.className
                    return (
                      <th
                        key={header.id}
                        className={`${className ?? ''}${canSort ? ' sortable' : ''}`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="th-inner">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className={`sort-caret${sorted ? ' active' : ''}`}>
                              {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
                            </span>
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} onContextMenu={(e) => openRowMenu(e, row.original)}>
                  {row.getVisibleCells().map((cell) => {
                    const className = (cell.column.columnDef.meta as { className?: string })?.className
                    return (
                      <td key={cell.id} className={className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager">
            <span className="pager-info">
              {filtered.length} {filtered.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
            <div className="pager-nav">
              <button
                className="icon-btn"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.setPageIndex(0)}
                title="Primeira página"
              >
                «
              </button>
              <button
                className="icon-btn"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                title="Página anterior"
              >
                ‹
              </button>
              <span className="pager-current">
                {pageIndex + 1} / {pageCount}
              </span>
              <button
                className="icon-btn"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                title="Próxima página"
              >
                ›
              </button>
              <button
                className="icon-btn"
                disabled={!table.getCanNextPage()}
                onClick={() => table.setPageIndex(pageCount - 1)}
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
