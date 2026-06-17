import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useProducts } from '../hooks/useProducts'
import Button from '../components/Button'
import SettingsLayout from '../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPOS_PRODUTO = [
  { value: 'saas',        label: 'SaaS',       color: 'var(--blue)',   bg: 'var(--blue-bg)',   text: 'var(--blue-text)' },
  { value: 'licenca',     label: 'Licença',     color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  { value: 'servico',     label: 'Serviço',     color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  { value: 'hardware',    label: 'Hardware',    color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'consultoria', label: 'Consultoria', color: '#7C3AED',       bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  { value: 'treinamento', label: 'Treinamento', color: '#0891B2',       bg: '#ECFEFF',          text: '#0E7490' },
]

const STATUS_PRODUTO = [
  { value: 'ativo',         label: 'Ativo',         color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  { value: 'rascunho',      label: 'Rascunho',      color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'descontinuado', label: 'Descontinuado', color: '#9A9590',       bg: 'var(--surface3)',  text: 'var(--text-muted)' },
]

const COBRANCAS = [
  { value: 'mensal',  label: 'Mensal' },
  { value: 'anual',   label: 'Anual' },
  { value: 'unico',   label: 'Pagamento único' },
  { value: 'uso',     label: 'Por uso' },
  { value: 'usuario', label: 'Por usuário' },
]

const CATEGORIAS_DEFAULT = ['CRM', 'ERP', 'BI / Analytics', 'Segurança', 'Infraestrutura', 'Integração', 'Suporte', 'Implementação', 'Outros']

const EMPTY_FORM = {
  nome: '', codigo: '', descricao: '', tipo: 'saas', categoria: '',
  status: 'rascunho', cobranca: 'mensal',
  preco: '', setup: '', desconto_max: '',
  unidades_incluidas: '', usuarios_incluidos: '',
  features: '',
  visivel_canal: true,
  observacoes: '',
}

const IMPORT_COLS = ['nome','codigo','tipo','categoria','status','cobranca','preco','setup','desconto_max','usuarios_incluidos','features','visivel_canal','descricao','observacoes']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
  const sep = lines[0].includes(';') ? ';' : ','
  function parseLine(line) {
    const fields = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === sep && !inQ) { fields.push(cur.trim()); cur = '' }
      else cur += ch
    }
    fields.push(cur.trim()); return fields
  }
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g,'_'))
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = parseLine(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return obj
  })
  return { headers, rows }
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const cfg = TIPOS_PRODUTO.find(t => t.value === tipo) || TIPOS_PRODUTO[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_PRODUTO.find(s => s.value === status) || STATUS_PRODUTO[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

// ─── CategoriaSelect ──────────────────────────────────────────────────────────
function CategoriaSelect({ value, onChange, categorias, setCategorias }) {
  const [open, setOpen] = useState(false)
  const [nova, setNova] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function addCategoria() {
    const t = nova.trim()
    if (!t || categorias.includes(t)) return
    setCategorias(prev => [...prev, t])
    setNova('')
  }

  function removeCategoria(cat) {
    setCategorias(prev => prev.filter(c => c !== cat))
    if (value === cat) onChange('')
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)} className="fpe-field"
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', textAlign:'left', width:'100%', boxSizing:'border-box', color: value ? 'var(--text)' : 'var(--text-muted)' }}>
        <span>{value || 'Selecione…'}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:6 }}>▾</span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:400,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9,
          boxShadow:'0 8px 28px rgba(0,0,0,0.13)', overflow:'hidden', minWidth:200 }}>
          <div style={{ maxHeight:180, overflowY:'auto', padding:'4px 0' }}>
            <div onClick={() => { onChange(''); setOpen(false) }}
              style={{ padding:'7px 12px', fontSize:12.5, cursor:'pointer', color:'var(--text-muted)', background: !value ? 'var(--accent-glow)' : 'transparent' }}>
              — Nenhuma —
            </div>
            {categorias.map(cat => (
              <div key={cat} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'7px 12px', cursor:'pointer', fontSize:12.5,
                background: value === cat ? 'var(--accent-glow)' : 'transparent',
                color: value === cat ? 'var(--accent)' : 'var(--text)' }}>
                <span onClick={() => { onChange(cat); setOpen(false) }} style={{ flex:1 }}>{cat}</span>
                <button type="button" onClick={e => { e.stopPropagation(); removeCategoria(cat) }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:11, padding:'0 2px', lineHeight:1, marginLeft:6, flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', padding:'8px 10px', display:'flex', gap:6 }}>
            <input value={nova} onChange={e => setNova(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategoria() } }}
              placeholder="Nova categoria…"
              style={{ flex:1, padding:'5px 8px', fontSize:12, border:'1px solid var(--border)', borderRadius:6, background:'var(--surface2)', color:'var(--text)', outline:'none', fontFamily:'var(--font)' }} />
            <button type="button" onClick={addCategoria}
              style={{ padding:'5px 10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>+</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport, existingCodigos }) {
  const [step, setStep]         = useState('upload')
  const [rows, setRows]         = useState([])
  const [errors, setErrors]     = useState({})
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target.result
      const { rows: parsed } = parseCSV(text)
      const errs = {}
      parsed.forEach((row, i) => {
        const rowErrs = []
        if (!row.nome?.trim()) rowErrs.push('Nome obrigatório')
        if (!row.codigo?.trim()) rowErrs.push('Código obrigatório')
        else if (existingCodigos.includes(row.codigo.trim().toUpperCase())) rowErrs.push('Código duplicado')
        else if (parsed.slice(0,i).some(r => r.codigo?.trim().toUpperCase() === row.codigo?.trim().toUpperCase())) rowErrs.push('Código duplicado no arquivo')
        if (row.tipo && !TIPOS_PRODUTO.find(t => t.value === row.tipo)) rowErrs.push(`Tipo inválido: ${row.tipo}`)
        if (row.status && !STATUS_PRODUTO.find(s => s.value === row.status)) rowErrs.push(`Status inválido: ${row.status}`)
        if (rowErrs.length) errs[i] = rowErrs
      })
      setRows(parsed); setErrors(errs); setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e) { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }

  function handleConfirm() {
    const okRows = rows.filter((_, i) => !errors[i])
    const newItems = okRows.map((r, i) => ({
      id: Date.now() + i,
      nome: r.nome || '', codigo: (r.codigo || '').toUpperCase(), tipo: r.tipo || 'saas',
      categoria: r.categoria || '', status: r.status || 'rascunho',
      cobranca: r.cobranca || 'mensal', preco: parseFloat(String(r.preco).replace(',','.')) || 0,
      setup: parseFloat(String(r.setup).replace(',','.')) || 0, desconto_max: parseFloat(String(r.desconto_max).replace(',','.')) || 0,
      usuarios_incluidos: parseInt(r.usuarios_incluidos) || null,
      features: r.features || '', visivel_canal: r.visivel_canal === 'true' || r.visivel_canal === '1',
      descricao: r.descricao || '', observacoes: r.observacoes || '',
      criado: new Date().toISOString().slice(0,10), contratos: 0,
    }))
    onImport(newItems)
    onClose()
  }

  function downloadTemplate() {
    const bom = '﻿'
    const header = IMPORT_COLS.join(';')
    const ex = ['Canal NG Demo','CNG-DEMO','saas','CRM','rascunho','mensal','490.00','0.00','10','5','Feature 1\\nFeature 2','true','Descrição do produto',''].join(';')
    const blob = new Blob([bom + header + '\n' + ex], { type:'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'template_produtos.csv'; a.click()
  }

  const okCount  = rows.filter((_, i) => !errors[i]).length
  const errCount = rows.length - okCount

  return (
    <div style={im.overlay}>
      <div style={im.modal}>
        <div style={im.header}>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Importar Produtos</span>
          <button style={im.close} onClick={onClose} type="button">✕</button>
        </div>

        {step === 'upload' && (
          <div style={im.body}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:13, color:'var(--text-soft)' }}>Envie um arquivo CSV com os produtos a importar.</span>
              <Button variant="secondary" size="sm" onClick={downloadTemplate}>↓ Template CSV</Button>
            </div>
            <div
              style={{ ...im.dropzone, borderColor: dragging ? 'var(--accent)' : 'var(--border)' }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='.csv'; inp.onchange=ev=>handleFile(ev.target.files[0]); inp.click() }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
              <div style={{ fontSize:13, color:'var(--text-soft)', fontWeight:600 }}>Clique ou arraste o arquivo CSV</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Formato: UTF-8, separador ; ou ,</div>
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Colunas esperadas</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {IMPORT_COLS.map(c => (
                  <span key={c} style={{ fontSize:11, fontFamily:'var(--mono)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:4, padding:'2px 7px', color:'var(--text-soft)' }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
            <div style={{ padding:'14px 24px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', display:'flex', gap:20 }}>
              <span style={{ fontSize:13 }}>Total: <strong>{rows.length}</strong></span>
              <span style={{ fontSize:13, color:'var(--green-text)' }}>✓ OK: <strong>{okCount}</strong></span>
              {errCount > 0 && <span style={{ fontSize:13, color:'var(--red)' }}>✕ Erros: <strong>{errCount}</strong></span>}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>{['#','Nome','Código','Tipo','Status','Preço','Situação'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'var(--text-muted)', fontWeight:700, borderBottom:'1px solid var(--border)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const hasErr = !!errors[i]
                    return (
                      <tr key={i} style={{ background: hasErr ? 'var(--red-bg)' : 'transparent', borderBottom:'1px solid var(--border2)' }}>
                        <td style={{ padding:'6px 10px', color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{i+1}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text)', fontWeight:600 }}>{row.nome || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{row.codigo || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.tipo || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.status || '—'}</td>
                        <td style={{ padding:'6px 10px', color:'var(--text-soft)' }}>{row.preco ? `R$ ${row.preco}` : '—'}</td>
                        <td style={{ padding:'6px 10px' }}>
                          {hasErr
                            ? <span style={{ color:'var(--red)', fontSize:11 }}>{errors[i].join(', ')}</span>
                            : <span style={{ color:'var(--green-text)', fontWeight:600 }}>✓</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', background:'var(--surface2)' }}>
              <Button variant="secondary" onClick={() => setStep('upload')}>← Voltar</Button>
              <Button disabled={okCount === 0} onClick={handleConfirm}>
                Importar {okCount} produto{okCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const im = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' },
  modal:   { background:'var(--surface)', borderRadius:14, width:680, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  close:   { background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)', padding:4 },
  body:    { padding:'20px 24px', overflowY:'auto' },
  dropzone:{ border:'2px dashed', borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s', background:'var(--surface2)' },
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Produtos() {
  const [search, setSearch] = useLocalState('produtos:search', '')
  const [categorias, setCategorias] = useLocalState('produtos:categorias', CATEGORIAS_DEFAULT)
  const { produtos, save: saveProduto, remove: deleteProduto, importMany: importProdutos } = useProducts()
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const [importModal, setImportModal] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return produtos.filter(p =>
      !q || p.nome?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.descricao?.toLowerCase().includes(q)
    ).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  }, [produtos, search])

  function abrirNovo() {
    setForm({ ...EMPTY_FORM })
    setEditando('novo')
  }

  function abrirEdicao(prod) {
    setForm({ ...prod })
    setEditando(prod)
  }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSave() {
    if (!form.nome.trim()) return alert('Nome é obrigatório')
    if (!form.codigo.trim()) return alert('Código é obrigatório')
    const codigo = form.codigo.trim().toUpperCase()
    const existingCodigos = produtos.map(p => p.codigo?.toUpperCase()).filter(Boolean)
    const isDup = existingCodigos.includes(codigo) && editando?.codigo?.toUpperCase() !== codigo
    if (isDup) return alert('Já existe um produto com este código')
    saveProduto({ ...form, codigo, id: editando === 'novo' ? Date.now() : editando.id })
    setEditando(null)
  }

  function handleDelete(id) {
    deleteProduto(id)
    setEditando(null)
  }

  function handleImport(items) { importProdutos(items) }

  if (editando) {
    return (
      <>
        <FullPageEdit
          breadcrumb={[{ label: 'Produtos', onClick: () => setEditando(null) }]}
          title={editando === 'novo' ? 'Novo Produto' : `Editar: ${editando.nome}`}
          subtitle={editando !== 'novo' ? form.codigo : undefined}
          onSave={handleSave}
          onCancel={() => setEditando(null)}
          onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
        >
          <FPESection title="Identificação">
            <FPEGrid>
              <FPEField label="Nome do produto" required>
                <input className="fpe-field" value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  placeholder="Ex: Canal NG Pro" />
              </FPEField>
              <FPEField label="Código" required>
                <input className="fpe-field" style={{ fontFamily:'var(--mono)', textTransform:'uppercase' }}
                  value={form.codigo}
                  onChange={e => set('codigo', e.target.value.toUpperCase())}
                  placeholder="CNG-PRO" />
              </FPEField>
            </FPEGrid>
            <FPEGrid>
              <FPEField label="Tipo">
                <select className="fpe-field" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS_PRODUTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FPEField>
              <FPEField label="Categoria">
                <CategoriaSelect value={form.categoria} onChange={v => set('categoria', v)} categorias={categorias} setCategorias={setCategorias} />
              </FPEField>
            </FPEGrid>
            <FPEField label="Descrição">
              <textarea className="fpe-field" style={{ minHeight: 64, resize: 'vertical' }}
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                placeholder="Descreva o produto brevemente…" />
            </FPEField>
          </FPESection>

          <FPESection title="Comercial">
            <FPEGrid>
              <FPEField label="Status">
                <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_PRODUTO.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                </select>
              </FPEField>
              <FPEField label="Cobrança">
                <select className="fpe-field" value={form.cobranca} onChange={e => set('cobranca', e.target.value)}>
                  {COBRANCAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FPEField>
            </FPEGrid>
            <FPEGrid>
              <FPEField label="Preço (R$)">
                <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} type="number" min="0" step="0.01"
                  value={form.preco} onChange={e => set('preco', e.target.value)} placeholder="0,00" />
              </FPEField>
              <FPEField label="Setup (R$)">
                <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} type="number" min="0" step="0.01"
                  value={form.setup} onChange={e => set('setup', e.target.value)} placeholder="0,00" />
              </FPEField>
              <FPEField label="Desconto máximo (%)">
                <input className="fpe-field" style={{ fontFamily:'var(--mono)' }} type="number" min="0" max="100"
                  value={form.desconto_max} onChange={e => set('desconto_max', e.target.value)} placeholder="0" />
              </FPEField>
            </FPEGrid>
          </FPESection>

          <FPESection title="Funcionalidades">
            <FPEField label="Uma funcionalidade por linha">
              <textarea className="fpe-field" style={{ minHeight: 90, resize: 'vertical', fontFamily:'var(--mono)', fontSize: 12 }}
                value={form.features}
                onChange={e => set('features', e.target.value)}
                placeholder={'Pipeline Kanban\nGestão de metas\nRelatórios avançados'} />
            </FPEField>
            <FPEField label="Visibilidade no canal">
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)' }}>
                <input type="checkbox" checked={form.visivel_canal} onChange={e => set('visivel_canal', e.target.checked)}
                  style={{ width:15, height:15, accentColor:'var(--accent)', cursor:'pointer' }} />
                <span style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>Visível no catálogo</span>
              </label>
            </FPEField>
          </FPESection>

          <FPESection title="Observações">
            <FPEField label="Notas e restrições">
              <textarea className="fpe-field" style={{ minHeight: 64, resize: 'vertical', fontSize: 12 }}
                value={form.observacoes}
                onChange={e => set('observacoes', e.target.value)}
                placeholder="Notas, restrições…" />
            </FPEField>
          </FPESection>
        </FullPageEdit>

        {importModal && (
          <ImportModal
            onClose={() => setImportModal(false)}
            onImport={handleImport}
            existingCodigos={produtos.map(p => p.codigo?.toUpperCase()).filter(Boolean)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <SettingsLayout
        title="Produtos"
        description="Catálogo de produtos e serviços oferecidos pelo canal."
        columns={[
          { key: 'nome', label: 'Produto', render: (v, row) => (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0 }}>
                {(v || '').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{row.codigo}{row.categoria ? ` · ${row.categoria}` : ''}</div>
              </div>
            </div>
          )},
          { key: 'tipo',     label: 'Tipo',    render: (v) => <TipoBadge tipo={v} />, priority: 2 },
          { key: 'cobranca', label: 'Cobrança', render: (v) => <span style={{ fontSize:12, color:'var(--text-soft)' }}>{COBRANCAS.find(c => c.value === v)?.label || v}</span>, priority: 2 },
          { key: 'preco',    label: 'Preço',   align: 'right', render: (v) => v ? <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600 }}>R$ {Number(v).toLocaleString('pt-BR')}</span> : <span style={{ color:'var(--text-muted)' }}>—</span> },
          { key: 'status',   label: 'Status',  render: (v) => <StatusBadge status={v} /> },
        ]}
        data={filtered}
        keyField="id"
        emptyLabel="Nenhum produto cadastrado."
        onNew={abrirNovo}
        newLabel="+ Novo produto"
        rowActions={[
          { label: 'Editar',  onClick: abrirEdicao },
          { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
        ]}
        search={search}
        onSearchChange={setSearch}
        onImport={() => setImportModal(true)}
      />

      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onImport={handleImport}
          existingCodigos={produtos.map(p => p.codigo?.toUpperCase()).filter(Boolean)}
        />
      )}
    </>
  )
}
