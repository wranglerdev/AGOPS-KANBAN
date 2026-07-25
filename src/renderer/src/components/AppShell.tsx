import { useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ProjectSelector } from './ProjectSelector'
import { Icon } from './Icon'
import { HelpDialog } from './HelpDialog'
import { StatusBar } from './StatusBar'
import { useTheme } from '@renderer/theme/ThemeProvider'

const TABS = [
  { to: '/', label: 'Quadro', icon: 'view_kanban' },
  { to: '/summary', label: 'Resumo', icon: 'monitoring' },
  { to: '/notes', label: 'Notas', icon: 'sticky_note_2' }
] as const

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const { theme, toggle } = useTheme()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [helpOpen, setHelpOpen] = useState(false)

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
              <Icon name={t.icon} size={16} />
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
            <Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={18} />
          </button>
          <button className="icon-btn" onClick={() => setHelpOpen(true)} title="Ajuda">
            <Icon name="help" size={18} />
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <StatusBar />
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
