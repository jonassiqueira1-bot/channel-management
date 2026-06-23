import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { TIPOS_ACAO as TIPOS_ACAO_DEFAULT, STATUS_ACAO } from '../data/mockAcoes'
import { useActions } from '../hooks/useActions'
import { useBranches } from '../hooks/useBranches'
import { STORAGE_KEY as TIPOS_KEY } from './settings/TiposAcao'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return ''
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}
function fmtPeriodo(inicio, fim) {
  if (!inicio) return '—'
  if (!fim || fim === inicio) return fmtData(inicio)
  return `${fmtData(inicio)} → ${fmtData(fim)}`
}
function novoId(lista) { return Math.max(0, ...lista.map(a => a.id)) + 1 }
function listToMap(lista) {
  return Object.fromEntries(lista.map(t => [t.key || t.id, t]))
}
function initials(nome) {
  return (nome || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── Badges ───────────────────────────────────────────────────────────────────
function TipoBadge({ tipo, tiposMap }) {
  const cfg = (tiposMap || TIPOS_ACAO_DEFAULT)[tipo] || { icon: '◎', label: tipo, color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
      borderRadius:20, background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:600,
      whiteSpace:'nowrap', border:`1px solid ${cfg.color}22` }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_ACAO[status] || { label: status, color:'#9A9590', bg:'#F1F5F9', text:'#475569' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px',
      borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600,
      fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function VagasBar({ vagas, inscritos = 0 }) {
  if (!vagas) return <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>
  const pct = Math.min(100, Math.round((inscritos / vagas) * 100))
  const cor  = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3, minWidth:80 }}>
      <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
        {inscritos}/{vagas} ({pct}%)
      </div>
      <div style={{ height:4, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:4, transition:'width 0.3s' }} />
      </div>
    </div>
  )
}

function AvatarCell({ nome }) {
  const ACCENT = 'var(--accent)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <div style={{ width:24, height:24, borderRadius:'50%', background:`${ACCENT}18`,
        border:`1.5px solid ${ACCENT}44`, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:9, fontWeight:800, color:ACCENT, fontFamily:'var(--mono)', flexShrink:0 }}>
        {initials(nome)}
      </div>
      <span style={{ fontSize:12, color:'var(--text-soft)' }}>{nome?.split(' ')[0]}</span>
    </div>
  )
}

