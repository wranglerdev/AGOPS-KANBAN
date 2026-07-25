import { useEffect } from 'react'

// Contador para suportar diálogos empilhados: só libera o scroll da página
// quando o último modal fechar.
let lockCount = 0

/**
 * Trava a rolagem da página enquanto um modal está aberto, evitando que a
 * roda do mouse role o conteúdo atrás do overlay (scroll chaining).
 */
export function useLockBodyScroll(): void {
  useEffect(() => {
    if (lockCount === 0) {
      document.body.style.overflow = 'hidden'
    }
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        document.body.style.overflow = ''
      }
    }
  }, [])
}
