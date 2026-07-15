import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const Ctx = createContext<ConfirmCtx | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions): Promise<boolean> => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean): void => {
    resolver.current?.(result)
    resolver.current = null
    setOpts(null)
  }, [])

  useEffect(() => {
    if (!opts) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter') close(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opts, close])

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div className="overlay" onClick={() => close(false)}>
          <div
            className="modal confirm-modal"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{opts.title}</h3>
            {opts.message && <p className="confirm-message">{opts.message}</p>}
            <div className="modal-actions">
              <span className="spacer" />
              <button className="btn btn-ghost" onClick={() => close(false)}>
                {opts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                className={`btn ${opts.danger ? 'btn-danger-solid' : 'btn-primary'}`}
                autoFocus
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm(): ConfirmCtx['confirm'] {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  return ctx.confirm
}
