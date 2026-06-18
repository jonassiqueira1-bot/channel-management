import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useContacts } from '../hooks/useContacts'
import { useCompanies } from '../hooks/useCompanies'
import Button from '../components/Button'
import EmpresaSearch from '../components/EmpresaSearch'
import SlideOver from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { InlineTextarea, DeleteZone } from '../components/NotionDrawer'

const ACCENT = '#6366F1'

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const inpStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
  borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}
const lbl = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5,
}

// ─── ContatoDetail ─────────────────────────────────────────────────────────────
const EMPTY = { nome:'', email:'', telefone:'', cargo:'', empresa_id:null, empresa_nome:'', notas:'' }

function ContatoDetail({ item, onSave, onDelete, onClose }) {
  const isNew = !item?.id
  const [form, setForm] = useState(item ? { ...EMPTY, ...item } : { ...EMPTY })
  const av = avatarColor(form.nome || '?')

  function patch(k, v) {
    const next = { ...form, [k]: v }
    setForm(next)
    if (!isNew) onSave({ ...next, id: item.id })
  }

  function handleCreate() {
    if (!form.nome.trim()) return
    onSave({ ...form, nome: form.nome.trim() })
    onClose()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Avatar + nome */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:av.bg, color:av.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
          border:`2px solid ${av.color}33` }}>
          {initials(form.nome)}
        </div>
        <div style={{ flex:1 }}>
          <input
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            onBlur={e => patch('nome', e.target.value)}
            placeholder="Nome completo…"
            style={{ width:'100%', boxSizing:'border-box', border:'none', outline:'none',
              background:'transparent', fontSize:22, fontWeight:700, color:'var(--text)',
              fontFamily:'var(--font)', padding:0,
              borderBottom:'2px solid transparent', transition:'border-color 0.15s' }}
            onFocus={e => { e.target.style.borderBottomColor = 'var(--accent)' }}
            onBlurCapture={e => { e.target.style.borderBottomColor = 'transparent' }}
          />
          {form.empresa_nome && (
            <div style={{ fontSize:12, color:ACCENT, marginTop:2 }}>{form.empresa_nome}</div>
          )}
        </div>
      </div>

      {/* Campos principais */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <label style={lbl}>Cargo</label>
          <input style={inpStyle} value={form.cargo || ''}
            onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
            onBlur={e => patch('cargo', e.target.value)}
            placeholder="Ex: Diretor Comercial" />
        </div>
        <div>
          <label style={lbl}>Empresa</label>
          <EmpresaSearch
            value={form.empresa_id}
            label={form.empresa_nome}
            onChange={(id, nome) => {
              const next = { ...form, empresa_id: id, empresa_nome: nome || '' }
              setForm(next)
              if (!isNew) onSave({ ...next, id: item.id })
            }}
          />
        </div>
        <div>
          <label style={lbl}>E-mail</label>
          <input style={inpStyle} value={form.email || ''}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onBlur={e => patch('email', e.target.value)}
            placeholder="email@empresa.com" />
        </div>
        <div>
          <label style={lbl}>Telefone</label>
          <input style={inpStyle} value={form.telefone || ''}
            onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
            onBlur={e => patch('telefone', e.target.value)}
            placeholder="(00) 00000-0000" />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label style={lbl}>Notas</label>
        <InlineTextarea
          value={form.notas || ''}
          onChange={v => patch('notas', v)}
          placeholder="Observações, histórico, contexto sobre este contato…"
          minRows={4}
        />
      </div>

      {/* Ações */}
      {isNew ? (
        <Button onClick={handleCreate} style={{ alignSelf:'flex-start' }}>Criar contato</Button>
      ) : (
        <DeleteZone label="Excluir contato" onDelete={() => { onDelete(item.id); onClose() }} />
      )}

      {!isNew && (
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          Cadastrado em {fmtData(item.criado_em)}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Contatos() {
  const { contacts: contatos, save: salvarContato, remove: deletarContato } = useContacts()
  const { companies } = useCompanies()
  const [modal, setModal] = useState(null)   // null | 'novo' | contato-obj

  const [showMetrics, setShowMetrics] = useLocalState('contatos:showMetrics', true)

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:      contatos.length,
    comEmpresa: contatos.filter(c => c.empresa_id).length,
    semEmpresa: contatos.filter(c => !c.empresa_id).length,
  }), [contatos])

  // ── COLUMNS para BrowseLayout ────────────────────────────────────────────────
  const COLUMNS = [
    { key: 'nome', label: 'Contato', render: c => {
      const display = c.nome || c.email || 'Sem nome'
      const av = avatarColor(display)
      const avatarText = c.nome ? initials(c.nome) : (c.email ? c.email[0].toUpperCase() : '?')
      return (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:av.bg, color:av.color,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
            border:`1px solid ${av.color}33` }}>
            {avatarText}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, color: c.nome ? 'var(--text)' : 'var(--text-muted)', fontStyle: c.nome ? 'normal' : 'italic', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>
              {display}
            </div>
            {c.nome && c.email && (
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>
                {c.email}
              </div>
            )}
          </div>
        </div>
      )
    }},
    { key: 'cargo', label: 'Cargo', render: c => c.cargo
      ? <span style={{ fontSize:12, color:'var(--text-soft)', padding:'2px 8px',
          background:'var(--surface2)', borderRadius:6, border:'1px solid var(--border)' }}>{c.cargo}</span>
      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>
    },
    { key: 'empresa_nome', label: 'Empresa', render: c => c.empresa_nome
      ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:ACCENT+'18', color:ACCENT,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, fontWeight:800, fontFamily:'var(--mono)', border:`1px solid ${ACCENT}30` }}>
            {c.empresa_nome.slice(0,2).toUpperCase()}
          </div>
          <span style={{ fontSize:12, color:'var(--text-soft)' }}>{c.empresa_nome}</span>
        </div>
      : <span style={{ fontSize:11, color:'var(--border2)' }}>—</span>
    },
    { key: 'telefone', label: 'Telefone', render: c =>
      <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-soft)' }}>
        {c.telefone || <span style={{ color:'var(--border2)' }}>—</span>}
      </span>
    },
    { key: 'criado_em', label: 'Cadastro', render: c =>
      <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{fmtData(c.criado_em)}</span>
    },
  ]

  // ── FILTERS ──────────────────────────────────────────────────────────────────
  const empresasUnicas = useMemo(() => {
    const ids = new Set(contatos.map(c => String(c.empresa_id)).filter(Boolean))
    return companies.filter(e => ids.has(String(e.id)))
  }, [contatos, companies])

  const FILTERS = [
    { key: 'empresa_nome', label: 'Empresa',
      options: empresasUnicas.map(e => ({ value: e.fantasia || e.razao, label: e.fantasia || e.razao })) },
  ]

  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 }}>
            <span>Clientes</span><span style={{ color:'var(--border)' }}>›</span><span>Contatos</span>
          </div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px' }}>Contatos</h1>
        </div>
        <Button onClick={() => setModal('novo')}>+ Novo contato</Button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Total',       value:kpis.total,      color:'var(--text)' },
          { label:'Com empresa', value:kpis.comEmpresa, color:'#6366F1'     },
          { label:'Sem empresa', value:kpis.semEmpresa, color:'#6B7280'     },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', borderRadius:10, padding:'16px 18px',
            display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)',
            boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' }}>
            <span style={{ fontSize:22, fontWeight:700, color:k.color, letterSpacing:'-0.5px', lineHeight:1 }}>{k.value}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── BrowseLayout ── */}
      <BrowseLayout
        data={contatos}
        columns={COLUMNS}
        filters={FILTERS}
        onRowClick={c => setModal(c)}
        storagePrefix="contatos_browse"
        keyField="id"
      />

      {/* ── SlideOver ── */}
      <SlideOver
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal && modal !== 'novo' ? (modal.nome || 'Contato') : 'Novo contato'}
        subtitle={modal && modal !== 'novo' ? 'Editando contato' : 'Novo cadastro'}
        defaultWidth={560}
        showFooter={false}
      >
        {modal && (
          <ContatoDetail
            item={modal === 'novo' ? null : modal}
            onSave={salvarContato}
            onDelete={deletarContato}
            onClose={() => setModal(null)}
          />
        )}
      </SlideOver>
    </div>
  )
}
