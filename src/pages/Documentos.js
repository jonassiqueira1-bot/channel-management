import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { CATEGORIA_CFG, STATUS_CFG, EVENTO_CFG } from '../data/mockDocumentos'
import { useDocuments } from '../hooks/useDocuments'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
function logId() { return `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function diffFields(prev, next) {
  const campos = []
  if (prev.title !== next.title)
    campos.push({ campo: 'Título', de: prev.title, para: next.title })
  if (prev.description !== next.description)
    campos.push({ campo: 'Descrição', de: prev.description || '—', para: next.description || '—' })
  if (prev.categoria !== next.categoria)
    campos.push({ campo: 'Categoria', de: CATEGORIA_CFG[prev.categoria]?.label || prev.categoria, para: CATEGORIA_CFG[next.categoria]?.label || next.categoria })
  if (prev.content !== next.content)
    campos.push({ campo: 'Conteúdo', de: `v${prev.version}`, para: `v${next.version} — conteúdo editado` })
  if (prev.status !== next.status)
    campos.push({ campo: 'Status', de: STATUS_CFG[prev.status]?.label || prev.status, para: STATUS_CFG[next.status]?.label || next.status })
  return campos
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function CategoriaBadge({ categoria }) {
  const cfg = CATEGORIA_CFG[categoria] || CATEGORIA_CFG.outro
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.color}33`, whiteSpace: 'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.rascunho
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 18px',
      display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)',
      boxShadow: 'var(--shadow)', borderTop: `3px solid ${color || 'var(--border)'}` }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</span>
    </div>
  )
}

// ─── Eye Icon ─────────────────────────────────────────────────────────────────

// ─── Ações Dropdown ───────────────────────────────────────────────────────────
function AcoesDropdown({ onClose, anchorRef }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])
  const item = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    color: 'var(--text)', fontFamily: 'var(--font)', textAlign: 'left', borderRadius: 7 }
  return (
    <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 600,
      width: 200, background: 'var(--surface)', borderRadius: 10,
      border: '1px solid var(--border)', boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: 6 }}>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Exportar lista
      </button>
    </div>
  )
}

// ─── Histórico de Alterações (painel) ─────────────────────────────────────────
function HistoricoPanel({ docId, logs }) {
  const lista = useMemo(() =>
    (logs || [])
      .filter(l => l.doc_id === docId)
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)),
    [logs, docId]
  )

  return (
    <div style={{ padding: '4px 0' }}>
      {lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 12 }}>Nenhuma alteração registrada</div>
        </div>
      )}
      {lista.map((log, idx) => {
        const cfg    = EVENTO_CFG[log.evento] || EVENTO_CFG.editado
        const isLast = idx === lista.length - 1
        return (
          <div key={log.id} style={{ display: 'flex', gap: 10, paddingBottom: isLast ? 0 : 18, position: 'relative' }}>
            {!isLast && (
              <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: 'var(--border2)' }} />
            )}
            {/* Ícone */}
            <div style={{ width: 27, height: 27, borderRadius: '50%', background: cfg.bg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: cfg.color,
              border: `1.5px solid ${cfg.color}55`, zIndex: 1 }}>
              {cfg.icon}
            </div>
            {/* Conteúdo */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                {cfg.label}
              </div>
              {log.campos && log.campos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 5 }}>
                  {log.campos.map((c, i) => (
                    <div key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-soft)' }}>{c.campo}:</span>
                      {c.de && c.de !== '—' && (
                        <>
                          <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '0 5px', borderRadius: 3,
                            fontFamily: 'var(--mono)', fontSize: 10, textDecoration: 'line-through' }}>{c.de}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                        </>
                      )}
                      <span style={{ background: '#D1FAE5', color: '#065F46', padding: '0 5px', borderRadius: 3,
                        fontFamily: 'var(--mono)', fontSize: 10 }}>{c.para}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: 'var(--text-muted)',
                  border: '1px solid var(--border)', flexShrink: 0 }}>
                  {(log.usuario || '?').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.usuario}</span>
                <span style={{ fontSize: 10, color: 'var(--border)' }}>·</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                  {fmtDateTime(log.criado_em)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: lista.length ? 20 : 0, padding: '10px 0 0',
        borderTop: lista.length ? '1px solid var(--border2)' : 'none' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          💡 Cada alteração salva é registrada automaticamente com usuário e timestamp.
        </span>
      </div>
    </div>
  )
}

