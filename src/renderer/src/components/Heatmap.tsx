import { useMemo, useState } from 'react'
import { PRIORITIES, PRIORITY_LABEL, type Priority, type Task } from '@renderer/db/database'
import { priorityColorVar, formatMonthShort, formatDayMonth } from '@renderer/lib/format'

interface Props {
  /** Tarefas concluídas (com completedAt). */
  tasks: Task[]
  /** Amplitude do heatmap, em meses até hoje. */
  months: number
}

interface DayCell {
  date: Date
  key: number
  inRange: boolean
  count: number
  byPriority: Record<Priority, number>
}

interface Tip {
  x: number
  y: number
  cell: DayCell
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/* Aritmética de datas com a API nativa (sem date-fns). */
const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
// Semana começando na segunda-feira.
const startOfWeekMon = (d: Date): Date => {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // 0 = segunda
  return addDays(x, -dow)
}
const subMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() - n, d.getDate())
const dayKey = (d: Date): number => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate()

const emptyPrio = (): Record<Priority, number> => ({ urgent: 0, high: 0, medium: 0, low: 0 })

export function Heatmap({ tasks, months }: Props): JSX.Element {
  const { weeks, monthLabels, maxCount } = useMemo(() => {
    const today = startOfDay(new Date())
    const start = startOfWeekMon(subMonths(today, months))
    const gridEnd = addDays(startOfWeekMon(today), 6)

    // Contagem por dia + detalhamento por prioridade.
    const counts = new Map<number, DayCell>()
    for (const t of tasks) {
      if (t.completedAt == null) continue
      const date = startOfDay(new Date(t.completedAt))
      const k = dayKey(date)
      let cell = counts.get(k)
      if (!cell) {
        cell = { date, key: k, inRange: true, count: 0, byPriority: emptyPrio() }
        counts.set(k, cell)
      }
      cell.count++
      cell.byPriority[t.priority]++
    }

    const weeks: DayCell[][] = []
    let cursor = start
    let max = 0
    while (cursor <= gridEnd) {
      const week: DayCell[] = []
      for (let d = 0; d < 7; d++) {
        const date = addDays(cursor, d)
        const k = dayKey(date)
        const found = counts.get(k)
        const inRange = date >= start && date <= today
        const cell: DayCell = found
          ? { ...found, inRange }
          : { date, key: k, inRange, count: 0, byPriority: emptyPrio() }
        if (inRange && cell.count > max) max = cell.count
        week.push(cell)
      }
      weeks.push(week)
      cursor = addDays(cursor, 7)
    }

    // Rótulos de mês: no topo da primeira coluna de cada mês.
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, col) => {
      const m = week[0].date.getMonth()
      if (m !== lastMonth) {
        monthLabels.push({ col, label: formatMonthShort(week[0].date) })
        lastMonth = m
      }
    })

    return { weeks, monthLabels, maxCount: max }
  }, [tasks, months])

  const [tip, setTip] = useState<Tip | null>(null)

  const level = (count: number): number => {
    if (count === 0) return 0
    if (maxCount <= 1) return 4
    return Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4)))
  }

  const gridTemplateColumns = `var(--hm-wd) repeat(${weeks.length}, minmax(0, var(--hm-max)))`

  return (
    <div className="heatmap">
      <div className="heatmap-grid" style={{ gridTemplateColumns }}>
        {/* Rótulos de mês (linha 1). */}
        {monthLabels.map((m) => (
          <span
            key={`${m.col}-${m.label}`}
            className="heatmap-month"
            style={{ gridColumn: m.col + 2, gridRow: 1 }}
          >
            {m.label}
          </span>
        ))}

        {/* Rótulos de dia da semana (coluna 1). */}
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={w} className="heatmap-weekday" style={{ gridColumn: 1, gridRow: i + 2 }}>
            {i % 2 === 0 ? w : ''}
          </span>
        ))}

        {/* Células. */}
        {weeks.map((week, wi) =>
          week.map((cell, di) => (
            <div
              key={cell.key}
              className={`heatmap-cell lvl-${cell.inRange ? level(cell.count) : 'out'}`}
              style={{ gridColumn: wi + 2, gridRow: di + 2 }}
              onMouseEnter={(e) => cell.inRange && setTip({ x: e.clientX, y: e.clientY, cell })}
              onMouseMove={(e) =>
                cell.inRange && setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))
              }
              onMouseLeave={() => setTip(null)}
            />
          ))
        )}
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Menos</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heatmap-cell lvl-${l}`} />
        ))}
        <span className="heatmap-legend-label">Mais</span>
      </div>

      {tip && (
        <div className="heatmap-tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <div className="heatmap-tooltip-date">{formatDayMonth(tip.cell.date)}</div>
          {tip.cell.count === 0 ? (
            <div className="heatmap-tooltip-empty">Nenhuma conclusão</div>
          ) : (
            <>
              <div className="heatmap-tooltip-total">
                {tip.cell.count} {tip.cell.count === 1 ? 'concluída' : 'concluídas'}
              </div>
              <div className="heatmap-tooltip-breakdown">
                {PRIORITIES.filter((p) => tip.cell.byPriority[p] > 0).map((p) => (
                  <span key={p} className="heatmap-tooltip-prio">
                    <span className="prio-dot" style={{ background: priorityColorVar[p] }} />
                    {PRIORITY_LABEL[p]}
                    <strong>{tip.cell.byPriority[p]}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
