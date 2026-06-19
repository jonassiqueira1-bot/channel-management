import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { TIPOS_ACAO as TIPOS_ACAO_DEFAULT, STATUS_ACAO } from '../data/mockAcoes'
import { useActions } from '../hooks/useActions'
import { useBranches } from '../hooks/useBranches'
import { STORAGE_KEY as TIPOS_KEY } from './settings/TiposAcao'
import Button from '../components/Button'
import { FullPageEdit, FPESection, FPEField } from '../components/ui'

const ACCENT = 'var(--accent)'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}

function fmtPeriodo(inicio, fim) {
  if (!fim || inicio === fim) return fmtData(inicio)
  return `${fmtData(inicio)} → ${fmtData(fim)}`
}

function novoId(lista) { return Math.max(0, ...lista.map(a => a.id)) + 1 }

function listToMap(lista) {
  return Object.fromEntries(lista.map(t => [t.slug, t]))
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function TipoBadge({ tipo, tiposMap }) {
  const map = tiposMap || TIPOS_ACAO_DEFAULT
  const cfg = map[tipo] || map.outros || Object.values(map)[0] || { icon: '◎', label: tipo, bg: '#F3F4F6', text: '#374151', color: '#6B7280' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap', fontFamily: 'var(--mono)',
      border: `1px solid ${cfg.color}33`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_ACAO[status] || STATUS_ACAO.agendado
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap', fontFamily: 'var(--mono)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function VagasBar({ vagas, inscritos }) {
  if (!vagas) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  const pct = Math.min(100, Math.round((inscritos / vagas) * 100))
  const cor = pct >= 90 ? '#EF4444' : pct >= 60 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10,
        fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
        <span>{inscritos}/{vagas}</span>
        <span style={{ color: cor, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'var(--border2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ─── Dropdown inline de Tipo de Ação ─────────────────────────────────────────
const RESPONSAVEIS = [
  { id: 'u1', nome: 'Lucas Ferreira' },
  { id: 'u2', nome: 'Carla Menezes' },
  { id: 'u3', nome: 'Fernanda Rocha' },
  { id: 'u5', nome: 'Mariana Silva' },
]

const EMPTY_ACAO = {
  empresa_id: '', empresa_nome: '',
  tipo: 'treinamento',
  titulo: '', descricao: '',
  data_inicio: '', data_fim: '',
  responsavel_id: 'u1', responsavel_nome: 'Lucas Ferreira',
  local: '', vagas: '', inscritos: 0,
  status: 'agendado',
  tenant_id: 't1',
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{ ...pg.kpi, borderTop: `3px solid ${color || 'var(--border)'}` }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</span>
    </div>
  )
}

// ─── Ícone Olho ───────────────────────────────────────────────────────────────

// ─── Dropdown Ações ────────────────────────────────────────────────────────────
function AcoesDropdown({ onImport, onExport, onClose, anchorRef }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])
  const item = { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    color:'var(--text)', fontFamily:'var(--font)', textAlign:'left', borderRadius:7, transition:'background 0.12s' }
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:600,
      width:200, background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', boxShadow:'0 8px 28px rgba(0,0,0,0.13)', padding:6 }}>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onImport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 11V4M3 7l3-3 3 3M1 2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Importar dados
      </button>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onExport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Exportar dados
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Acoes() {
  const { acoes, save: saveAcao, remove: deleteAcao } = useActions()
  const [franquiasCad] = useLocalState('settings:franquias_v2', [])
  const { branches }   = useBranches()
  const [tiposLista]            = useLocalState(TIPOS_KEY, [])
  const tiposMap = useMemo(() => tiposLista.length ? listToMap(tiposLista) : TIPOS_ACAO_DEFAULT, [tiposLista])
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [savingAcao, setSavingAcao] = useState(false)
  const [busca, setBusca]       = useLocalState('acoes:busca', '')
  const [filtroTipo, setFiltroTipo]     = useLocalState('acoes:filtroTipo', '')
  const [filtroStatus, setFiltroStatus] = useLocalState('acoes:filtroStatus', '')
  const [filtroEmp, setFiltroEmp]       = useLocalState('acoes:filtroEmp', '')
  const [showMetrics, setShowMetrics]   = useLocalState('acoes:showMetrics', true)
  const [view, setView]                 = useLocalState('acoes:view', 'lista')
  const [acoesOpen, setAcoesOpen]       = useState(false)
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useLocalState('acoes:periodoIni', '')
  const [filtroPeriodoFim, setFiltroPeriodoFim]       = useLocalState('acoes:periodoFim', '')
  const [filtroResp, setFiltroResp]     = useLocalState('acoes:filtroResp', '')
  const acoesRef                        = useRef(null)

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return acoes.filter(a =>
      (!filtroTipo   || a.tipo === filtroTipo) &&
      (!filtroStatus || a.status === filtroStatus) &&
      (!filtroEmp    || a.empresa_id === Number(filtroEmp)) &&
      (!filtroPeriodoInicio || a.data_inicio >= filtroPeriodoInicio) &&
      (!filtroPeriodoFim    || a.data_inicio <= filtroPeriodoFim) &&
      (!filtroResp   || a.responsavel_nome?.toLowerCase().includes(filtroResp.toLowerCase())) &&
      (!q || a.titulo.toLowerCase().includes(q) ||
             a.empresa_nome.toLowerCase().includes(q) ||
             a.responsavel_nome.toLowerCase().includes(q))
    ).sort((a, b) => (a.data_inicio < b.data_inicio ? 1 : -1))
  }, [acoes, filtroTipo, filtroStatus, filtroEmp, filtroPeriodoInicio, filtroPeriodoFim, filtroResp, busca])

  const kpis = {
    total:     acoes.length,
    agendadas: acoes.filter(a => a.status === 'agendado').length,
    realizadas:acoes.filter(a => a.status === 'realizado').length,
    canceladas:acoes.filter(a => a.status === 'cancelado').length,
  }

  // Franquias para seleção: cadastro de Configurações → Franquias; fallback para branches do tenant
  const franquiasOpts = useMemo(() => {
    if (franquiasCad.length > 0)
      return franquiasCad.filter(f => f.situacao !== 'inativo')
        .map(f => ({ id: String(f.id), nome: f.codigo ? `[${f.codigo}] ${f.nome}` : f.nome }))
    return branches.map(b => ({ id: b.id, nome: b.name }))
  }, [franquiasCad, branches])

  const empresasUnicas = useMemo(() => {
    const ids = new Set(acoes.map(a => String(a.empresa_id)))
    return franquiasOpts.filter(f => ids.has(f.id))
  }, [acoes, franquiasOpts])

  const temFiltro = busca || filtroTipo || filtroStatus || filtroEmp || filtroPeriodoInicio || filtroPeriodoFim || filtroResp

  function abrirEdicaoAcao(acao) {
    const a = acao || { ...EMPTY_ACAO }
    setEditando(acao || null)
    setEditForm({ ...EMPTY_ACAO, ...a, vagas: a.vagas || '', empresa_id: a.empresa_id || '' })
  }

  function setAcaoField(f, v) { setEditForm(p => ({ ...p, [f]: v })) }

  function salvarAcao() {
    if (!editForm.titulo.trim()) return alert('Título obrigatório')
    if (!editForm.empresa_id)    return alert('Selecione a unidade/franquia')
    if (!editForm.data_inicio)   return alert('Data de início obrigatória')
    const emp  = franquiasOpts.find(f => String(f.id) === String(editForm.empresa_id))
    const resp = RESPONSAVEIS.find(r => r.id === editForm.responsavel_id)
    setSavingAcao(true)
    saveAcao({
      ...editForm,
      id:               editando?.id || novoId([]),
      empresa_id:       editForm.empresa_id,
      empresa_nome:     emp?.nome || '',
      responsavel_nome: resp?.nome || '',
      vagas:            editForm.vagas ? Number(editForm.vagas) : null,
      criado_em:        editando?.criado_em || new Date().toISOString(),
    })
    setSavingAcao(false)
    setEditando(null)
    setEditForm(null)
  }

  function deletarAcao(id) {
    deleteAcao(id)
    setEditando(null)
    setEditForm(null)
  }

  const empresasAtivas = franquiasOpts

  if (editForm !== null) {
    const isEditing = !!editando?.id
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Ações', onClick: () => { setEditando(null); setEditForm(null) } }]}
        title={isEditing ? editando.titulo || 'Ação' : 'Nova ação'}
        subtitle="Atividade operacional com unidade de franquia"
        onSave={salvarAcao}
        onCancel={() => { setEditando(null); setEditForm(null) }}
        onDelete={isEditing ? () => deletarAcao(editando.id) : undefined}
        saving={savingAcao}
        saveLabel={isEditing ? 'Salvar alterações' : 'Criar ação'}
      >
        <FPESection label="Tipo e título" noBorder>
          <FPEField label="Tipo de ação" required>
            <select className="fpe-field" value={editForm.tipo} onChange={e => setAcaoField('tipo', e.target.value)}>
              {Object.entries(tiposMap).map(([k, c]) => (
                <option key={k} value={k}>{c.icon} {c.label}</option>
              ))}
            </select>
          </FPEField>
          <FPEField label="Título" required>
            <input className="fpe-field" value={editForm.titulo} onChange={e => setAcaoField('titulo', e.target.value)} placeholder="Ex: Treinamento Técnico Plataforma v3" />
          </FPEField>
        </FPESection>
        <FPESection label="Unidade e responsável">
          <FPEField label="Unidade / Franquia" required>
            <select className="fpe-field" value={editForm.empresa_id} onChange={e => setAcaoField('empresa_id', e.target.value)}>
              <option value="">— Selecione —</option>
              {empresasAtivas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </FPEField>
          <FPEField label="Responsável (ISV)">
            <select className="fpe-field" value={editForm.responsavel_id} onChange={e => setAcaoField('responsavel_id', e.target.value)}>
              {RESPONSAVEIS.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </FPEField>
        </FPESection>
        <FPESection label="Datas e local">
          <FPEField label="Data de início" required>
            <input className="fpe-field" type="date" value={editForm.data_inicio} onChange={e => setAcaoField('data_inicio', e.target.value)} />
          </FPEField>
          <FPEField label="Data de fim">
            <input className="fpe-field" type="date" value={editForm.data_fim || ''} onChange={e => setAcaoField('data_fim', e.target.value)} />
          </FPEField>
          <FPEField label="Local">
            <input className="fpe-field" value={editForm.local || ''} onChange={e => setAcaoField('local', e.target.value)} placeholder="Ex: Online / São Paulo" />
          </FPEField>
          <FPEField label="Vagas">
            <input className="fpe-field" type="number" min="0" value={editForm.vagas} onChange={e => setAcaoField('vagas', e.target.value)} placeholder="Deixe vazio para ilimitado" />
          </FPEField>
        </FPESection>
        {isEditing && (
          <FPESection label="Status">
            <FPEField label="Status da ação" span={2}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_ACAO).map(([k, cfg]) => {
                  const ativo = editForm.status === k
                  return (
                    <button key={k} type="button" onClick={() => setAcaoField('status', k)}
                      style={{ padding: '6px 13px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: ativo ? 700 : 500,
                        border: `1.5px solid ${ativo ? cfg.color : '#D4D4D8'}`,
                        background: ativo ? cfg.bg : 'transparent', color: ativo ? cfg.text : '#71717A', transition: 'all 0.15s' }}>
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </FPEField>
          </FPESection>
        )}
        <FPESection label="Descrição">
          <FPEField label="Descrição / Objetivos" span={2}>
            <textarea className="fpe-field" value={editForm.descricao || ''} onChange={e => setAcaoField('descricao', e.target.value)} placeholder="Objetivos, conteúdo programático, observações…" rows={4} />
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      <div style={{ flexShrink: 0, padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Page header ── */}
        <div style={pg.pageHeader}>
          <div>
            <div style={pg.breadcrumb}>
              <span>Operação</span><span style={pg.sep}>›</span><span>Ações</span>
            </div>
            <h1 style={pg.title}>Ações</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button
              onClick={() => setShowMetrics(v => !v)}
              title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
                borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
                color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
              {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div ref={acoesRef} style={{ position:'relative' }}>
              <button style={{ ...pg.ghostBtn, ...(acoesOpen ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}) }}
                onClick={() => setAcoesOpen(v => !v)}>
                Ações <span style={{ fontSize:10 }}>▾</span>
              </button>
              {acoesOpen && (
                <AcoesDropdown
                  onImport={() => setAcoesOpen(false)}
                  onExport={() => setAcoesOpen(false)}
                  onClose={() => setAcoesOpen(false)}
                  anchorRef={acoesRef}
                />
              )}
            </div>
            <Button onClick={() => abrirEdicaoAcao(null)}>+ Nova ação</Button>
          </div>
        </div>

        {/* ── KPIs retráteis ── */}
        <div style={{ display: 'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease', overflow: 'hidden' }}>
          <div style={{ minHeight: 0 }}>
            <div style={pg.kpis}>
              <KpiCard label="Total"      value={kpis.total}      color="var(--border)" />
              <KpiCard label="Agendadas"  value={kpis.agendadas}  color="#F59E0B" />
              <KpiCard label="Realizadas" value={kpis.realizadas} color="#10B981" />
              <KpiCard label="Canceladas" value={kpis.canceladas} color="#EF4444" />
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={pg.toolbar}>
          <div style={pg.tbLeft}>
            {/* Busca */}
            <div style={pg.searchWrap}>
              <span style={pg.searchIcon}>⌕</span>
              <input style={pg.searchInput} placeholder="Buscar título, unidade ou responsável…"
                value={busca} onChange={e => setBusca(e.target.value)} />
            </div>

            {/* Tipo */}
            <select style={pg.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(tiposMap).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>

            {/* Unidade */}
            <select style={pg.select} value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}>
              <option value="">Todas as unidades</option>
              {empresasUnicas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>

            {/* Período */}
            <input type="date" style={pg.select} value={filtroPeriodoInicio}
              onChange={e => setFiltroPeriodoInicio(e.target.value)} title="Data início" />
            <input type="date" style={pg.select} value={filtroPeriodoFim}
              onChange={e => setFiltroPeriodoFim(e.target.value)} title="Data fim" />

            {/* Responsável */}
            <input style={{ ...pg.searchInput, width:140 }} placeholder="Responsável…"
              value={filtroResp} onChange={e => setFiltroResp(e.target.value)} />
          </div>

          <div style={pg.tbDivider} />

          <div style={pg.tbRight}>
            {/* Status */}
            <select style={pg.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_ACAO).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* View toggle */}
            <div style={pg.viewToggle}>
              <button style={{ ...pg.viewBtn, ...(view === 'lista' ? pg.viewBtnOn : {}) }}
                title="Lista" onClick={() => setView('lista')}>☰</button>
              <button style={{ ...pg.viewBtn, ...(view === 'card' ? pg.viewBtnOn : {}) }}
                title="Cards" onClick={() => setView('card')}>⊞</button>
            </div>

            {/* Limpar */}
            {temFiltro && (
              <button style={pg.ghostBtn}
                onClick={() => { setBusca(''); setFiltroTipo(''); setFiltroStatus(''); setFiltroEmp('');
                  setFiltroPeriodoInicio(''); setFiltroPeriodoFim(''); setFiltroResp('') }}>
                ✕ Limpar
              </button>
            )}
          </div>
        </div>

        {/* Contagem */}
        <div style={pg.resultRow}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {lista.length} de {acoes.length} ações
          </span>
        </div>

      </div>

      {/* ── Card view ── */}
      {view === 'card' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 24px' }}>
          {lista.length === 0 && (
            <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🗓</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhuma ação encontrada</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{temFiltro ? 'Tente ajustar os filtros' : 'Crie a primeira ação clicando em "+ Nova ação"'}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, paddingTop: 4 }}>
            {lista.map(acao => {
              const hoje = new Date().toISOString().slice(0, 10)
              const atrasado = acao.status === 'agendado' && acao.data_inicio < hoje
              const tipoCfg = (tiposMap || TIPOS_ACAO_DEFAULT)[acao.tipo] || { icon: '◎', color: '#6B7280', bg: '#F3F4F6' }
              return (
                <div key={acao.id} onClick={() => abrirEdicaoAcao(acao)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border2)',
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                    boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: 10,
                    borderTop: `3px solid ${tipoCfg.color}`, transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>

                  {/* Header do card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, flex: 1 }}>
                      {acao.titulo}
                    </div>
                    <TipoBadge tipo={acao.tipo} tiposMap={tiposMap} />
                  </div>

                  {/* Empresa */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>🏢</span> {acao.empresa_nome}
                  </div>

                  {/* Local */}
                  {acao.local && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>📍</span> {acao.local}
                    </div>
                  )}

                  {/* Footer do card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%',
                        background: `${ACCENT}18`, border: `1.5px solid ${ACCENT}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 800, color: ACCENT, fontFamily: 'var(--mono)', flexShrink: 0 }}>
                        {acao.responsavel_nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{acao.responsavel_nome.split(' ')[0]}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: atrasado ? 'var(--red)' : 'var(--text-muted)' }}>
                        {atrasado && '⚠ '}{fmtPeriodo(acao.data_inicio, acao.data_fim)}
                      </span>
                      <StatusBadge status={acao.status} />
                    </div>
                  </div>

                  {/* Vagas */}
                  {acao.vagas && (
                    <VagasBar vagas={acao.vagas} inscritos={acao.inscritos} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tabela ── */}
      {view === 'lista' && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 1 }}>
              {['Ação', 'Unidade / Franquia', 'Tipo', 'Data / Período', 'Responsável (ISV)', 'Vagas', 'Status', ''].map((h, i) => (
                <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--mono)', whiteSpace: 'nowrap', textAlign: i === 7 ? 'center' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🗓</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhuma ação encontrada</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {temFiltro ? 'Tente ajustar os filtros' : 'Crie a primeira ação clicando em "+ Nova ação"'}
                  </div>
                </td>
              </tr>
            )}
            {lista.map(acao => {
              const hoje = new Date().toISOString().slice(0, 10)
              const atrasado = acao.status === 'agendado' && acao.data_inicio < hoje
              return (
                <tr key={acao.id}
                  style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer' }}
                  onClick={() => abrirEdicaoAcao(acao)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle', maxWidth: 240 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                      {acao.titulo}
                    </div>
                    {acao.local && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                        📍 {acao.local}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-soft)' }}>
                      {acao.empresa_nome}
                    </span>
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                    <TipoBadge tipo={acao.tipo} tiposMap={tiposMap} />
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle',
                    fontFamily: 'var(--mono)', fontSize: 12,
                    color: atrasado ? 'var(--red)' : 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                    {atrasado && <span style={{ marginRight: 4 }}>⚠</span>}
                    {fmtPeriodo(acao.data_inicio, acao.data_fim)}
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%',
                        background: `${ACCENT}18`, border: `1.5px solid ${ACCENT}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: ACCENT, fontFamily: 'var(--mono)', flexShrink: 0 }}>
                        {acao.responsavel_nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {acao.responsavel_nome.split(' ')[0]}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle', minWidth: 90 }}>
                    <VagasBar vagas={acao.vagas} inscritos={acao.inscritos} />
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                    <StatusBadge status={acao.status} />
                  </td>

                  <td style={{ padding: '11px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); abrirEdicaoAcao(acao) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 14, padding: '4px 8px', borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.color = ACCENT}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      ✎
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const pg = {
  pageHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconBtn:     { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer' },
  iconBtnActive: { borderColor:'var(--accent)', color:'var(--accent)', background:'var(--accent-glow)' },
  breadcrumb:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  sep:         { color: 'var(--border)' },
  title:       { margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' },
  newBtn:      { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  kpis:        { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, paddingBottom: 4 },
  kpi:         { background: 'var(--surface)', borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)', boxShadow: 'var(--shadow)' },
  toolbar:     { background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tbLeft:      { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  tbRight:     { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  tbDivider:   { width: 1, height: 24, background: 'var(--border)', flexShrink: 0, margin: '0 4px' },
  searchWrap:  { position: 'relative', width: 260, flexShrink: 0 },
  searchIcon:  { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' },
  searchInput: { width: '100%', height: 36, padding: '0 10px 0 28px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' },
  select:      { height: 36, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  ghostBtn:    { height: 36, display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 },
  viewToggle:  { display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', padding: 3, gap: 2, flexShrink: 0 },
  viewBtn:     { width: 34, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6, fontSize: 14, transition: 'all 0.15s' },
  viewBtnOn:   { background: 'var(--accent)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' },
  resultRow:   { display: 'flex', alignItems: 'center', gap: 12 },
}

