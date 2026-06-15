import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useContacts } from '../hooks/useContacts'
import Button from '../components/Button'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { MetaSection, MetaRow, InlineText, InlineTextarea, InlineSelect, InlineSearchSelect, InlineDate, DeleteZone } from '../components/NotionDrawer'
import Drawer from '../components/Drawer'
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react'

const ACCENT = '#6366F1'

function uid() { return 'c' + Date.now() + Math.floor(Math.random() * 9999) }

function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}

function initials(nome) {
  const parts = (nome || '').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// paleta de avatar baseada no nome (determinística)
const AVATAR_PALETTE = [
  { bg:'#EDE9FE', color:'#7C3AED' },
  { bg:'#DBEAFE', color:'#1D4ED8' },
  { bg:'#D1FAE5', color:'#065F46' },
  { bg:'#FEF3C7', color:'#B45309' },
  { bg:'#FCE7F3', color:'#9D174D' },
  { bg:'#FEE2E2', color:'#991B1B' },
]
function avatarColor(nome) {
  let h = 0
  for (let i = 0; i < (nome || '').length; i++) h = (h * 31 + nome.charCodeAt(i)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ nome, size = 36 }) {
  const p = avatarColor(nome)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: p.bg, color: p.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, fontFamily: 'var(--mono)',
      flexShrink: 0, border: `1px solid ${p.color}33`,
    }}>
      {initials(nome)}
    </div>
  )
}

// ─── Notion Drawer: Contato Detail ────────────────────────────────────────────
const EMPTY = { nome:'', email:'', telefone:'', cargo:'', empresa_id:null, empresa_nome:'', notas:'' }

