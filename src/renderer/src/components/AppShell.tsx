import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ProjectSelector } from './ProjectSelector'
import { useTheme } from '@renderer/theme/ThemeProvider'

const TABS = [
  { to: '/', label: 'Quadro' },
  { to: '/summary', label: 'Resumo' },
  { to: '/notes', label: 'Notas' }
] as const

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const { theme, toggle } = useTheme()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          AG<span>OPS</span> Kanban
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`tab ${pathname === t.to ? 'active' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          <ProjectSelector />
          <button
            className="icon-btn"
            onClick={toggle}
            title={theme === 'light' ? 'Tema escuro' : 'Tema claro'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