// ─── SlideOver de cadastro ────────────────────────────────────────────────────
function AcaoSlideOver({ open, initial, onSave, onClose, onDelete, tiposMap, empresasOpts, responsaveisOpts }) {
  const isNew = !initial?.id
  const [form, setForm]   = useState(initial ? { ...EMPTY_ACAO, ...initial } : { ...EMPTY_ACAO })
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})

  useMemo(() => {
    setForm(initial ? { ...EMPTY_ACAO, ...initial, vagas: initial.vagas || '', empresa_id: initial.empresa_id || '' } : { ...EMPTY_ACAO })
    setErrs({})
  }, [initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errs[k]) setErrs(p => ({ ...p, [k]: '' })) }

  function handleSave() {
    const e = {}
    if (!form.titulo.trim()) e.titulo = 'Título é obrigatório'
    if (!form.empresa_id)    e.empresa_id = 'Selecione a unidade/franquia'
    if (!form.data_inicio)   e.data_inicio = 'Data de início é obrigatória'
    if (Object.keys(e).length) { setErrs(e); return }
    const emp  = empresasOpts.find(e => String(e.id) === String(form.empresa_id))
    const resp = responsaveisOpts.find(r => r.id === form.responsavel_id)
    setSaving(true)
    onSave({
      ...form,
      empresa_nome:     emp?.nome || '',
      responsavel_nome: resp?.nome || '',
      vagas:            form.vagas ? Number(form.vagas) : null,
      criado_em:        initial?.criado_em || new Date().toISOString(),
    })
    setSaving(false)
  }

  const headerActions = !isNew ? (
    <Button variant="danger" onClick={() => {
      if (window.confirm('Excluir esta ação?')) onDelete(initial.id)
    }}>Excluir</Button>
  ) : null

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      title={isNew ? 'Nova Ação' : form.titulo || 'Editar Ação'}
      subtitle={isNew ? 'Atividade operacional com unidade de franquia' : form.empresa_nome}
      headerActions={headerActions}
      columns={2}
    >
      <FormGrid cols={2}>

        <FormField label="Tipo de ação" required>
          <select className="so-field" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {Object.entries(tiposMap).map(([k, c]) => (
              <option key={k} value={k}>{c.icon} {c.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Status">
          <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_ACAO).map(([k, c]) => (
              <option key={k} value={k}>{c.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Título" required error={errs.titulo} style={{ gridColumn: 'span 2' }}>
          <input className="so-field" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Treinamento Técnico Plataforma v3"
            style={{ borderColor: errs.titulo ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="Unidade / Franquia" required error={errs.empresa_id} style={{ gridColumn: 'span 2' }}>
          <select className="so-field" value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}
            style={{ borderColor: errs.empresa_id ? '#DC2626' : '' }}>
            <option value="">— Selecione —</option>
            {empresasOpts.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </FormField>

        <FormField label="Responsável (ISV)">
          <select className="so-field" value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}>
            <option value="">— Selecione —</option>
            {responsaveisOpts.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </FormField>

        <FormField label="Local">
          <input className="so-field" value={form.local || ''} onChange={e => set('local', e.target.value)} placeholder="Ex: Online / São Paulo" />
        </FormField>

        <FormField label="Data de início" required error={errs.data_inicio}>
          <input className="so-field" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)}
            style={{ borderColor: errs.data_inicio ? '#DC2626' : '' }} />
        </FormField>

        <FormField label="Data de fim">
          <input className="so-field" type="date" value={form.data_fim || ''} onChange={e => set('data_fim', e.target.value)} />
        </FormField>

        <FormField label="Vagas" style={{ gridColumn: 'span 2' }}>
          <input className="so-field" type="number" min="0" value={form.vagas} onChange={e => set('vagas', e.target.value)} placeholder="Deixe vazio para ilimitado" />
        </FormField>

        <FormField label="Descrição / Objetivos" style={{ gridColumn: 'span 2' }}>
          <textarea className="so-field" rows={4} style={{ resize:'vertical' }} value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Objetivos, conteúdo programático, observações…" />
        </FormField>

      </FormGrid>
    </SlideOver>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Acoes() {
  const { acoes, save: saveAcao, remove: deleteAcao } = useActions()
  const [franquiasCad] = useLocalState('settings:franquias_v2', [])
  const { branches }   = useBranches()
  const [usuariosCad]  = useLocalState('settings:perfis_v2', [])
  const [tiposLista]   = useLocalState(TIPOS_KEY, [])
  const tiposMap = useMemo(() => {
    const base = tiposLista.length ? tiposLista : Object.entries(TIPOS_ACAO_DEFAULT).map(([k, v]) => ({ ...v, slug: k, uso: 'acao' }))
    const filtrados = base.filter(t => !t.uso || t.uso === 'acao' || t.uso === 'ambos')
    return filtrados.length ? listToMap(filtrados) : TIPOS_ACAO_DEFAULT
  }, [tiposLista])

  const [slideOpen, setSlideOpen] = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [visao,     setVisao]     = useLocalState('acoes:visao', 'lista') // 'lista' | 'franquias'

  const [search,        setSearch]        = useState('')
  const [activeFilters, setActiveFilters] = useState({})

  const empresasOpts = useMemo(() => {
    if (franquiasCad.length > 0)
      return franquiasCad.filter(f => f.situacao !== 'inativo')
        .map(f => ({ id: String(f.id), nome: f.codigo ? `[${f.codigo}] ${f.nome}` : f.nome }))
    return branches.map(b => ({ id: b.id, nome: b.name }))
  }, [franquiasCad, branches])

  const responsaveisOpts = useMemo(() => {
    const lista = usuariosCad.length > 0 ? usuariosCad : RESPONSAVEIS
    return lista.filter(u => u.status !== 'inativo').map(u => ({ id: u.id, nome: u.nome }))
  }, [usuariosCad])

  // ── filtros ──────────────────────────────────────────────────────────────
  const lista = useMemo(() => {
    const q    = search.toLowerCase()
    const tipo = activeFilters.tipo   || []
    const stat = activeFilters.status || []
    const emp  = activeFilters.empresa || []

    return acoes.filter(a =>
      (!tipo.length   || tipo.includes(a.tipo)) &&
      (!stat.length   || stat.includes(a.status)) &&
      (!emp.length    || emp.includes(String(a.empresa_id))) &&
      (!q || a.titulo.toLowerCase().includes(q) ||
             (a.empresa_nome || '').toLowerCase().includes(q) ||
             (a.responsavel_nome || '').toLowerCase().includes(q))
    ).sort((a, b) => (a.data_inicio < b.data_inicio ? 1 : -1))
  }, [acoes, search, activeFilters])

  // ── Agrupamento por franquia ──────────────────────────────────────────────
  const porFranquia = useMemo(() => {
    const map = {}
    lista.forEach(a => {
      const key  = String(a.empresa_id || '')
      const nome = a.empresa_nome || 'Sem franquia'
      if (!map[key]) map[key] = { id: key, nome, acoes: [] }
      map[key].acoes.push(a)
    })
    return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [lista])

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
      {[
        { label:'Total',      value: acoes.length,                                       color:'var(--border)' },
        { label:'Agendadas',  value: acoes.filter(a => a.status==='agendado').length,    color:'#F59E0B' },
        { label:'Realizadas', value: acoes.filter(a => a.status==='realizado').length,   color:'#10B981' },
        { label:'Canceladas', value: acoes.filter(a => a.status==='cancelado').length,   color:'#EF4444' },
      ].map(k => (
        <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border2)',
          borderRadius:10, padding:'14px 18px', display:'flex', flexDirection:'column', gap:4,
          boxShadow:'var(--shadow)', borderTop:`3px solid ${k.color}` }}>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)' }}>{k.value}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
        </div>
      ))}
    </div>
  )

  // ── columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'titulo',
      label: 'Ação',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{val}</div>
          {row.local && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>📍 {row.local}</div>}
        </div>
      ),
    },
    {
      key: 'empresa_nome',
      label: 'Unidade / Franquia',
      render: val => <span style={{ fontSize:13, color:'var(--text-soft)' }}>{val || '—'}</span>,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: val => <TipoBadge tipo={val} tiposMap={tiposMap} />,
    },
    {
      key: 'data_inicio',
      label: 'Data / Período',
      render: (val, row) => {
        const hoje     = new Date().toISOString().slice(0, 10)
        const atrasado = row.status === 'agendado' && val < hoje
        return (
          <span style={{ fontFamily:'var(--mono)', fontSize:12, color: atrasado ? 'var(--red)' : 'var(--text-soft)', whiteSpace:'nowrap' }}>
            {atrasado && '⚠ '}{fmtPeriodo(val, row.data_fim)}
          </span>
        )
      },
    },
    {
      key: 'responsavel_nome',
      label: 'Responsável',
      render: val => <AvatarCell nome={val} />,
    },
    {
      key: 'vagas',
      label: 'Vagas',
      render: (val, row) => <VagasBar vagas={val} inscritos={row.inscritos} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: val => <StatusBadge status={val} />,
    },
  ]

  // ── filters ───────────────────────────────────────────────────────────────
  const filters = [
    {
      key: 'tipo',
      label: 'Tipo',
      options: Object.entries(tiposMap).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })),
    },
    {
      key: 'status',
      label: 'Status',
      options: Object.entries(STATUS_ACAO).map(([k, v]) => ({ value: k, label: v.label })),
    },
    {
      key: 'empresa',
      label: 'Unidade',
      options: empresasOpts.map(e => ({ value: String(e.id), label: e.nome })),
    },
  ]

  // ── card render ───────────────────────────────────────────────────────────
  function renderCard(acao) {
    const hoje     = new Date().toISOString().slice(0, 10)
    const atrasado = acao.status === 'agendado' && acao.data_inicio < hoje
    const tipoCfg  = (tiposMap || TIPOS_ACAO_DEFAULT)[acao.tipo] || { icon:'◎', color:'#6B7280', bg:'#F3F4F6' }
    return (
      <div onClick={() => { setEditando(acao); setSlideOpen(true) }}
        style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10,
          padding:'14px 16px', cursor:'pointer', boxShadow:'var(--shadow)',
          display:'flex', flexDirection:'column', gap:10, borderTop:`3px solid ${tipoCfg.color}` }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', lineHeight:1.3, flex:1 }}>{acao.titulo}</div>
          <TipoBadge tipo={acao.tipo} tiposMap={tiposMap} />
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>🏢 {acao.empresa_nome}</div>
        {acao.local && <div style={{ fontSize:11, color:'var(--text-muted)' }}>📍 {acao.local}</div>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:8, borderTop:'1px solid var(--border2)' }}>
          <AvatarCell nome={acao.responsavel_nome} />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, fontFamily:'var(--mono)', color: atrasado ? 'var(--red)' : 'var(--text-muted)' }}>
              {atrasado && '⚠ '}{fmtPeriodo(acao.data_inicio, acao.data_fim)}
            </span>
            <StatusBadge status={acao.status} />
          </div>
        </div>
        {acao.vagas && <VagasBar vagas={acao.vagas} inscritos={acao.inscritos} />}
      </div>
    )
  }

  function handleSave(form) {
    saveAcao({ ...form, id: editando?.id || novoId(acoes) })
    setSlideOpen(false)
    setEditando(null)
  }

  function handleDelete(id) {
    deleteAcao(id)
    setSlideOpen(false)
    setEditando(null)
  }

  // ── View por Franquias ────────────────────────────────────────────────────
  const viewFranquias = (
    <div style={{ padding:'0 28px 24px', display:'flex', flexDirection:'column', gap:20 }}>
      {/* KPIs */}
      <div style={{ paddingTop:20 }}>{kpis}</div>

      {/* Barra de busca + botão */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--text-muted)', pointerEvents:'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ação ou franquia…"
            style={{ width:'100%', boxSizing:'border-box', paddingLeft:32, paddingRight:12, height:36, borderRadius:8,
              border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13,
              fontFamily:'var(--font)', outline:'none' }} />
        </div>
        <Button onClick={() => { setEditando(null); setSlideOpen(true) }}>+ Nova Ação</Button>
      </div>

      {porFranquia.length === 0 && (
        <div style={{ textAlign:'center', padding:'56px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🏢</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Nenhuma ação encontrada</div>
        </div>
      )}

      {porFranquia.map(grupo => {
        const agendadas  = grupo.acoes.filter(a => a.status === 'agendado').length
        const realizadas = grupo.acoes.filter(a => a.status === 'realizado').length
        const canceladas = grupo.acoes.filter(a => a.status === 'cancelado').length
        return (
          <div key={grupo.id} style={{ border:'1px solid var(--border)', borderRadius:12,
            background:'var(--surface)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
            {/* Cabeçalho do grupo */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border2)',
              background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-glow)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏢</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>{grupo.nome}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                    {grupo.acoes.length} ação{grupo.acoes.length !== 1 ? 'ões' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {[{ label:'Agendadas', val:agendadas, color:'#F59E0B' },
                  { label:'Realizadas', val:realizadas, color:'#10B981' },
                  { label:'Canceladas', val:canceladas, color:'#EF4444' }].map(k => k.val > 0 && (
                  <div key={k.label} style={{ textAlign:'center', padding:'4px 12px', borderRadius:8,
                    background:`${k.color}14`, border:`1px solid ${k.color}44` }}>
                    <div style={{ fontSize:16, fontWeight:800, color:k.color, fontFamily:'var(--mono)' }}>{k.val}</div>
                    <div style={{ fontSize:9, color:k.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Cards das ações */}
            <div style={{ padding:'16px 20px', display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
              {grupo.acoes.map(acao => renderCard(acao))}
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Toggle de visão ───────────────────────────────────────────────────────
  const toggleVisao = (
    <div style={{ position:'absolute', top:16, right:28, zIndex:10,
      display:'flex', gap:2, background:'var(--surface2)', borderRadius:9,
      padding:3, border:'1px solid var(--border)' }}>
      {[{ id:'lista', label:'Lista' }, { id:'franquias', label:'🏢 Por Franquia' }].map(t => (
        <button key={t.id} type="button" onClick={() => setVisao(t.id)}
          style={{ padding:'5px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12,
            fontWeight: visao === t.id ? 700 : 500, fontFamily:'var(--font)',
            background: visao === t.id ? 'var(--surface)' : 'none',
            color: visao === t.id ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: visao === t.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            transition:'all 0.15s' }}>
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ position:'relative' }}>
      {toggleVisao}
      {visao === 'franquias' ? viewFranquias : (
        <BrowseLayout
          storageKey="acoes"
          kpis={kpis}
          kpisLabel="Indicadores"
          columns={columns}
          data={lista}
          keyField="id"
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onNew={() => { setEditando(null); setSlideOpen(true) }}
          newLabel="+ Nova Ação"
          onRowClick={row => { setEditando(row); setSlideOpen(true) }}
          bulkEditFields={[
            { key: 'status', label: 'Status', type: 'select',
              options: Object.entries(STATUS_ACAO).map(([k, v]) => ({ value: k, label: v.label })) },
            { key: 'data_inicio', label: 'Data de início', type: 'date' },
          ]}
          onBulkEdit={(ids, changes) =>
            ids.forEach(id => { const a = acoes.find(a => a.id === id); if (a) saveAcao({ ...a, ...changes }) })
          }
          renderCard={renderCard}
          emptyState={
            <div style={{ textAlign:'center', padding:'56px 0', color:'var(--text-muted)' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🗓</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Nenhuma ação encontrada</div>
              <div style={{ fontSize:12, opacity:0.7 }}>Crie a primeira ação clicando em "+ Nova Ação"</div>
            </div>
          }
        />
      )}

      <AcaoSlideOver
        open={slideOpen}
        initial={editando}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => { setSlideOpen(false); setEditando(null) }}
        tiposMap={tiposMap}
        empresasOpts={empresasOpts}
        responsaveisOpts={responsaveisOpts}
      />
    </div>
  )
}
