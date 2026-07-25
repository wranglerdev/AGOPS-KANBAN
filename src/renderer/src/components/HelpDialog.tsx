import { useEffect } from 'react'
import { useLockBodyScroll } from '@renderer/hooks/useLockBodyScroll'
import { Icon } from './Icon'

/**
 * Guia rápido das ações de relações (bloqueios e nota vinculada) e da legenda
 * de ícones do card. Aberto pelo botão de ajuda na barra superior.
 */
export function HelpDialog({ onClose }: { onClose: () => void }): JSX.Element {
  useLockBodyScroll()

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal help-modal is-scrollable"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>
            <Icon name="help" size={18} /> Ajuda — relações e atalhos
          </h3>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="help-section">
            <h4>Ícones do card</h4>
            <ul className="help-list">
              <li>
                <span className="help-icon">
                  <Icon name="notes" size={16} />
                </span>
                <div>
                  <strong>Descrição</strong> — a tarefa tem detalhes escritos.
                </div>
              </li>
              <li>
                <span className="help-icon">
                  <Icon name="sticky_note_2" size={16} />
                </span>
                <div>
                  <strong>Nota vinculada</strong> — dê <kbd>Ctrl</kbd> + clique no ícone para
                  abrir a nota para leitura. Volte pela aba <em>Notas → Quadro</em>.
                </div>
              </li>
              <li>
                <span className="help-icon">
                  <Icon name="lock" size={16} />
                </span>
                <div>
                  <strong>Bloqueada</strong> — passe o mouse por ~300&nbsp;ms sobre o cadeado
                  para destacar no quadro as tarefas que a bloqueiam; as demais esmaecem.
                </div>
              </li>
            </ul>
          </div>

          <div className="help-section">
            <h4>No diálogo da tarefa</h4>
            <ul className="help-list">
              <li>
                <span className="help-icon">
                  <Icon name="lock" size={16} />
                </span>
                <div>
                  <strong>Bloqueada por</strong> — busque uma tarefa (filtro fuzzy) e clique para
                  adicioná-la como bloqueadora. Remova pelo <Icon name="close" size={12} /> no chip.
                </div>
              </li>
              <li>
                <span className="help-icon">
                  <Icon name="sticky_note_2" size={16} />
                </span>
                <div>
                  <strong>Nota vinculada</strong> — busque e vincule uma nota à tarefa. Depois
                  acesse-a rápido pelo ícone do card.
                </div>
              </li>
            </ul>
            <p className="help-hint">
              As relações são salvas ao clicar em <strong>Salvar</strong>. Ao excluir uma tarefa,
              ela é removida automaticamente das bloqueadoras das outras.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <span className="spacer" />
          <button className="btn btn-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