// ─── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc, onClick }) {
  const cfg = CATEGORIA_CFG[doc.categoria] || CATEGORIA_CFG.outro
  const preview = doc.content?.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').split('\n').filter(Boolean)[1] || ''

  return (
    <div onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12,
        padding: '18px 20px', cursor: 'pointer', boxShadow: 'var(--shadow)',
        display: 'flex', flexDirection: 'column', gap: 12,
        borderTop: `3px solid ${cfg.color}`, transition: 'box-shadow 0.15s, transform 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {doc.description || preview}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <CategoriaBadge categoria={doc.categoria} />
        <StatusBadge status={doc.status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            v{doc.version}
          </span>
          <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {doc.created_by}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          {fmtDate(doc.updated_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Painel lateral de recursos (estilo Canva) ────────────────────────────────
const MERGE_FIELDS = [
  {
    group: 'Oportunidade', icon: '💼', color: '#6366F1', bg: '#EEF2FF',
    fields: [
      { token: '{{oportunidade.titulo}}',      label: 'Título',         origem: 'Pipeline → campo "Título" da oportunidade',             uso: 'Substituído pelo nome da oportunidade ao gerar o documento.' },
      { token: '{{oportunidade.empresa}}',     label: 'Empresa',        origem: 'Pipeline → empresa vinculada à oportunidade',           uso: 'Substituído pela razão social da empresa cliente.' },
      { token: '{{oportunidade.valor}}',       label: 'Valor total',    origem: 'Pipeline → soma dos módulos menos desconto',            uso: 'Exibido como valor líquido em R$ formatado.' },
      { token: '{{oportunidade.prazo}}',       label: 'Prazo',          origem: 'Pipeline → campo "Prazo de fechamento"',                uso: 'Substituído pela data limite em dd/mm/aaaa.' },
      { token: '{{oportunidade.etapa}}',       label: 'Etapa do funil', origem: 'Pipeline → etapa atual no funil configurado',           uso: 'Exibe o nome da etapa (ex: Proposta, Negociação).' },
      { token: '{{oportunidade.responsavel}}', label: 'Responsável',    origem: 'Pipeline → campo "Responsável" da oportunidade',       uso: 'Substituído pelo nome do vendedor responsável.' },
    ],
  },
  {
    group: 'Empresa', icon: '🏢', color: '#0EA5E9', bg: '#E0F2FE',
    fields: [
      { token: '{{empresa.nome}}',     label: 'Nome',     origem: 'Clientes → Empresas → campo "Nome"',           uso: 'Razão social completa da empresa cliente.' },
      { token: '{{empresa.cnpj}}',     label: 'CNPJ',     origem: 'Clientes → Empresas → campo "CNPJ"',           uso: 'Número do CNPJ formatado (XX.XXX.XXX/XXXX-XX).' },
      { token: '{{empresa.cidade}}',   label: 'Cidade',   origem: 'Clientes → Empresas → campo "Cidade"',         uso: 'Cidade sede da empresa.' },
      { token: '{{empresa.segmento}}', label: 'Segmento', origem: 'Clientes → Empresas → campo "Segmento"',       uso: 'Segmento de atuação (ex: SaaS, Saúde, Indústria).' },
      { token: '{{empresa.email}}',    label: 'E-mail',   origem: 'Clientes → Empresas → e-mail comercial',       uso: 'Endereço de e-mail principal da empresa.' },
    ],
  },
  {
    group: 'Contato', icon: '👤', color: '#8B5CF6', bg: '#EDE9FE',
    fields: [
      { token: '{{contato.nome}}',     label: 'Nome',     origem: 'Clientes → Contatos → contato principal da oportunidade', uso: 'Nome completo do decisor/contato.' },
      { token: '{{contato.cargo}}',    label: 'Cargo',    origem: 'Clientes → Contatos → campo "Cargo"',                    uso: 'Cargo profissional (ex: Diretor Comercial).' },
      { token: '{{contato.email}}',    label: 'E-mail',   origem: 'Clientes → Contatos → campo "E-mail"',                   uso: 'E-mail do contato para endereçamento.' },
      { token: '{{contato.telefone}}', label: 'Telefone', origem: 'Clientes → Contatos → campo "Telefone"',                 uso: 'Número de telefone/WhatsApp do contato.' },
    ],
  },
  {
    group: 'Vendedor', icon: '🧑‍💼', color: '#10B981', bg: '#D1FAE5',
    fields: [
      { token: '{{vendedor.nome}}',  label: 'Nome',  origem: 'Usuários → usuário logado ou responsável pela oportunidade', uso: 'Nome do vendedor/representante comercial.' },
      { token: '{{vendedor.cargo}}', label: 'Cargo', origem: 'Usuários → campo "Cargo" do perfil',                        uso: 'Cargo institucional do responsável.' },
      { token: '{{vendedor.email}}', label: 'E-mail',origem: 'Usuários → campo "E-mail" do perfil',                       uso: 'E-mail profissional para assinatura.' },
    ],
  },
  {
    group: 'Sistema', icon: '📅', color: '#F59E0B', bg: '#FEF3C7',
    fields: [
      { token: '{{sistema.data_hoje}}',       label: 'Data de hoje',    origem: 'Gerado automaticamente no momento da exportação', uso: 'Data do dia formatada em português (ex: 12 de junho de 2026).' },
      { token: '{{sistema.mes_ano}}',         label: 'Mês/Ano',         origem: 'Gerado automaticamente no momento da exportação', uso: 'Mês e ano por extenso (ex: junho de 2026).' },
      { token: '{{sistema.numero_proposta}}', label: 'Nº da proposta',  origem: 'Sequencial automático gerado pelo sistema',       uso: 'Número único da proposta (ex: PROP-2026-0042).' },
    ],
  },
]

const BLOCKS = [
  {
    label: 'Cabeçalho institucional',
    icon: '🏷️',
    desc: 'Logo, nome da empresa emissora e data',
    content: `# {{oportunidade.empresa}} — {{sistema.mes_ano}}\n\n**Documento preparado por:** {{vendedor.nome}} · {{vendedor.cargo}}\n**Data:** {{sistema.data_hoje}}\n\n---`,
  },
  {
    label: 'Introdução da proposta',
    icon: '📝',
    desc: 'Parágrafo de abertura personalizável',
    content: `## Apresentação\n\nPrezado(a) **{{contato.nome}}**,\n\nÉ com satisfação que apresentamos esta proposta comercial para a **{{empresa.nome}}**, considerando as necessidades discutidas durante nossa conversa.\n\nNosso objetivo é apresentar a solução mais adequada para o seu contexto, com transparência em relação a investimentos e próximos passos.`,
  },
  {
    label: 'Tabela de investimento',
    icon: '💰',
    desc: 'Tabela com módulos, valores e total',
    content: `## Investimento\n\n| Módulo | Valor Mensal |\n|--------|-------------|\n| CDU (usuários) | R$ X.XXX |\n| SMS | R$ X.XXX |\n| Serviços | R$ X.XXX |\n| **Total líquido** | **{{oportunidade.valor}}** |\n\n> Os valores acima são válidos por 30 dias a partir de {{sistema.data_hoje}}.`,
  },
  {
    label: 'Próximos passos',
    icon: '🚀',
    desc: 'Checklist de ações pós-proposta',
    content: `## Próximos Passos\n\n- [ ] Revisão e aprovação da proposta por {{contato.nome}}\n- [ ] Assinatura do contrato\n- [ ] Kick-off de implementação\n- [ ] Configuração inicial do ambiente\n- [ ] Treinamento da equipe\n\n**Prazo para aceite:** {{oportunidade.prazo}}`,
  },
  {
    label: 'Bloco de assinatura',
    icon: '✍️',
    desc: 'Área de assinatura com dados do vendedor',
    content: `---\n\n## Aceite e Assinatura\n\n**{{empresa.nome}}**\n\n_______________________________\n{{contato.nome}} — {{contato.cargo}}\n\n**Canal NG / Emitente**\n\n_______________________________\n{{vendedor.nome}} — {{vendedor.cargo}}\n{{vendedor.email}} · {{sistema.data_hoje}}`,
  },
  {
    label: 'Escopo e objetivos',
    icon: '🎯',
    desc: 'Seção de escopo do projeto/contrato',
    content: `## Escopo da Solução\n\n### Objetivos\n\n- Objetivo principal a ser definido\n- Objetivo secundário\n- Critérios de sucesso\n\n### O que está incluído\n\n- Item 1\n- Item 2\n\n### O que não está incluído\n\n- Fora do escopo 1`,
  },
]

function DocResourcesPanel({ onInsert }) {
  const [panelTab, setPanelTab] = useState('variaveis')
  const [openGroup, setOpenGroup] = useState('Oportunidade')
  const [tooltip, setTooltip] = useState(null) // { token, label, origem, uso }
  const [copied, setCopied] = useState(null)

  function handleInsert(text) {
    onInsert(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1400)
  }

  const ps = {
    root:      { display:'flex', height:'100%', flexDirection:'column', borderRight:'1px solid var(--border2)', overflow:'hidden', background:'var(--surface)' },
    tabBar:    { display:'flex', borderBottom:'1px solid var(--border2)', flexShrink:0, padding:'0 4px' },
    tabBtn:    (active) => ({ padding:'9px 12px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)',
                  fontSize:12, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent', marginBottom:-1 }),
    body:      { flex:1, overflowY:'auto', padding:'10px 0' },
    group:     { borderBottom:'1px solid var(--border2)' },
    groupHdr:  (open) => ({ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', cursor:'pointer',
                  background: open ? 'var(--accent-glow)' : 'transparent',
                  border:'none', width:'100%', textAlign:'left', fontFamily:'var(--font)' }),
    groupIcon: (bg, color) => ({ width:22, height:22, borderRadius:6, background:bg, color, display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }),
    groupName: (open) => ({ fontSize:12, fontWeight:700, color: open ? 'var(--accent)' : 'var(--text)', flex:1, letterSpacing:'-0.1px' }),
    fieldList: { padding:'4px 8px 8px' },
    fieldRow:  { display:'flex', alignItems:'center', gap:6, padding:'5px 6px', borderRadius:7,
                  cursor:'pointer', marginBottom:2 },
    fieldTok:  { fontSize:10, fontFamily:'var(--mono)', background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:5, padding:'1px 5px', color:'var(--text-muted)', flexShrink:0, maxWidth:130,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    fieldLbl:  { fontSize:11, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    insertBtn: (active) => ({ padding:'2px 7px', background: active ? '#D1FAE5' : 'var(--accent-glow)',
                  border: active ? '1px solid #10B981' : '1px solid transparent', borderRadius:5, fontSize:10,
                  color: active ? '#065F46' : 'var(--accent)', cursor:'pointer', fontFamily:'var(--font)',
                  fontWeight:600, flexShrink:0, whiteSpace:'nowrap' }),
    infoBox:   { margin:'0 8px 8px', background:'var(--surface2)', border:'1px solid var(--border2)',
                  borderRadius:8, padding:'10px 12px' },
    infoTitle: { fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:4 },
    infoRow:   { fontSize:11, color:'var(--text-muted)', lineHeight:1.6, marginBottom:3 },
    infoLabel: { fontWeight:600, color:'var(--text-soft)' },
    blockCard: { margin:'0 8px 8px', background:'var(--surface2)', border:'1px solid var(--border2)',
                  borderRadius:9, padding:'10px 12px', cursor:'pointer', transition:'border-color 0.15s' },
    blockTop:  { display:'flex', alignItems:'center', gap:8, marginBottom:4 },
    blockIcon: { fontSize:16 },
    blockName: { fontSize:12, fontWeight:700, color:'var(--text)' },
    blockDesc: { fontSize:11, color:'var(--text-muted)', lineHeight:1.5, marginBottom:6 },
    blockBtn:  (active) => ({ padding:'3px 10px', background: active ? '#D1FAE5' : 'var(--accent)',
                  color: active ? '#065F46' : '#fff', border:'none', borderRadius:6, fontSize:10,
                  fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }),
  }

  return (
    <div style={ps.root}>
      <div style={ps.tabBar}>
        <button style={ps.tabBtn(panelTab==='variaveis')} onClick={() => setPanelTab('variaveis')}>Variáveis</button>
        <button style={ps.tabBtn(panelTab==='blocos')} onClick={() => setPanelTab('blocos')}>Blocos</button>
      </div>

      <div style={ps.body}>
        {panelTab === 'variaveis' && (
          <>
            <div style={{ padding:'8px 14px 6px', fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
              Clique em <strong style={{ color:'var(--accent)' }}>+ Inserir</strong> para adicionar a variável na posição do cursor. Será substituída ao exportar.
            </div>
            {MERGE_FIELDS.map(group => {
              const isOpen = openGroup === group.group
              return (
                <div key={group.group} style={ps.group}>
                  <button style={ps.groupHdr(isOpen)} onClick={() => setOpenGroup(isOpen ? null : group.group)}>
                    <span style={ps.groupIcon(group.bg, group.color)}>{group.icon}</span>
                    <span style={ps.groupName(isOpen)}>{group.group}</span>
                    <span style={{ color:'var(--text-muted)', fontSize:11, transform: isOpen ? 'rotate(90deg)' : 'none', transition:'transform 0.15s' }}>›</span>
                  </button>
                  {isOpen && (
                    <div style={ps.fieldList}>
                      {group.fields.map(f => (
                        <div key={f.token}>
                          <div style={ps.fieldRow}
                            onMouseEnter={() => setTooltip(f)}
                            onMouseLeave={() => setTooltip(null)}>
                            <span style={ps.fieldTok}>{f.token}</span>
                            <span style={ps.fieldLbl}>{f.label}</span>
                            <button style={ps.insertBtn(copied === f.token)}
                              onClick={() => handleInsert(f.token)}>
                              {copied === f.token ? '✓' : '+ Inserir'}
                            </button>
                          </div>
                          {tooltip?.token === f.token && (
                            <div style={ps.infoBox}>
                              <div style={ps.infoTitle}>{f.label}</div>
                              <div style={ps.infoRow}><span style={ps.infoLabel}>Origem: </span>{f.origem}</div>
                              <div style={ps.infoRow}><span style={ps.infoLabel}>No doc: </span>{f.uso}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {panelTab === 'blocos' && (
          <>
            <div style={{ padding:'8px 14px 6px', fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
              Insira blocos prontos com variáveis pré-configuradas. Edite livremente após inserção.
            </div>
            {BLOCKS.map((blk, i) => (
              <div key={i} style={ps.blockCard}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}>
                <div style={ps.blockTop}>
                  <span style={ps.blockIcon}>{blk.icon}</span>
                  <span style={ps.blockName}>{blk.label}</span>
                </div>
                <div style={ps.blockDesc}>{blk.desc}</div>
                <button style={ps.blockBtn(copied === blk.label)}
                  onClick={() => handleInsert('\n\n' + blk.content + '\n')}>
                  {copied === blk.label ? '✓ Inserido' : '+ Inserir bloco'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Drawer de Edição ─────────────────────────────────────────────────────────
function DocDrawer({ doc: initial, logs: allLogs, onClose, onSave, onAddLog }) {
  const isNew = !initial?.id
  const [tab, setTab]           = useState('dados')
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const textareaRef = useRef(null)
  const [draft, setDraft] = useState(() => initial || {
    id: uid(), tenant_id: 't1',
    title: '', description: '', categoria: 'proposta',
    status: 'rascunho', version: 1, content: '',
    created_by: 'Você', created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  const docLogs = useMemo(
    () => allLogs.filter(l => l.doc_id === draft.id).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)),
    [allLogs, draft.id]
  )

  function handleSave() {
    if (!draft.title.trim()) return alert('Título é obrigatório')
    const now = new Date().toISOString()

    if (isNew) {
      const saved = { ...draft, created_at: now, updated_at: now }
      onSave(saved)
      onAddLog({ id: logId(), doc_id: saved.id, evento: 'criado', campos: [], usuario: 'Você', criado_em: now })
    } else {
      const campos = diffFields(initial, draft)
      const contentChanged = initial.content !== draft.content
      const newVersion = contentChanged ? draft.version + 1 : draft.version
      const statusEvento = draft.status !== initial.status
        ? (draft.status === 'ativo' ? 'publicado' : draft.status === 'arquivado' ? 'arquivado' : 'restaurado')
        : null

      const saved = { ...draft, version: newVersion, updated_at: now }
      onSave(saved)

      if (campos.length > 0 && !statusEvento) {
        onAddLog({ id: logId(), doc_id: saved.id, evento: 'editado', campos, usuario: 'Você', criado_em: now })
      }
      if (statusEvento) {
        onAddLog({ id: logId(), doc_id: saved.id, evento: statusEvento, campos, usuario: 'Você', criado_em: now })
      }
    }
    onClose()
  }

  function insertAtCursor(text) {
    const el = textareaRef.current
    if (!el) {
      setDraft(d => ({ ...d, content: (d.content || '') + text }))
      return
    }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const before = (draft.content || '').slice(0, start)
    const after  = (draft.content || '').slice(end)
    const next   = before + text + after
    setDraft(d => ({ ...d, content: next }))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const TABS = [
    { id: 'dados',    label: 'Dados' },
    { id: 'conteudo', label: 'Conteúdo' },
    { id: 'historico', label: `Histórico (${docLogs.length})` },
  ]

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1000,
        width: expanded ? 'calc(100vw - 100px)' : 860,
        maxWidth: '100vw', transition: 'width 0.28s ease',
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
        borderLeft: '1px solid var(--border2)', overflow: 'hidden' }}>

        {/* Header do drawer */}
        <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {isNew ? 'Novo documento' : draft.title || 'Editar documento'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                {isNew
                  ? 'Crie um modelo de documento reutilizável'
                  : `Versão ${draft.version} · Atualizado ${fmtDate(draft.updated_at)}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setExpanded(v => !v)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '3px 7px', lineHeight: 1 }}>
                {expanded ? '⊟' : '⊞'}
              </button>
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}>
                ✕
              </button>
            </div>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border2)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '9px 18px', background: 'none', border: 'none',
                  fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer',
                  fontFamily: 'var(--font)', color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -2, whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo das abas */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: tab === 'conteudo' ? 'hidden' : 'auto',
          padding: tab === 'conteudo' ? 0 : '20px 24px',
          display: tab === 'conteudo' ? 'flex' : 'block' }}>

          {/* ─ Aba: Dados ─ */}
          {tab === 'dados' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={s.lbl}>Título <span style={{ color: 'var(--red)' }}>*</span></label>
                <input style={s.inp} value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="Ex: Proposta Comercial — Canal NG Pro" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={s.lbl}>Descrição</label>
                <textarea style={{ ...s.inp, height: 68, resize: 'vertical' }}
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="Descreva brevemente o propósito deste documento…" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={s.lbl}>Categoria</label>
                  <select style={s.inp} value={draft.categoria}
                    onChange={e => setDraft(d => ({ ...d, categoria: e.target.value }))}>
                    {Object.entries(CATEGORIA_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={s.lbl}>Status</label>
                  <select style={s.inp} value={draft.status}
                    onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview dos badges */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--surface2)',
                borderRadius: 8, border: '1px solid var(--border2)', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Prévia:</span>
                <CategoriaBadge categoria={draft.categoria} />
                <StatusBadge status={draft.status} />
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                  v{draft.version}
                </span>
              </div>

              {/* Metadados (somente edição) */}
              {!isNew && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                  padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8,
                  border: '1px solid var(--border2)' }}>
                  {[
                    { lbl: 'Criado por', val: draft.created_by },
                    { lbl: 'Criado em', val: fmtDate(draft.created_at) },
                    { lbl: 'Última edição', val: fmtDate(draft.updated_at) },
                    { lbl: 'Versão atual', val: `v${draft.version}` },
                  ].map(({ lbl, val }) => (
                    <div key={lbl}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{lbl}</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: lbl === 'Versão atual' ? 'var(--mono)' : 'var(--font)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─ Aba: Conteúdo ─ */}
          {tab === 'conteudo' && (
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* Painel lateral de recursos */}
              <div style={{ width: 260, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <DocResourcesPanel onInsert={insertAtCursor} />
              </div>

              {/* Editor */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                borderLeft: '1px solid var(--border2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 16px', borderBottom: '1px solid var(--border2)', flexShrink: 0,
                  background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Markdown — <code style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--mono)' }}># Título</code>{' '}
                    <code style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--mono)' }}>**negrito**</code>{' '}
                    <code style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--mono)' }}>- lista</code>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {draft.content?.length || 0} chars
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  style={{ flex: 1, width: '100%', padding: '16px 18px',
                    border: 'none', outline: 'none',
                    background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
                    lineHeight: 1.75, fontFamily: 'var(--mono)',
                    resize: 'none', boxSizing: 'border-box' }}
                  value={draft.content}
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  placeholder="Digite o conteúdo do documento em Markdown…&#10;Use o painel à esquerda para inserir variáveis e blocos prontos."
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* ─ Aba: Histórico ─ */}
          {tab === 'historico' && (
            isNew
              ? <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💾</div>
                  <div style={{ fontSize: 13 }}>Salve o documento primeiro para ver o histórico.</div>
                </div>
              : <HistoricoPanel docId={draft.id} logs={allLogs} />
          )}
        </div>
        </div>{/* fim wrapper duplo */}

        {/* Footer */}
        <div style={{ padding: '12px 24px 18px', borderTop: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            {!isNew && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 13,
                  cursor: 'pointer', fontFamily: 'var(--font)', padding: 0, fontWeight: 500 }}>
                Excluir documento
              </button>
            )}
            {!isNew && confirmDelete && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Excluir permanentemente?</span>
                <button onClick={() => { onSave(null, draft.id); onClose() }}
                  style={{ padding: '5px 12px', background: 'var(--red)', color: '#fff', border: 'none',
                    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Sim, excluir
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '8px 18px', background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Cancelar
            </button>
            <button onClick={handleSave}
              style={{ padding: '8px 22px', background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {isNew ? 'Criar documento' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Documentos() {
  const { docs, logs, save: saveDoc, remove: deleteDoc, setDocs, setLogs } = useDocuments()
  const [search,   setSearch]   = useLocalState('docs:search', '')
  const [filtroCategoria, setFiltroCategoria] = useLocalState('docs:filtroCategoria', '')
  const [filtroStatus,    setFiltroStatus]    = useLocalState('docs:filtroStatus', '')
  const [showMetrics, setShowMetrics] = useLocalState('docs:showMetrics', true)
  const [acoesOpen,   setAcoesOpen]   = useState(false)
  const [drawer,      setDrawer]      = useState(null)  // null | 'novo' | doc object
  const acoesRef = useRef(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return docs.filter(d =>
      (!filtroCategoria || d.categoria === filtroCategoria) &&
      (!filtroStatus    || d.status    === filtroStatus) &&
      (!q || d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q))
    ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }, [docs, filtroCategoria, filtroStatus, search])

  const kpis = useMemo(() => ({
    total:    docs.length,
    ativos:   docs.filter(d => d.status === 'ativo').length,
    rascunhos: docs.filter(d => d.status === 'rascunho').length,
    versoes:  docs.reduce((s, d) => s + d.version, 0),
  }), [docs])

  function handleSave(docOrNull, deleteId) {
    if (deleteId) { deleteDoc(deleteId); return }
    saveDoc(docOrNull)
  }

  function handleAddLog(log) { setLogs(prev => [...prev, log]) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      <div style={{ flexShrink: 0, padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Header ── */}
        <div style={pg.pageHeader}>
          <div>
            <div style={pg.breadcrumb}>
              <span>Operação</span><span style={pg.sep}>›</span><span>Documentos</span>
            </div>
            <h1 style={pg.title}>Documentos</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowMetrics(v => !v)}
              title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
                borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
                color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
              {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div ref={acoesRef} style={{ position: 'relative' }}>
              <button style={{ ...pg.ghostBtn, ...(acoesOpen ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}
                onClick={() => setAcoesOpen(v => !v)}>
                Ações <span style={{ fontSize: 10 }}>▾</span>
              </button>
              {acoesOpen && <AcoesDropdown onClose={() => setAcoesOpen(false)} anchorRef={acoesRef} />}
            </div>
            <Button onClick={() => setDrawer('novo')}>+ Novo documento</Button>
          </div>
        </div>

        {/* ── KPIs retráteis ── */}
        <div style={{ display: 'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease', overflow: 'hidden' }}>
          <div style={{ minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, paddingBottom: 4 }}>
              <KpiCard label="Documentos"  value={kpis.total}     color="var(--border)" />
              <KpiCard label="Ativos"      value={kpis.ativos}    color="#10B981" />
              <KpiCard label="Rascunhos"   value={kpis.rascunhos} color="#F59E0B" />
              <KpiCard label="Total de versões" value={kpis.versoes}  color="#6366F1" />
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={pg.toolbar}>
          <div style={pg.tbLeft}>
            <div style={pg.searchWrap}>
              <span style={pg.searchIcon}>⌕</span>
              <input style={pg.searchInput} placeholder="Buscar documento por título ou descrição…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={pg.select} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORIA_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <select style={pg.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div style={pg.tbDivider} />
          <div style={pg.tbRight}>
            {(search || filtroCategoria || filtroStatus) && (
              <button style={pg.ghostBtn} onClick={() => { setSearch(''); setFiltroCategoria(''); setFiltroStatus('') }}>
                ✕ Limpar
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
              {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

      </div>

      {/* ── Grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 28px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {search || filtroCategoria || filtroStatus ? 'Nenhum documento encontrado' : 'Nenhum documento ainda'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {search || filtroCategoria || filtroStatus ? 'Tente ajustar os filtros' : 'Crie o primeiro clicando em "+ Novo documento"'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, paddingTop: 8 }}>
            {filtered.map(doc => (
              <DocCard key={doc.id} doc={doc} onClick={() => setDrawer(doc)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <DocDrawer
          doc={drawer === 'novo' ? null : drawer}
          logs={logs}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
          onAddLog={handleAddLog}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const pg = {
  pageHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  breadcrumb:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  sep:         { color: 'var(--border)' },
  title:       { margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' },
  newBtn:      { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  iconBtn:     { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-muted)', cursor: 'pointer' },
  iconBtnActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-glow)' },
  ghostBtn:    { height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-soft)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' },
  toolbar:     { background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 8 },
  tbLeft:      { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexShrink: 1, minWidth: 0 },
  tbDivider:   { width: 1, height: 24, background: 'var(--border)', flexShrink: 0 },
  tbRight:     { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  searchWrap:  { position: 'relative', flexShrink: 0 },
  searchIcon:  { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' },
  searchInput: { width: 280, height: 36, padding: '0 10px 0 28px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' },
  select:      { height: 36, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
}

const s = {
  lbl: { fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: 0.4 },
  inp: { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7,
    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none',
    fontFamily: 'var(--font)', boxSizing: 'border-box' },
}
