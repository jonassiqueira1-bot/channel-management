import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useFunnels } from '../hooks/useFunnels'
import { useAuditLog } from '../hooks/useAuditLog'
import SettingsLayout from '../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_FUNIL = [
  { value: 'ativo',   label: 'Ativo',   color: 'var(--green)', bg: 'var(--green-bg)', text: 'var(--green-text)' },
  { value: 'inativo', label: 'Inativo', color: '#9A9590',      bg: 'var(--surface3)', text: 'var(--text-muted)' },
]

const CORES_ETAPA = [
  '#6B7280','#3B82F6','var(--accent)','#EC4899','#F59E0B',
  '#10B981','#EF4444','#14B8A6','#F97316','#1E3A5F',
]

const ETAPA_VAZIA = { nome: '', cor: '#3B82F6', probabilidade: 50 }

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
      <div style={{ display:'grid', gridTemplateColumns:'32px minmax(100px,1fr) 90px minmax(180px,1fr) 32px', gap:8, alignItems:'center',
        padding:'0 8px 8px', borderBottom:'1px solid var(--border2)', marginBottom:8 }}>
        <div />
        <div style={ed.colLabel}>Nome da etapa</div>
        <div style={ed.colLabel}>Prob. (%)</div>
        <div style={ed.colLabel}>Cor</div>
        <div />
      </div>

      {etapas.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
          Nenhuma etapa. Clique em "+ Adicionar etapa".
        </div>
      )}

      {etapas.map((e, i) => (
        <div key={e.id} style={{ display:'grid', gridTemplateColumns:'32px minmax(100px,1fr) 90px minmax(180px,1fr) 32px', gap:8,
          alignItems:'center', padding:'6px 8px', borderRadius:7, background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <button type="button" style={ed.arrowBtn} onClick={() => mover(e.id, -1)} disabled={i === 0}>▲</button>
            <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)', lineHeight:1 }}>{i+1}</span>
            <button type="button" style={ed.arrowBtn} onClick={() => mover(e.id, 1)} disabled={i === etapas.length-1}>▼</button>
          </div>

          <input
            style={ed.input}
            value={e.nome}
            onChange={ev => updateEtapa(e.id, 'nome', ev.target.value)}
            placeholder="Nome da etapa…"
          />

          <div style={{ position:'relative' }}>
            <input
              type="number" min="0" max="100" step="5"
              style={{ ...ed.input, paddingRight:22, fontFamily:'var(--mono)' }}
              value={e.probabilidade}
              onChange={ev => updateEtapa(e.id, 'probabilidade', Math.min(100, Math.max(0, parseInt(ev.target.value)||0)))}
            />
            <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-muted)', pointerEvents:'none' }}>%</span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ cursor:'pointer', position:'relative', flexShrink:0 }}>
              <div style={{ width:32, height:32, borderRadius:7, background:e.cor, border:'2px solid rgba(0,0,0,0.15)', flexShrink:0 }} />
              <input type="color" value={e.cor} onChange={ev => updateEtapa(e.id, 'cor', ev.target.value)}
                style={{ position:'absolute', opacity:0, width:0, height:0 }} />
            </label>
            <div style={{ display:'flex', flexWrap:'nowrap', gap:5, alignItems:'center', overflowX:'auto', minWidth:0 }}>
              {CORES_ETAPA.map(c => (
                <button key={c} type="button"
                  style={{ width:20, height:20, borderRadius:5, background:c, border:`2.5px solid ${e.cor===c ? 'var(--text)' : 'transparent'}`, cursor:'pointer', padding:0, flexShrink:0, outline: e.cor===c ? `2px solid ${c}` : 'none', outlineOffset:1 }}
                  onClick={() => updateEtapa(e.id, 'cor', c)}
                />
              ))}
            </div>
          </div>

          <button type="button" style={ed.removeBtn} onClick={() => removeEtapa(e.id)}>✕</button>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const EMPTY_FUNIL = {
  nome: '', descricao: '', status: 'ativo',
  etapas: [
    { id: novoId(), nome: 'Prospecção',    ordem: 1, cor: '#6B7280', probabilidade: 10 },
    { id: novoId(), nome: 'Qualificação',  ordem: 2, cor: '#3B82F6', probabilidade: 30 },
    { id: novoId(), nome: 'Proposta',      ordem: 3, cor: 'var(--accent)', probabilidade: 60 },
    { id: novoId(), nome: 'Fechado Ganho', ordem: 4, cor: '#10B981', probabilidade: 100 },
    { id: novoId(), nome: 'Fechado Perdido', ordem: 5, cor: '#EF4444', probabilidade: 0 },
  ],
}

export default function Funis() {
  const { funis, save: saveFunil, remove: deleteFunil } = useFunnels()
  const { registrar: log } = useAuditLog()
  const [search, setSearch] = useLocalState('funis:search', '')
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return funis.filter(f => !q || f.nome.toLowerCase().includes(q) || f.descricao?.toLowerCase().includes(q))
  }, [funis, search])

  function abrirNovo() {
    setForm({ ...EMPTY_FUNIL, etapas: EMPTY_FUNIL.etapas.map(e => ({ ...e, id: novoId() })) })
    setEditando('novo')
  }

  function abrirEdicao(funil) {
    setForm({ ...funil })
    setEditando(funil)
  }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSave() {
    if (!form.nome.trim()) return
    if (form.etapas.length === 0) return alert('O funil precisa ter ao menos uma etapa')
    if (form.etapas.some(e => !e.nome.trim())) return alert('Todas as etapas precisam ter um nome')
    const isNew = editando === 'novo'
    const saved = { ...form, nome: form.nome.trim(), id: isNew ? novoId() : editando.id }
    saveFunil(saved)
    log(isNew ? 'criar' : 'editar', 'funil', saved.id, { descricao: `Funil ${isNew ? 'criado' : 'editado'}: ${saved.nome}` })
    setEditando(null)
  }

  function handleDelete(id) {
    const f = funis.find(x => x.id === id)
    deleteFunil(id)
    log('excluir', 'funil', id, { descricao: `Funil excluído: ${f?.nome || id}` })
    setEditando(null)
  }

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Funis de Vendas', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Novo Funil' : `Editar: ${editando.nome}`}
        subtitle={`${form.etapas.length} etapa${form.etapas.length !== 1 ? 's' : ''} configurada${form.etapas.length !== 1 ? 's' : ''}`}
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
        contentMaxWidth={Infinity}
      >
        <FPESection title="Identificação">
          <FPEGrid>
            <FPEField label="Nome do funil" required>
              <input className="fpe-field" value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Funil Padrão" />
            </FPEField>
            <FPEField label="Status">
              <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_FUNIL.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FPEField>
          </FPEGrid>
          <FPEField label="Descrição">
            <textarea className="fpe-field" style={{ minHeight: 64, resize: 'vertical' }}
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Descreva quando e como este funil é utilizado…" />
          </FPEField>
        </FPESection>

        {form.etapas.length > 0 && (
          <FPESection title="Preview do pipeline">
            <div style={{ display:'flex', alignItems:'stretch', gap:0, overflowX:'auto', paddingBottom:4 }}>
              {form.etapas.map((e, i) => (
                <div key={e.id} style={{ display:'flex', alignItems:'stretch', minWidth:0, flex:1 }}>
                  <div style={{ flex:1, minWidth:120, padding:'10px 10px 8px',
                    borderRadius: i===0 ? '8px 0 0 8px' : i===form.etapas.length-1 ? '0 8px 8px 0' : 0,
                    background: e.cor + '18', borderTop:`3px solid ${e.cor}`,
                    borderBottom:`1px solid ${e.cor}22`,
                    borderLeft: i===0 ? `1px solid ${e.cor}33` : 'none',
                    borderRight:`1px solid ${e.cor}22` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:e.cor, fontFamily:'var(--mono)', marginBottom:3, wordBreak:'break-word' }}>{e.nome || '…'}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{e.probabilidade}% prob.</div>
                  </div>
                  {i < form.etapas.length - 1 && (
                    <div style={{ width:0, height:'100%', borderTop:'22px solid transparent', borderBottom:'22px solid transparent',
                      borderLeft:`10px solid ${e.cor}33`, flexShrink:0, alignSelf:'center' }} />
                  )}
                </div>
              ))}
            </div>
          </FPESection>
        )}

        <FPESection title={`Etapas do funil (${form.etapas.length})`}>
          <EtapasEditor etapas={form.etapas} onChange={val => set('etapas', val)} />
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Funis de Vendas"
      description="Configure os funis e etapas do pipeline de vendas do canal."
      columns={[
        { key: 'nome', label: 'Funil' },
        { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} />, width: 100 },
        { key: 'etapas', label: 'Etapas', render: (v) => (
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
            {v?.length ?? 0} etapa{v?.length !== 1 ? 's' : ''}
          </span>
        ), width: 90, priority: 2 },
        { key: 'etapas', label: 'Pipeline', render: (v) => <FunilPreview etapas={v} />, priority: 2 },
      ]}
      data={filtered}
      keyField="id"
      emptyLabel="Nenhum funil cadastrado."
      onNew={abrirNovo}
      newLabel="+ Novo funil"
      rowActions={[
        { label: 'Editar',  onClick: abrirEdicao },
        { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
      ]}
      search={search}
      onSearchChange={setSearch}
    />
  )
}
