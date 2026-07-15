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

export const formatDate = (ms: number): string => dtf.format(new Date(ms))
export const formatDateTime = (ms: number): string => dtfTime.format(new Date(ms))

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
