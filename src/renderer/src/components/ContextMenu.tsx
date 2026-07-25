import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

export interface MenuItem {
  label: string
  icon?: string
  onClick?: () => void | Promise<void>
  danger?: boolean
  disabled?: boolean
  submenu?: MenuItem[]
}

export type MenuEntry = MenuItem | 'divider'

interface MenuState {
  x: number
  y: number
  items: MenuEntry[]
}

interface ContextMenuCtx {
  openContextMenu: (e: ReactMouseEvent, items: MenuEntry[]) => void
}

const Ctx = createContext<ContextMenuCtx | null>(null)

const MENU_MIN_WIDTH = 208
const VIEWPORT_MARGIN = 8

export function ContextMenuProvider({ children }: { children: ReactNode }): JSX.Element {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const openContextMenu = useCallback((e: ReactMouseEvent, items: MenuEntry[]): void => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, items })
  }, [])

  const close = useCallback((): void => setMenu(null), [])

  return (
    <Ctx.Provider value={{ openContextMenu }}>
      {children}
      {menu &&
        createPortal(<Menu state={menu} onClose={close} />, document.body)}
    </Ctx.Provider>
  )
}

function Menu({ state, onClose }: { state: MenuState; onClose: () => void }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: state.x, y: state.y })
  const [openSub, setOpenSub] = useState<number | null>(null)

  // Reposiciona para nao estourar a viewport (direita/baixo).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let x = state.x
    let y = state.y
    if (x + width > window.innerWidth - VIEWPORT_MARGIN) {
      x = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    }
    if (y + height > window.innerHeight - VIEWPORT_MARGIN) {
      y = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)
    }
    setPos({ x, y })
  }, [state.x, state.y])

  // Fecha em Escape, scroll, resize e blur da janela.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  const run = (item: MenuItem): void => {
    if (item.disabled || item.submenu) return
    onClose()
    void item.onClick?.()
  }

  return (
    <>
      {/* Camada invisivel para capturar clique-fora sem escurecer a tela. */}
      <div
        className="context-menu-backdrop"
        onMouseDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        ref={ref}
        className="context-menu"
        style={{ left: pos.x, top: pos.y, minWidth: MENU_MIN_WIDTH }}
        role="menu"
        onContextMenu={(e) => e.preventDefault()}
      >
        {state.items.map((entry, i) =>
          entry === 'divider' ? (
            <div key={`d${i}`} className="context-menu-divider" />
          ) : (
            <MenuRow
              key={entry.label + i}
              item={entry}
              open={openSub === i}
              onEnter={() => setOpenSub(entry.submenu ? i : null)}
              onRun={() => run(entry)}
              onRunSub={(sub) => {
                onClose()
                void sub.onClick?.()
              }}
            />
          )
        )}
      </div>
    </>
  )
}

function MenuRow({
  item,
  open,
  onEnter,
  onRun,
  onRunSub
}: {
  item: MenuItem
  open: boolean
  onEnter: () => void
  onRun: () => void
  onRunSub: (sub: MenuItem) => void
}): JSX.Element {
  return (
    <div
      className={`context-menu-item ${item.danger ? 'danger' : ''} ${
        item.disabled ? 'disabled' : ''
      } ${item.submenu ? 'has-submenu' : ''}`}
      role="menuitem"
      aria-disabled={item.disabled}
      onMouseEnter={onEnter}
      onClick={onRun}
    >
      {item.icon && <Icon name={item.icon} size={16} className="context-menu-item-icon" />}
      <span className="context-menu-item-label">{item.label}</span>
      {item.submenu && <span className="context-menu-chevron">›</span>}
      {item.submenu && open && (
        <div className="context-menu context-menu-submenu" role="menu">
          {item.submenu.map((sub, i) => (
            <div
              key={sub.label + i}
              className={`context-menu-item ${sub.danger ? 'danger' : ''} ${
                sub.disabled ? 'disabled' : ''
              }`}
              role="menuitem"
              aria-disabled={sub.disabled}
              onClick={(e) => {
                e.stopPropagation()
                if (!sub.disabled) onRunSub(sub)
              }}
            >
              {sub.icon && <Icon name={sub.icon} size={16} className="context-menu-item-icon" />}
              <span className="context-menu-item-label">{sub.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function useContextMenu(): ContextMenuCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useContextMenu deve ser usado dentro de <ContextMenuProvider>')
  return ctx
}