function ContatoDetail({ item, existentes, onSave, onDelete, onClose }) {
  const isNew = !item?.id
  const empresasAtivas = MOCK_EMPRESAS.filter(e => e.status === 'ativo' || e.status === 'negociacao')
  const [form, setForm] = useState(item ? { ...EMPTY, ...item } : { ...EMPTY })

  function patch(k, v) {
    const next = { ...form, [k]: v }
    if (k === 'empresa_id') {
      const emp = empresasAtivas.find(e => e.id === Number(v))
      next.empresa_nome = emp ? (emp.fantasia || emp.razao) : ''
    }
    setForm(next)
    if (!isNew) onSave({ ...next, id: item.id })
  }

  function handleCreate() {
    if (!form.nome.trim()) return alert('Nome é obrigatório')
    const emp = empresasAtivas.find(e => e.id === Number(form.empresa_id))
    onSave({ ...form, nome: form.nome.trim(), empresa_nome: emp ? (emp.fantasia || emp.razao) : '',
      empresa_id: form.empresa_id ? Number(form.empresa_id) : null,
      id: uid(), tenant_id:'t1', criado_em: new Date().toISOString().slice(0,10) })
    onClose()
  }

  const av = avatarColor(form.nome || '?')
  const empOptions = [{ value:'', label:'— Sem empresa —' }, ...empresasAtivas.map(e => ({ value: String(e.id), label: e.fantasia || e.razao }))]

  const left = (
    <div style={{ padding:'32px 40px', display:'flex', flexDirection:'column', gap:16, flex:1 }}>
      {/* Avatar + Nome */}
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:av.bg, color:av.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
          border:`2px solid ${av.color}33` }}>
          {initials(form.nome)}
        </div>
        <div style={{ flex:1 }}>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            onBlur={e => patch('nome', e.target.value)}
            placeholder="Nome completo…"
            style={{ width:'100%', boxSizing:'border-box', border:'none', outline:'none',
              background:'transparent', fontSize:22, fontWeight:700, color:'var(--text)',
              fontFamily:'var(--font)', padding:0,
              borderBottom:'2px solid transparent', transition:'border-color 0.15s' }}
            onFocus={e => { e.target.style.borderBottomColor = 'var(--accent)' }}
            onBlurCapture={e => { e.target.style.borderBottomColor = 'transparent' }} />
          {form.cargo && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>{form.cargo}</div>}
          {form.empresa_nome && <div style={{ fontSize:12, color:'var(--accent)', marginTop:1 }}>{form.empresa_nome}</div>}
        </div>
      </div>

      {/* Notas */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Notas</div>
        <InlineTextarea value={form.notas || ''} onChange={v => patch('notas', v)}
          placeholder="Observações, histórico, contexto sobre este contato…" minRows={5} />
      </div>

      {isNew && (
        <Button onClick={handleCreate} style={{ alignSelf:'flex-start' }}>Criar contato</Button>
      )}
    </div>
  )

  const right = (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <MetaSection label="Identificação" />
      <MetaRow label="Cargo">
        <InlineText value={form.cargo || ''} onChange={v => patch('cargo', v)} placeholder="Ex: Diretor Comercial" />
      </MetaRow>
      <MetaRow label="Empresa">
        <InlineSearchSelect
          value={form.empresa_id ? String(form.empresa_id) : ''}
          onChange={v => patch('empresa_id', v)}
          options={empOptions}
          placeholder="— Sem empresa —"
        />
      </MetaRow>

      <MetaSection label="Contato" />
      <MetaRow label="E-mail">
        <InlineText value={form.email || ''} onChange={v => patch('email', v)} placeholder="email@empresa.com" />
      </MetaRow>
      <MetaRow label="Telefone">
        <InlineText value={form.telefone || ''} onChange={v => patch('telefone', v)} placeholder="(00) 00000-0000" mono />
      </MetaRow>

      {!isNew && (
        <>
          <MetaSection label="Registro" />
          <MetaRow label="Cadastrado">
            <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)', paddingLeft:6 }}>
              {fmtData(item.criado_em)}
            </span>
          </MetaRow>
          <DeleteZone label="Excluir contato" onDelete={() => { onDelete(item.id); onClose() }} />
        </>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <div style={{ flex: '0 0 65%', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
        {left}
      </div>
      <div style={{ flex: '0 0 35%', overflowY: 'auto', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        {right}
      </div>
    </div>
  )
}

// ─── Ícone Olho ───────────────────────────────────────────────────────────────

// ─── Dropdown Ações ────────────────────────────────────────────────────────────
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
  const item = { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    color:'var(--text)', fontFamily:'var(--font)', textAlign:'left', borderRadius:7, transition:'background 0.12s' }
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:600,
      width:210, background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', boxShadow:'0 8px 28px rgba(0,0,0,0.13)', padding:6 }}>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 11V4M3 7l3-3 3 3M1 2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Importar dados
      </button>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Exportar dados
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Contatos() {
  const { contacts: contatos, save: salvarContato, remove: deletarContato } = useContacts()
  const [modal, setModal]       = useState(null)   // null | 'novo' | contato
  const [busca, setBusca]           = useLocalState('contatos:busca', '')
  const [filtroEmp, setFiltroEmp]   = useLocalState('contatos:filtroEmp', '')
  const [filtroCargo, setFiltroCargo] = useLocalState('contatos:filtroCargo', '')
  const [expandido, setExpandido]   = useState(null)
  const [showMetrics, setShowMetrics] = useLocalState('contatos:showMetrics', true)
  const [acoesOpen, setAcoesOpen]   = useState(false)
  const acoesRef                    = useRef(null)

  const empresasUnicas = useMemo(() => {
    const ids = new Set(contatos.map(c => c.empresa_id).filter(Boolean))
    return MOCK_EMPRESAS.filter(e => ids.has(e.id))
  }, [contatos])

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return contatos.filter(c =>
      (!filtroEmp || c.empresa_id === Number(filtroEmp)) &&
      (!filtroCargo || (c.cargo || '').toLowerCase().includes(filtroCargo.toLowerCase())) &&
      (!q || c.nome.toLowerCase().includes(q) ||
             (c.email || '').toLowerCase().includes(q) ||
             (c.cargo || '').toLowerCase().includes(q))
    ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [contatos, busca, filtroEmp, filtroCargo])

  const kpis = {
    total:      contatos.length,
    comEmpresa: contatos.filter(c => c.empresa_id).length,
    semEmpresa: contatos.filter(c => !c.empresa_id).length,
  }

  function salvar(c) { salvarContato(c) }
  function deletar(id) { deletarContato(id) }

  return (
    <div style={pg.wrap}>

      {/* ── Header ── */}
      <div style={pg.pageHeader}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div>
            <div style={pg.breadcrumb}><span>Clientes</span><span style={pg.sep}>›</span><span>Contatos</span></div>
            <h1 style={pg.title}>Contatos</h1>
          </div>
          <button
            onClick={() => setShowMetrics(v => !v)}
            title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center',
              width:28, height:28, borderRadius:7, border:'1px solid var(--border)',
              background:'var(--surface)', color:'var(--text-muted)', cursor:'pointer',
              flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <Button onClick={() => setModal('novo')}>+ Novo contato</Button>
      </div>

      {/* ── KPIs collapsíveis ── */}
      <div style={{ display:'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr', transition:'grid-template-rows 0.25s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, paddingBottom: showMetrics ? 4 : 0 }}>
            {[
              { label:'Total',       value:kpis.total,      color:'var(--text)' },
              { label:'Com empresa', value:kpis.comEmpresa, color:'#6366F1'     },
              { label:'Sem empresa', value:kpis.semEmpresa, color:'#6B7280'     },
            ].map(k => (
              <div key={k.label} style={pg.kpiCard}>
                <span style={{ fontSize:22, fontWeight:700, color:k.color, letterSpacing:'-0.5px', lineHeight:1 }}>{k.value}</span>
                <span style={pg.kpiLbl}>{k.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={pg.toolbar}>
        <div style={pg.tbLeft}>
          <div style={pg.searchWrap}>
            <span style={pg.searchIcon}>⌕</span>
            <input style={pg.searchInput}
              placeholder="Buscar nome, e-mail ou cargo…"
              value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div style={pg.tbDivider} />
          <select style={pg.select} value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresasUnicas.map(e => (
              <option key={e.id} value={e.id}>{e.fantasia || e.razao}</option>
            ))}
            <option value="sem">Sem empresa</option>
          </select>
          <input style={{ ...pg.searchInput, width:160 }} placeholder="Cargo…"
            value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} />
        </div>
        <div style={pg.tbDivider} />
        <div style={pg.tbRight}>
          <div ref={acoesRef} style={{ position:'relative' }}>
            <button
              onClick={() => setAcoesOpen(v => !v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'center',
                width:36, height:36, borderRadius:8, border:'1px solid var(--border)',
                background:'var(--surface)', color:'var(--text-soft)', cursor:'pointer',
                transition:'all 0.15s' }}>
              <MoreHorizontal size={16} />
            </button>
            {acoesOpen && (
              <AcoesDropdown onClose={() => setAcoesOpen(false)} anchorRef={acoesRef} />
            )}
          </div>
        </div>
      </div>

      {/* ── Result row ── */}
      <div style={pg.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {lista.length} contato{lista.length !== 1 ? 's' : ''} encontrado{lista.length !== 1 ? 's' : ''}
        </span>
        {(busca || filtroEmp || filtroCargo) && (
          <button style={pg.clearBtn}
            onClick={() => { setBusca(''); setFiltroEmp(''); setFiltroCargo('') }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Tabela ── */}
      <div style={pg.tableWrap}>
        <table style={pg.table}>
          <thead>
            <tr>
              {['Contato','Cargo','Empresa','Telefone','Cadastro',''].map((h, i) => (
                <th key={i} style={{ ...pg.th, ...(i === 5 ? { width:72, textAlign:'right' } : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding:'40px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                  Nenhum contato encontrado.
                </td>
              </tr>
            )}
            {lista.map(c => {
              const av = avatarColor(c.nome)
              return (
                <tr key={c.id} style={{ ...pg.tr, cursor:'pointer' }}
                  onClick={() => setModal(c)}
                  onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                  {/* Nome + Email */}
                  <td style={pg.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:av.bg, color:av.color,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
                        border:`1px solid ${av.color}33` }}>
                        {initials(c.nome)}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{c.nome}</div>
                        {c.email && (
                          <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{c.email}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cargo */}
                  <td style={pg.td}>
                    {c.cargo
                      ? <span style={{ fontSize:12, color:'var(--text-soft)', padding:'2px 8px',
                          background:'var(--surface2)', borderRadius:6, border:'1px solid var(--border)' }}>
                          {c.cargo}
                        </span>
                      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                  </td>

                  {/* Empresa */}
                  <td style={pg.td}>
                    {c.empresa_nome
                      ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:22, height:22, borderRadius:6, background:ACCENT+'18',
                            color:ACCENT, display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:8, fontWeight:800, fontFamily:'var(--mono)', border:`1px solid ${ACCENT}30` }}>
                            {c.empresa_nome.slice(0,2).toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, color:'var(--text-soft)' }}>{c.empresa_nome}</span>
                        </div>
                      : <span style={{ fontSize:11, color:'var(--border2)' }}>—</span>}
                  </td>

                  {/* Telefone */}
                  <td style={{ ...pg.td, fontFamily:'var(--mono)', fontSize:12, color:'var(--text-soft)' }}>
                    {c.telefone || <span style={{ color:'var(--border2)' }}>—</span>}
                  </td>

                  {/* Cadastro */}
                  <td style={{ ...pg.td, fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)' }}>
                    {fmtData(c.criado_em)}
                  </td>

                  {/* Ações */}
                  <td style={{ ...pg.td, textAlign:'right' }}>
                    <button style={pg.editBtn} onClick={e => { e.stopPropagation(); setModal(c) }}
                      title="Abrir contato">→</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Notion Drawer ── */}
      <Drawer
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal && modal !== 'novo' ? modal.nome : 'Novo contato'}
        subtitle="Clientes · Contatos"
        bodyStyle={{ padding: 0, gap: 0, overflow: 'hidden' }}
      >
        {modal && (
          <ContatoDetail
            item={modal === 'novo' ? null : modal}
            existentes={contatos}
            onSave={salvar}
            onDelete={deletar}
            onClose={() => setModal(null)}
          />
        )}
      </Drawer>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const pg = {
  wrap:        { padding:'28px 32px', display:'flex', flexDirection:'column', gap:16 },
  pageHeader:  { display:'flex', justifyContent:'space-between', alignItems:'flex-end' },
  breadcrumb:  { display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 },
  sep:         { color:'var(--border)' },
  title:       { margin:0, fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px' },
  primaryBtn:  { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7,
                 fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  kpiCard:     { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex',
                 flexDirection:'column', gap:4, border:'1px solid var(--border2)',
                 boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiLbl:      { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  toolbar:     { background:'var(--surface)', borderRadius:10, padding:'8px 12px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  tbLeft:      { display:'flex', alignItems:'center', gap:6, flexShrink:1, minWidth:0 },
  tbDivider:   { width:1, height:24, background:'var(--border)', flexShrink:0, margin:'0 4px' },
  tbRight:     { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  searchWrap:  { position:'relative', width:240, flexShrink:0 },
  searchIcon:  { position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' },
  searchInput: { width:'100%', height:36, padding:'0 10px 0 28px', border:'1px solid var(--border)', borderRadius:7,
                 background:'var(--surface2)', color:'var(--text)', fontSize:13,
                 fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' },
  select:      { height:36, padding:'0 8px', border:'1px solid var(--border)', borderRadius:7,
                 background:'var(--surface2)', color:'var(--text)', fontSize:12,
                 fontFamily:'var(--font)', outline:'none', cursor:'pointer', flexShrink:0 },
  resultRow:   { display:'flex', alignItems:'center', gap:12 },
  clearBtn:    { fontSize:12, color:'var(--accent2)', background:'none', border:'none',
                 cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  tableWrap:  { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'10px 14px', fontSize:10, fontWeight:700, color:'var(--text-muted)',
                textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left',
                background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  tr:         { borderBottom:'1px solid var(--border2)', transition:'background 0.1s' },
  td:         { padding:'10px 14px', fontSize:13, verticalAlign:'middle' },
  editBtn:    { background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                fontSize:13, padding:'4px 6px', borderRadius:6 },
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:500,
             display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  modal:   { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:520,
             boxShadow:'0 20px 60px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column',
             maxHeight:'90vh' },
  mHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start',
             padding:'20px 24px 14px', borderBottom:'1px solid var(--border)' },
  mTitle:  { fontSize:16, fontWeight:800, color:'var(--text)', margin:0 },
  mSub:    { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  xBtn:    { background:'none', border:'none', color:'var(--text-muted)', fontSize:16,
             cursor:'pointer', padding:'4px 6px', borderRadius:6 },
  mBody:   { padding:'20px 24px', display:'flex', flexDirection:'column', gap:16,
             overflowY:'auto', flex:1 },
  mFooter: { padding:'14px 24px', borderTop:'1px solid var(--border)',
             display:'flex', alignItems:'center', gap:8 },
  fg:      { display:'flex', flexDirection:'column', gap:5 },
  lbl:     { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
             letterSpacing:'0.08em' },
  inp:     { padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7,
             background:'var(--surface2)', color:'var(--text)', fontSize:13,
             fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
  inpErr:  { borderColor:'var(--red)', boxShadow:'0 0 0 2px rgba(239,68,68,0.12)' },
  err:     { fontSize:11, color:'var(--red)', marginTop:2 },
  saveBtn: { padding:'8px 20px', background:ACCENT, color:'#fff', border:'none',
             borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer',
             fontFamily:'var(--font)' },
  cancelBtn:{ padding:'8px 16px', background:'var(--surface2)', color:'var(--text-soft)',
              border:'1px solid var(--border)', borderRadius:8, fontWeight:600,
              fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
  delBtn:  { background:'none', border:'none', color:'var(--red)', fontSize:12,
             cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, padding:'4px 0' },
}
