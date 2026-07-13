import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface SelectedProjectValue {
  projectId: string | null
  setProjectId: (id: string | null) => void
}

const Ctx = createContext<SelectedProjectValue | null>(null)

const STORAGE_KEY = 'agops.selectedProject'

export function SelectedProjectProvider({ children }: { children: ReactNode }): JSX.Element {
  const [projectId, setProjectIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  )

  useEffect(() => {
    if (projectId) localStorage.setItem(STORAGE_KEY, projectId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [projectId])

  return (
    <Ctx.Provider value={{ projectId, setProjectId: setProjectIdState }}>{children}</Ctx.Provider>
  )
}

export function useSelectedProject(): SelectedProjectValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSelectedProject deve ser usado dentro de SelectedProjectProvider')
  return ctx
}
