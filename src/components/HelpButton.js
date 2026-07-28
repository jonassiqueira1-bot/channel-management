import { LifeBuoy } from 'lucide-react'
import { DOCS_BASE_URL } from '../config/docs'

// Acesso global e discreto à documentação de apoio (docs.boostly.com.br) —
// presente em toda tela, fora da sidebar, no mesmo padrão de botão flutuante
// circular usado pelo sino de Pendências (AlertsInbox): mesmo tamanho/cores,
// posicionado ao lado dele no canto superior direito — nunca sobre a sidebar
// nem sobre o ImportProgressWidget (bottom-right).
export default function HelpButton() {
  return (
    <a
      href={DOCS_BASE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Ajuda e documentação"
      aria-label="Ajuda e documentação"
      style={{
        position: 'fixed', top: 8, right: 44, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        cursor: 'pointer', textDecoration: 'none',
      }}
    >
      <LifeBuoy size={14} strokeWidth={1.75} color="var(--text-muted)" />
    </a>
  )
}
