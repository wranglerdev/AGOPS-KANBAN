import type { Priority } from '@renderer/db/database'

export const priorityColorVar: Record<Priority, string> = {
  urgent: 'var(--prio-urgent)',
  high: 'var(--prio-high)',
  medium: 'var(--prio-medium)',
  low: 'var(--prio-low)'
}

const dtf = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dtfTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})
const dtfMonthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const dtfDayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const formatDate = (ms: number): string => dtf.format(new Date(ms))
export const formatDateTime = (ms: number): string => dtfTime.format(new Date(ms))
export const formatMonthShort = (d: Date): string => dtfMonthShort.format(d)
export const formatDayMonth = (d: Date): string => dtfDayMonth.format(d)

/**
 * Tempo relativo em pt-BR (ex.: "há 2 dias", "ontem", "há 3 meses"),
 * usando a API nativa Intl.RelativeTimeFormat — escolhe a melhor unidade.
 */
export function formatRelative(ms: number): string {
  const diff = ms - Date.now() // negativo para o passado
  const abs = Math.abs(diff)
  const SEC = 1000
  const MIN = 60 * SEC
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR
  const WEEK = 7 * DAY
  const MONTH = 30 * DAY
  const YEAR = 365 * DAY
  if (abs < MIN) return rtf.format(Math.round(diff / SEC), 'second')
  if (abs < HOUR) return rtf.format(Math.round(diff / MIN), 'minute')
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour')
  if (abs < WEEK) return rtf.format(Math.round(diff / DAY), 'day')
  if (abs < MONTH) return rtf.format(Math.round(diff / WEEK), 'week')
  if (abs < YEAR) return rtf.format(Math.round(diff / MONTH), 'month')
  return rtf.format(Math.round(diff / YEAR), 'year')
}

/**
 * Cor deterministica para um chip de tag, derivada do nome via hash.
 * Retorna { bg, fg } em HSL, com contraste adequado em tema claro e escuro.
 */
export function tagColor(name: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  // bg translucido funciona sobre superficie clara ou escura; fg com lightness
  // intermediaria mantem legibilidade nos dois temas.
  return {
    bg: `hsl(${hue} 70% 50% / 0.18)`,
    fg: `hsl(${hue} 55% 52%)`
  }
}
