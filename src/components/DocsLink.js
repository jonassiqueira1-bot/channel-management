import { HelpCircle } from 'lucide-react'
import { getDocsUrl } from '../config/docs'

// Link contextual pra documentação de um módulo específico — mesmo padrão
// visual de "ghost button" já usado na toolbar do BrowseLayout. Pensado pra
// ser passado via `secondaryActions` em telas com fluxo mais complexo
// (ex: Playbooks), sem competir com as ações primárias da tela.
export default function DocsLink({ module, label = 'Como funciona?' }) {
  return (
    <a
      href={getDocsUrl(module)}
      target="_blank"
      rel="noopener noreferrer"
      title="Ajuda e documentação"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 32, padding: '0 10px', borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--border)', background: 'var(--surface)',
        fontFamily: 'var(--font)', fontSize: 'var(--text-sm)', color: 'var(--text-soft)',
        cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
      }}
    >
      <HelpCircle size={13} strokeWidth={1.75} />
      {label}
    </a>
  )
}
