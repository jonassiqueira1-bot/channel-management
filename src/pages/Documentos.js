import { useState, useMemo, useRef } from 'react'
import { FileText, CheckCircle2, Clock, GitBranch } from 'lucide-react'
import { CATEGORIA_CFG, STATUS_CFG, EVENTO_CFG } from '../data/mockDocumentos'
import { useDocuments } from '../hooks/useDocuments'
import Button from '../components/Button'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormSection, FormGrid, FormField } from '../components/ui/SlideOver'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid()   { return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
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

// ─── Histórico ────────────────────────────────────────────────────────────────
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
            <div style={{ width: 27, height: 27, borderRadius: '50%', background: cfg.bg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: cfg.color,
              border: `1.5px solid ${cfg.color}55`, zIndex: 1 }}>
              {cfg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{cfg.label}</div>
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

// ─── Painel de recursos (variáveis + blocos) ──────────────────────────────────
const MERGE_FIELDS = [
  {
    group: 'Oportunidade', icon: '💼', color: 'var(--accent)', bg: '#EEF2FF',
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
    group: 'Contato', icon: '👤', color: 'var(--accent)', bg: '#EDE9FE',
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
      { token: '{{vendedor.nome}}',  label: 'Nome',   origem: 'Usuários → usuário logado ou responsável pela oportunidade', uso: 'Nome do vendedor/representante comercial.' },
      { token: '{{vendedor.cargo}}', label: 'Cargo',  origem: 'Usuários → campo "Cargo" do perfil',                        uso: 'Cargo institucional do responsável.' },
      { token: '{{vendedor.email}}', label: 'E-mail', origem: 'Usuários → campo "E-mail" do perfil',                       uso: 'E-mail profissional para assinatura.' },
    ],
  },
  {
    group: 'Sistema', icon: '📅', color: '#F59E0B', bg: '#FEF3C7',
    fields: [
      { token: '{{sistema.data_hoje}}',       label: 'Data de hoje',   origem: 'Gerado automaticamente no momento da exportação', uso: 'Data do dia formatada em português (ex: 12 de junho de 2026).' },
      { token: '{{sistema.mes_ano}}',         label: 'Mês/Ano',        origem: 'Gerado automaticamente no momento da exportação', uso: 'Mês e ano por extenso (ex: junho de 2026).' },
      { token: '{{sistema.numero_proposta}}', label: 'Nº da proposta', origem: 'Sequencial automático gerado pelo sistema',       uso: 'Número único da proposta (ex: PROP-2026-0042).' },
    ],
  },
]

const BLOCKS = [
  { label: 'Cabeçalho institucional', icon: '🏷️', desc: 'Logo, nome da empresa emissora e data',
    content: `# {{oportunidade.empresa}} — {{sistema.mes_ano}}\n\n**Documento preparado por:** {{vendedor.nome}} · {{vendedor.cargo}}\n**Data:** {{sistema.data_hoje}}\n\n---` },
  { label: 'Introdução da proposta', icon: '📝', desc: 'Parágrafo de abertura personalizável',
    content: `## Apresentação\n\nPrezado(a) **{{contato.nome}}**,\n\nÉ com satisfação que apresentamos esta proposta comercial para a **{{empresa.nome}}**, considerando as necessidades discutidas durante nossa conversa.\n\nNosso objetivo é apresentar a solução mais adequada para o seu contexto, com transparência em relação a investimentos e próximos passos.` },
  { label: 'Tabela de investimento', icon: '💰', desc: 'Tabela com módulos, valores e total',
    content: `## Investimento\n\n| Módulo | Valor Mensal |\n|--------|-------------|\n| CDU (usuários) | R$ X.XXX |\n| SMS | R$ X.XXX |\n| Serviços | R$ X.XXX |\n| **Total líquido** | **{{oportunidade.valor}}** |\n\n> Os valores acima são válidos por 30 dias a partir de {{sistema.data_hoje}}.` },
  { label: 'Próximos passos', icon: '🚀', desc: 'Checklist de ações pós-proposta',
    content: `## Próximos Passos\n\n- [ ] Revisão e aprovação da proposta por {{contato.nome}}\n- [ ] Assinatura do contrato\n- [ ] Kick-off de implementação\n- [ ] Configuração inicial do ambiente\n- [ ] Treinamento da equipe\n\n**Prazo para aceite:** {{oportunidade.prazo}}` },
  { label: 'Bloco de assinatura', icon: '✍️', desc: 'Área de assinatura com dados do vendedor',
    content: `---\n\n## Aceite e Assinatura\n\n**{{empresa.nome}}**\n\n_______________________________\n{{contato.nome}} — {{contato.cargo}}\n\n**Boostly / Emitente**\n\n_______________________________\n{{vendedor.nome}} — {{vendedor.cargo}}\n{{vendedor.email}} · {{sistema.data_hoje}}` },
  { label: 'Escopo e objetivos', icon: '🎯', desc: 'Seção de escopo do projeto/contrato',
    content: `## Escopo da Solução\n\n### Objetivos\n\n- Objetivo principal a ser definido\n- Objetivo secundário\n- Critérios de sucesso\n\n### O que está incluído\n\n- Item 1\n- Item 2\n\n### O que não está incluído\n\n- Fora do escopo 1` },
]

function DocResourcesPanel({ onInsert }) {
  const [panelTab,  setPanelTab]  = useState('variaveis')
  const [openGroup, setOpenGroup] = useState('Oportunidade')
  const [tooltip,   setTooltip]   = useState(null)
  const [copied,    setCopied]    = useState(null)

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
    fieldRow:  { display:'flex', alignItems:'center', gap:6, padding:'5px 6px', borderRadius:7, cursor:'pointer', marginBottom:2 },
    fieldTok:  { fontSize:10, fontFamily:'var(--mono)', background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:5, padding:'1px 5px', color:'var(--text-muted)', flexShrink:0, maxWidth:130,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    fieldLbl:  { fontSize:11, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    insertBtn: (active) => ({ padding:'2px 7px', background: active ? '#D1FAE5' : 'var(--accent-glow)',
                  border: active ? '1px solid #10B981' : '1px solid transparent', borderRadius:5, fontSize:10,
                  color: active ? '#065F46' : 'var(--accent)', cursor:'pointer', fontFamily:'var(--font)',
                  fontWeight:600, flexShrink:0, whiteSpace:'nowrap' }),
    infoBox:   { margin:'0 8px 8px', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 12px' },
    infoTitle: { fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:4 },
    infoRow:   { fontSize:11, color:'var(--text-muted)', lineHeight:1.6, marginBottom:3 },
    infoLabel: { fontWeight:600, color:'var(--text-soft)' },
    blockCard: { margin:'0 8px 8px', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:9, padding:'10px 12px', cursor:'pointer', transition:'border-color 0.15s' },
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
        <button style={ps.tabBtn(panelTab==='blocos')}    onClick={() => setPanelTab('blocos')}>Blocos</button>
      </div>
      <div style={ps.body}>
        {panelTab === 'variaveis' && (
          <>
            <div style={{ padding:'8px 14px 6px', fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
              Clique em <strong style={{ color:'var(--accent)' }}>+ Inserir</strong> para adicionar a variável na posição do cursor.
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
                          <div style={ps.fieldRow} onMouseEnter={() => setTooltip(f)} onMouseLeave={() => setTooltip(null)}>
                            <span style={ps.fieldTok}>{f.token}</span>
                            <span style={ps.fieldLbl}>{f.label}</span>
                            <button style={ps.insertBtn(copied === f.token)} onClick={() => handleInsert(f.token)}>
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
              Insira blocos prontos com variáveis pré-configuradas.
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
                <button style={ps.blockBtn(copied === blk.label)} onClick={() => handleInsert('\n\n' + blk.content + '\n')}>
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

// ─── Conteúdo do SlideOver ────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}

function DocForm({ doc: initial, logs: allLogs, onClose, onSave, onAddLog, uploadFile, removeFile }) {
  const isNew       = !initial?.id
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [tab,      setTab]      = useState('dados')
  const [draft,    setDraft]    = useState(() => initial || {
    id: uid(), tenant_id: 't1',
    title: '', description: '', categoria: 'proposta',
    status: 'rascunho', version: 1, content: '',
    file_url: null, file_name: null, file_size: null, file_path: null,
    created_by: 'Você', created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  const [saving,     setSaving]     = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [dragOver,   setDragOver]   = useState(false)

  const docLogs = useMemo(
    () => allLogs.filter(l => l.doc_id === draft.id).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)),
    [allLogs, draft.id]
  )

  const TABS = [
    { id: 'dados',     label: 'Dados' },
    { id: 'conteudo',  label: 'Conteúdo' },
    { id: 'historico', label: `Histórico (${docLogs.length})` },
  ]

  function handleSave() {
    if (!draft.title.trim()) { alert('Título é obrigatório'); return }
    const now = new Date().toISOString()
    setSaving(true)
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
      if (campos.length > 0 && !statusEvento)
        onAddLog({ id: logId(), doc_id: saved.id, evento: 'editado', campos, usuario: 'Você', criado_em: now })
      if (statusEvento)
        onAddLog({ id: logId(), doc_id: saved.id, evento: statusEvento, campos, usuario: 'Você', criado_em: now })
    }
    setSaving(false)
    onClose()
  }

  async function handleFileSelect(file) {
    if (!file) return
    setUploading(true)
    const res = await uploadFile(file)
    setUploading(false)
    if (!res.ok) { alert('Erro ao enviar arquivo: ' + res.message); return }
    setDraft(d => ({ ...d, file_url: res.url, file_name: res.name, file_size: res.size, file_path: res.path || null }))
  }

  async function handleRemoveFile() {
    if (draft.file_path) await removeFile(draft.file_path)
    setDraft(d => ({ ...d, file_url: null, file_name: null, file_size: null, file_path: null }))
  }

  function insertAtCursor(text) {
    const el = textareaRef.current
    if (!el) { setDraft(d => ({ ...d, content: (d.content || '') + text })); return }
    const start  = el.selectionStart
    const end    = el.selectionEnd
    const before = (draft.content || '').slice(0, start)
    const after  = (draft.content || '').slice(end)
    setDraft(d => ({ ...d, content: before + text + after }))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 9, padding: 3, border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500, fontFamily: 'var(--font)',
              background: tab === t.id ? 'var(--surface)' : 'none',
              color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Aba: Dados ── */}
      {tab === 'dados' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormSection label="Identificação">
            <FormGrid cols={1}>
              <FormField label="Título" required>
                <input className="so-field" value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="Ex: Proposta Comercial — Boostly Pro" />
              </FormField>
              <FormField label="Descrição">
                <textarea className="so-field" value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="Descreva brevemente o propósito deste documento…"
                  rows={3} style={{ resize: 'vertical' }} />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Categoria">
                <select className="so-field" value={draft.categoria}
                  onChange={e => setDraft(d => ({ ...d, categoria: e.target.value }))}>
                  {Object.entries(CATEGORIA_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status">
                <select className="so-field" value={draft.status}
                  onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </FormField>
            </FormGrid>
            {/* Prévia de badges */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--surface2)',
              borderRadius: 8, border: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Prévia:</span>
              <CategoriaBadge categoria={draft.categoria} />
              <StatusBadge status={draft.status} />
              <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                v{draft.version}
              </span>
            </div>
          </FormSection>

          {/* ── Arquivo para download ── */}
          <FormSection label="Arquivo para download">
            {draft.file_url ? (
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9 }}>
                <div style={{ fontSize:24 }}>📎</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {draft.file_name}
                  </div>
                  {draft.file_size && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {fmtBytes(draft.file_size)}
                    </div>
                  )}
                </div>
                <a href={draft.file_url} target="_blank" rel="noreferrer" download={draft.file_name}
                  style={{ fontSize:12, color:'var(--accent)', fontWeight:600, textDecoration:'none',
                    padding:'5px 10px', border:'1px solid var(--accent)', borderRadius:6, flexShrink:0 }}>
                  Baixar
                </a>
                <button type="button" onClick={handleRemoveFile}
                  style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                    fontSize:14, padding:'4px 6px', borderRadius:5 }}
                  onMouseEnter={e=>e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
                  ✕
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]) }}
                onClick={() => fileInputRef.current?.click()}
                style={{ border:`2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius:9, padding:'20px 16px', textAlign:'center', cursor:'pointer',
                  background: dragOver ? 'var(--accent-glow, #eef2ff)' : 'var(--surface2)',
                  transition:'all 0.15s' }}>
                <input ref={fileInputRef} type="file" style={{ display:'none' }}
                  onChange={e => handleFileSelect(e.target.files[0])} />
                {uploading ? (
                  <div style={{ fontSize:13, color:'var(--text-muted)' }}>Enviando…</div>
                ) : (
                  <>
                    <div style={{ fontSize:22, marginBottom:6 }}>📎</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-soft)' }}>
                      Arraste um arquivo ou{' '}
                      <span style={{ color:'var(--accent)', textDecoration:'underline' }}>clique para selecionar</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                      PDF, Word, Excel, PowerPoint, imagens…
                    </div>
                  </>
                )}
              </div>
            )}
          </FormSection>

          {!isNew && (
            <FormSection label="Informações">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                {[
                  { lbl: 'Criado por',    val: draft.created_by },
                  { lbl: 'Criado em',     val: fmtDate(draft.created_at) },
                  { lbl: 'Última edição', val: fmtDate(draft.updated_at) },
                  { lbl: 'Versão atual',  val: `v${draft.version}` },
                ].map(({ lbl, val }) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: lbl === 'Versão atual' ? 'var(--mono)' : 'inherit' }}>{val}</div>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
        </div>
      )}

      {/* ── Aba: Conteúdo ── */}
      {tab === 'conteudo' && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', minHeight: 480 }}>
          <div style={{ display: 'flex', height: 480 }}>
            <div style={{ width: 240, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
              <DocResourcesPanel onInsert={insertAtCursor} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface2)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Markdown —{' '}
                  {['# Título', '**negrito**', '- lista'].map(c => (
                    <code key={c} style={{ background: 'var(--surface)', padding: '1px 4px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--mono)', marginRight: 4 }}>{c}</code>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                  {draft.content?.length || 0} chars
                </span>
              </div>
              <textarea
                ref={textareaRef}
                style={{ flex: 1, width: '100%', padding: '16px 18px', border: 'none', outline: 'none',
                  background: 'var(--surface)', color: 'var(--text)', fontSize: 13, lineHeight: 1.75,
                  fontFamily: 'var(--mono)', resize: 'none', boxSizing: 'border-box' }}
                value={draft.content}
                onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                placeholder="Digite o conteúdo do documento em Markdown…"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Aba: Histórico ── */}
      {tab === 'historico' && (
        isNew
          ? <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💾</div>
              <div style={{ fontSize: 13 }}>Salve o documento primeiro para ver o histórico.</div>
            </div>
          : <HistoricoPanel docId={draft.id} logs={allLogs} />
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <div>
          {!isNew && (
            <button onClick={() => { if (window.confirm('Excluir este documento?')) { onSave(null, draft.id); onClose() } }}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.35)',
                color: '#EF4444', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Excluir
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>
            {isNew ? 'Criar documento' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Documentos() {
  const { docs, logs, save: saveDoc, remove: deleteDoc, uploadFile, removeFile, setDocs, setLogs } = useDocuments()
  const [search,       setSearch]       = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [drawer,       setDrawer]       = useState(null)  // null | 'novo' | doc object

  const filtered = useMemo(() => {
    const q        = search.toLowerCase().trim()
    const catF     = activeFilters.categoria || []
    const statusF  = activeFilters.status    || []
    return docs.filter(d =>
      (!catF.length    || catF.includes(d.categoria)) &&
      (!statusF.length || statusF.includes(d.status)) &&
      (!q || d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q))
    ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }, [docs, activeFilters, search])

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

  const COLUMNS = [
    { key: 'title', label: 'Documento', render: (val, row) => {
      const cfg     = CATEGORIA_CFG[row.categoria] || CATEGORIA_CFG.outro
      const preview = row.content?.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').split('\n').filter(Boolean)[1] || ''
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {cfg.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{val}</div>
            {(row.description || preview) && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                {row.description || preview}
              </div>
            )}
          </div>
        </div>
      )
    }},
    { key: 'categoria', label: 'Categoria', render: val => <CategoriaBadge categoria={val} /> },
    { key: 'status',    label: 'Status',    render: val => <StatusBadge status={val} /> },
    { key: 'version',   label: 'Versão',    render: val =>
      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontWeight: 600 }}>v{val}</span>
    },
    { key: 'created_by', label: 'Criado por', render: val =>
      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{val || '—'}</span>
    },
    { key: 'updated_at', label: 'Atualizado', render: val =>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtDate(val)}</span>
    },
  ]

  const FILTERS = [
    { key: 'categoria', label: 'Categoria', options: Object.entries(CATEGORIA_CFG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })) },
    { key: 'status',    label: 'Status',    options: Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label })) },
  ]

  const kpisNode = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {[
        { label: 'Documentos',       value: kpis.total,     Icon: FileText,     color: 'var(--border)'  },
        { label: 'Ativos',           value: kpis.ativos,    Icon: CheckCircle2, color: '#10B981'         },
        { label: 'Rascunhos',        value: kpis.rascunhos, Icon: Clock,        color: '#F59E0B'         },
        { label: 'Total de versões', value: kpis.versoes,   Icon: GitBranch,    color: 'var(--accent)'  },
      ].map(m => (
        <div key={m.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, borderTop: `3px solid ${m.color}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${m.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <m.Icon size={16} strokeWidth={1.75} style={{ color: m.color }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{m.value}</div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <BrowseLayout
        data={filtered}
        columns={COLUMNS}
        filters={FILTERS}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        search={search}
        onSearchChange={setSearch}
        keyField="id"
        storageKey="documentos_browse"
        onRowClick={row => setDrawer(row)}
        onNew={() => setDrawer('novo')}
        newLabel="+ Novo documento"
        kpis={kpisNode}
        bulkActions={[
          { label: 'Arquivar', onClick: ids => {
            ids.forEach(id => {
              const d = docs.find(x => x.id === id); if (d) saveDoc({ ...d, status: 'arquivado' })
            })
          }},
          { label: 'Excluir', onClick: ids => {
            if (window.confirm(`Excluir ${ids.length} documento(s)?`)) ids.forEach(id => deleteDoc(id))
          }},
        ]}
        renderCard={row => {
          const cfg     = CATEGORIA_CFG[row.categoria] || CATEGORIA_CFG.outro
          const preview = row.content?.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').split('\n').filter(Boolean)[1] || ''
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 2,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {row.description || preview}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <CategoriaBadge categoria={row.categoria} />
                <StatusBadge status={row.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 8, borderTop: '1px solid var(--border2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>v{row.version}</span>
                  <span style={{ width: 1, height: 10, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.created_by}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {row.file_url && (
                    <a
                      href={row.file_url} target="_blank" rel="noreferrer" download={row.file_name}
                      onClick={e => e.stopPropagation()}
                      style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600,
                        color:'var(--accent)', textDecoration:'none', padding:'3px 8px',
                        border:'1px solid var(--accent)', borderRadius:5, lineHeight:1 }}
                      title={row.file_name}>
                      ↓ Baixar
                    </a>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtDate(row.updated_at)}</span>
                </div>
              </div>
            </div>
          )
        }}
        emptyState={
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {search || Object.keys(activeFilters).length ? 'Nenhum documento encontrado' : 'Nenhum documento ainda'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {search || Object.keys(activeFilters).length ? 'Tente ajustar os filtros' : 'Crie o primeiro clicando em "+ Novo documento"'}
            </div>
          </div>
        }
      />

      <SlideOver
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer && drawer !== 'novo' ? (drawer.title || 'Editar documento') : 'Novo documento'}
        subtitle={drawer && drawer !== 'novo'
          ? `v${drawer.version} · Atualizado ${fmtDate(drawer.updated_at)}`
          : 'Crie um modelo de documento reutilizável'}
        defaultWidth={860}
        showFooter={false}
      >
        {drawer && (
          <DocForm
            doc={drawer === 'novo' ? null : drawer}
            logs={logs}
            onClose={() => setDrawer(null)}
            onSave={handleSave}
            onAddLog={handleAddLog}
            uploadFile={uploadFile}
            removeFile={removeFile}
          />
        )}
      </SlideOver>
    </>
  )
}
