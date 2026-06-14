import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useFunnels } from '../hooks/useFunnels'
import Button from '../components/Button'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_FUNIL = [
  { value: 'ativo',   label: 'Ativo',   color: 'var(--green)', bg: 'var(--green-bg)', text: 'var(--green-text)' },
  { value: 'inativo', label: 'Inativo', color: '#9A9590',      bg: 'var(--surface3)', text: 'var(--text-muted)' },
]

// Cores predefinidas para etapas
const CORES_ETAPA = [
  '#6B7280','#3B82F6','#8B5CF6','#EC4899','#F59E0B',
  '#10B981','#EF4444','#14B8A6','#F97316','#1E3A5F',
]

const ETAPA_VAZIA = { nome: '', cor: '#3B82F6', probabilidade: 50 }



// ─── Helpers ──────────────────────────────────────────────────────────────────
function novoId() { return Date.now() + Math.random() }

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_FUNIL.find(s => s.value === status) || STATUS_FUNIL[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20,
      background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

// ─── Preview visual do funil (mini-pipeline) ──────────────────────────────────
function FunilPreview({ etapas }) {
  if (!etapas?.length) return <span style={{ fontSize:12, color:'var(--text-muted)' }}>Sem etapas</span>
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, flexWrap:'wrap' }}>
      {etapas.map((e, i) => (
        <div key={e.id} style={{ display:'flex', alignItems:'center', gap:3 }}>
          <span style={{ fontSize:10, fontWeight:600, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:3,
            background: e.cor + '22', color: e.cor, border:`1px solid ${e.cor}44`, whiteSpace:'nowrap' }}>
            {e.nome}
          </span>
          {i < etapas.length - 1 && <span style={{ fontSize:10, color:'var(--text-muted)' }}>›</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Editor de Etapas ─────────────────────────────────────────────────────────
function EtapasEditor({ etapas, onChange }) {
  function addEtapa() {
    const nova = { ...ETAPA_VAZIA, id: novoId(), ordem: etapas.length + 1 }
    onChange([...etapas, nova])
  }

  function removeEtapa(id) {
    const novas = etapas.filter(e => e.id !== id).map((e, i) => ({ ...e, ordem: i + 1 }))
    onChange(novas)
  }

  function updateEtapa(id, field, val) {
    onChange(etapas.map(e => e.id === id ? { ...e, [field]: val } : e))
  }

  function mover(id, dir) {
    const idx = etapas.findIndex(e => e.id === id)
    const novoIdx = idx + dir
    if (novoIdx < 0 || novoIdx >= etapas.length) return
    const arr = [...etapas]
    ;[arr[idx], arr[novoIdx]] = [arr[novoIdx], arr[idx]]
    onChange(arr.map((e, i) => ({ ...e, ordem: i + 1 })))
  }

  return (
    <div>
      {/* Header das colunas */}
      <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 80px 100px 32px', gap:8, alignItems:'center',
        padding:'0 6px 6px', borderBottom:'1px solid var(--border2)', marginBottom:8 }}>
        <div />
        <div style={ed.colLabel}>Nome da etapa</div>
        <div style={ed.colLabel}>Prob. (%)</div>
        <div style={ed.colLabel}>Cor</div>
        <div />
      </div>

      {/* Etapas */}
      {etapas.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
          Nenhuma etapa. Clique em "+ Adicionar etapa".
        </div>
      )}

      {etapas.map((e, i) => (
        <div key={e.id} style={{ display:'grid', gridTemplateColumns:'32px 1fr 80px 100px 32px', gap:8,
          alignItems:'center', padding:'5px 6px', borderRadius:7, background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>

          {/* Ordem + setas */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <button type="button" style={ed.arrowBtn} onClick={() => mover(e.id, -1)} disabled={i === 0} title="Mover para cima">▲</button>
            <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)', lineHeight:1 }}>{i+1}</span>
            <button type="button" style={ed.arrowBtn} onClick={() => mover(e.id, 1)} disabled={i === etapas.length-1} title="Mover para baixo">▼</button>
          </div>

          {/* Nome */}
          <input
            style={ed.input}
            value={e.nome}
            onChange={ev => updateEtapa(e.id, 'nome', ev.target.value)}
            placeholder="Nome da etapa…"
          />

          {/* Probabilidade */}
          <div style={{ position:'relative' }}>
            <input
              type="number" min="0" max="100" step="5"
              style={{ ...ed.input, paddingRight:22, fontFamily:'var(--mono)' }}
              value={e.probabilidade}
              onChange={ev => updateEtapa(e.id, 'probabilidade', Math.min(100, Math.max(0, parseInt(ev.target.value)||0)))}
            />
            <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-muted)', pointerEvents:'none' }}>%</span>
          </div>

          {/* Cor */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {/* Amostra + input color nativo (escondido) */}
            <label style={{ cursor:'pointer', position:'relative' }} title="Escolher cor">
              <div style={{ width:28, height:28, borderRadius:6, background:e.cor, border:'2px solid rgba(0,0,0,0.12)', flexShrink:0 }} />
              <input type="color" value={e.cor} onChange={ev => updateEtapa(e.id, 'cor', ev.target.value)}
                style={{ position:'absolute', opacity:0, width:0, height:0 }} />
            </label>
            {/* Paleta rápida */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:3, maxWidth:66 }}>
              {CORES_ETAPA.map(c => (
                <button key={c} type="button"
                  style={{ width:14, height:14, borderRadius:3, background:c, border:`2px solid ${e.cor===c ? 'var(--text)' : 'transparent'}`, cursor:'pointer', padding:0, flexShrink:0 }}
                  onClick={() => updateEtapa(e.id, 'cor', c)}
                />
              ))}
            </div>
          </div>

          {/* Remover */}
          <button type="button" style={ed.removeBtn} onClick={() => removeEtapa(e.id)} title="Remover etapa">✕</button>
        </div>
      ))}

      <button type="button" style={ed.addBtn} onClick={addEtapa}>
        + Adicionar etapa
      </button>
    </div>
  )
}

const ed = {
  colLabel: { fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--mono)' },
  input:    { padding:'6px 9px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)', width:'100%', boxSizing:'border-box' },
  arrowBtn: { background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:9, padding:'1px 2px', lineHeight:1, display:'block', opacity:0.7 },
  removeBtn:{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:13, padding:4, borderRadius:4 },
  addBtn:   { marginTop:10, padding:'7px 14px', borderRadius:7, border:'1px dashed var(--border)', background:'none', fontSize:13, color:'var(--accent)', cursor:'pointer', fontFamily:'var(--font)', width:'100%', fontWeight:600 },
}

// ─── Modal de Funil ───────────────────────────────────────────────────────────
function FunilModal({ onClose, onSave, onDelete, initial, nomesExistentes }) {
  const isEditing = !!initial
  const [form, setForm] = useState(initial || {
    nome: '', descricao: '', status: 'ativo',
    etapas: [
      { id: novoId(), nome: 'Prospecção',  ordem: 1, cor: '#6B7280', probabilidade: 10 },
      { id: novoId(), nome: 'Qualificação',ordem: 2, cor: '#3B82F6', probabilidade: 30 },
      { id: novoId(), nome: 'Proposta',    ordem: 3, cor: '#8B5CF6', probabilidade: 60 },
      { id: novoId(), nome: 'Fechado Ganho',ordem:4, cor: '#10B981', probabilidade: 100 },
      { id: novoId(), nome: 'Fechado Perdido',ordem:5,cor: '#EF4444', probabilidade: 0 },
    ],
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nomeErr, setNomeErr] = useState('')

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setNomeErr('Nome é obrigatório'); return }
    const duplicado = nomesExistentes.some(n => n.toLowerCase() === form.nome.trim().toLowerCase() && n !== initial?.nome)
    if (duplicado) { setNomeErr('Já existe um funil com este nome'); return }
    if (form.etapas.length === 0) { alert('O funil precisa ter ao menos uma etapa'); return }
    if (form.etapas.some(e => !e.nome.trim())) { alert('Todas as etapas precisam ter um nome'); return }
    onSave({ ...form, nome: form.nome.trim(), id: initial?.id || novoId() })
    onClose()
  }

  return (
    <div style={md.overlay}>
      <div style={md.modal}>
        <div style={md.header}>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{isEditing ? 'Editar Funil' : 'Novo Funil'}</div>
            {isEditing && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{form.etapas.length} etapas configuradas</div>}
          </div>
          <button style={md.close} onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
          <div style={md.body}>

            {/* Identificação */}
            <div style={{ marginBottom:24 }}>
              <SectionLabel>Identificação</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={md.label}>Nome do funil *</label>
                  <input style={{ ...md.input, borderColor: nomeErr ? 'var(--red)' : undefined }}
                    value={form.nome}
                    onChange={e => { set('nome', e.target.value); setNomeErr('') }}
                    placeholder="Ex: Funil Padrão" />
                  {nomeErr && <div style={{ fontSize:11, color:'var(--red)', marginTop:3, fontFamily:'var(--mono)' }}>{nomeErr}</div>}
                </div>
                <div>
                  <label style={md.label}>Status</label>
                  <select style={md.input} value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUS_FUNIL.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={md.label}>Descrição</label>
                <textarea style={{ ...md.input, minHeight:56, resize:'vertical' }}
                  value={form.descricao}
                  onChange={e => set('descricao', e.target.value)}
                  placeholder="Descreva quando e como este funil é utilizado…" />
              </div>
            </div>

            {/* Preview do funil */}
            {form.etapas.length > 0 && (
              <div style={{ marginBottom:20, padding:'12px 14px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border2)' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)', marginBottom:8 }}>Preview do pipeline</div>
                <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:0 }}>
                  {form.etapas.map((e, i) => (
                    <div key={e.id} style={{ display:'flex', alignItems:'center' }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background: e.cor, flexShrink:0 }} />
                        <span style={{ fontSize:9, fontFamily:'var(--mono)', color:'var(--text-soft)', whiteSpace:'nowrap', maxWidth:64, overflow:'hidden', textOverflow:'ellipsis' }}>{e.nome || '…'}</span>
                        <span style={{ fontSize:9, color:'var(--text-muted)' }}>{e.probabilidade}%</span>
                      </div>
                      {i < form.etapas.length - 1 && (
                        <div style={{ width:24, height:2, background:`linear-gradient(90deg, ${e.cor}, ${form.etapas[i+1].cor})`, margin:'0 4px', marginBottom:20, flexShrink:0 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Etapas */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--border2)' }}>
                <SectionLabel noMargin>Etapas do funil</SectionLabel>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{form.etapas.length} etapa{form.etapas.length !== 1 ? 's' : ''}</span>
              </div>
              <EtapasEditor etapas={form.etapas} onChange={val => set('etapas', val)} />
            </div>

          </div>

          <div style={md.footer}>
            {isEditing ? (
              confirmDelete ? (
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>Excluir permanentemente?</span>
                  <Button variant="danger" onClick={() => { onDelete(initial.id); onClose() }}>Sim, excluir</Button>
                  <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>Excluir funil</Button>
              )
            ) : <div />}
            <div style={{ display:'flex', gap:10 }}>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar funil</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionLabel({ children, noMargin }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase',
      letterSpacing:'0.07em', fontFamily:'var(--mono)', marginBottom: noMargin ? 0 : 12 }}>
      {children}
    </div>
  )
}

const md = {
  overlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal:    { background:'var(--surface)', borderRadius:12, width:760, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 8px 40px rgba(0,0,0,0.18)' },
  header:   { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  close:    { background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)', padding:4 },
  body:     { padding:'20px 20px 8px', overflowY:'auto', flex:1 },
  footer:   { padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  label:    { fontSize:11, fontWeight:600, color:'var(--text-soft)', letterSpacing:'0.03em', display:'block', marginBottom:5 },
  input:    { padding:'8px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)', width:'100%', boxSizing:'border-box' },
  cancelBtn:       { padding:'8px 16px', borderRadius:7, border:'1px solid var(--border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--text-soft)', fontFamily:'var(--font)' },
  saveBtn:         { padding:'8px 18px', borderRadius:7, border:'none', background:'var(--accent)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' },
  deleteBtn:       { padding:'8px 14px', borderRadius:7, border:'1px solid var(--red)', background:'none', cursor:'pointer', fontSize:13, color:'var(--red)', fontFamily:'var(--font)' },
  deleteConfirmBtn:{ padding:'8px 14px', borderRadius:7, border:'none', background:'var(--red)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' },
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Funis() {
  const { funis, save: saveFunil, remove: deleteFunil } = useFunnels()
  const [search, setSearch]       = useLocalState('funis:search', '')
  const [filterStatus, setFilter] = useLocalState('funis:filterStatus', '')
  const [modal, setModal]         = useState(null) // null | 'new' | funil obj

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return funis.filter(f => {
      if (filterStatus && f.status !== filterStatus) return false
      if (q && !f.nome.toLowerCase().includes(q) && !f.descricao?.toLowerCase().includes(q)) return false
      return true
    })
  }, [funis, search, filterStatus])

  const ativos = funis.filter(f => f.status === 'ativo').length
  const totalEtapas = funis.reduce((s, f) => s + f.etapas.length, 0)
  const maxEtapas = funis.reduce((m, f) => Math.max(m, f.etapas.length), 0)

  function handleSave(data) { saveFunil(data) }
  function handleDelete(id) { deleteFunil(id) }

  const nomesExistentes = funis.map(f => f.nome)

  return (
    <div>
      {/* Header */}
      <div style={p.pageHeader}>
        <div>
          <div style={p.breadcrumb}><span>Configuração</span><span style={p.sep}>›</span><span>Funis</span></div>
          <h1 style={p.title}>Funis de venda</h1>
        </div>
        <Button onClick={() => setModal('new')}>+ Novo funil</Button>
      </div>

      {/* KPIs */}
      <div style={p.kpis}>
        <KpiCard label="Total de funis"    value={funis.length} />
        <KpiCard label="Funis ativos"      value={ativos} accent />
        <KpiCard label="Total de etapas"   value={totalEtapas} />
        <KpiCard label="Maior funil"       value={`${maxEtapas} etapas`} mono />
      </div>

      {/* Toolbar */}
      <div style={p.toolbar}>
        <div style={p.tbLeft}>
          <div style={p.searchWrap}>
            <span style={p.searchIcon}>⌕</span>
            <input style={p.searchInput} placeholder="Buscar funil…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={p.select} value={filterStatus} onChange={e => setFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <div style={p.tbRight}>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
            {filtered.length} funil{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)', fontSize:14 }}>Nenhum funil encontrado</div>
        )}
        {filtered.map(f => (
          <div key={f.id} style={s.card}>
            {/* Cabeçalho do card */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {/* Ícone de funil */}
                <div style={s.funilIcon}>▽</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{f.nome}</div>
                  {f.descricao && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{f.descricao}</div>}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <StatusBadge status={f.status} />
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{f.etapas.length} etapas</span>
                <Button variant="secondary" size="sm" onClick={() => setModal(f)}>Editar</Button>
              </div>
            </div>

            {/* Pipeline visual */}
            <div style={{ display:'flex', alignItems:'stretch', gap:0, overflowX:'auto', paddingBottom:4 }}>
              {f.etapas.map((e, i) => (
                <div key={e.id} style={{ display:'flex', alignItems:'stretch', minWidth:0, flex:1 }}>
                  {/* Etapa */}
                  <div style={{ flex:1, minWidth:80, padding:'10px 10px 8px', borderRadius: i===0 ? '8px 0 0 8px' : i===f.etapas.length-1 ? '0 8px 8px 0' : 0,
                    background: e.cor + '18', borderTop:`3px solid ${e.cor}`, borderBottom:`1px solid ${e.cor}22`,
                    borderLeft: i===0 ? `1px solid ${e.cor}33` : 'none',
                    borderRight:`1px solid ${e.cor}22` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:e.cor, fontFamily:'var(--mono)', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.nome}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{e.probabilidade}% prob.</div>
                  </div>
                  {/* Seta separadora */}
                  {i < f.etapas.length - 1 && (
                    <div style={{ width:0, height:'100%', borderTop:'22px solid transparent', borderBottom:'22px solid transparent',
                      borderLeft:`10px solid ${e.cor}33`, flexShrink:0, alignSelf:'center' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <FunilModal
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          initial={modal === 'new' ? null : modal}
          nomesExistentes={nomesExistentes}
        />
      )}
    </div>
  )
}

function KpiCard({ label, value, accent, mono }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)' }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: accent ? 'var(--green-text)' : 'var(--text)', fontFamily: mono ? 'var(--mono)' : 'var(--font)', lineHeight:1 }}>{value}</div>
    </div>
  )
}

const s = {
  card:     { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px', transition:'box-shadow 0.15s' },
  funilIcon:{ width:36, height:36, borderRadius:9, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, border:'1px solid rgba(30,58,95,0.12)', flexShrink:0 },
  editBtn:  { padding:'5px 12px', borderRadius:7, border:'1px solid var(--border)', background:'none', fontSize:12, color:'var(--text-soft)', cursor:'pointer', fontFamily:'var(--font)' },
}

const p = {
  pageHeader:  { display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20 },
  breadcrumb:  { display:'flex', alignItems:'center', gap:6, marginBottom:6, fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  sep:         { color:'var(--border)' },
  title:       { fontSize:22, fontWeight:700, color:'var(--text)', margin:0 },
  newBtn:      { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  kpis:        { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  toolbar:     { background:'var(--surface)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16 },
  tbLeft:      { display:'flex', alignItems:'center', gap:8, flex:1 },
  tbRight:     { display:'flex', alignItems:'center', gap:8 },
  searchWrap:  { position:'relative', flex:'1', minWidth:200 },
  searchIcon:  { position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15, pointerEvents:'none' },
  searchInput: { width:'100%', padding:'7px 12px 7px 30px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)' },
  select:      { padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)' },
}
