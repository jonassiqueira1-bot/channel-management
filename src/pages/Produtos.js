import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useProducts } from '../hooks/useProducts'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT = 'var(--accent)'

const TIPOS_PRODUTO = [
  { value: 'saas',         label: 'SaaS',          color: 'var(--blue)',   bg: 'var(--blue-bg)',   text: 'var(--blue-text)' },
  { value: 'licenca',      label: 'Licença',        color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  { value: 'servico',      label: 'Serviço',        color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  { value: 'hardware',     label: 'Hardware',       color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'consultoria',  label: 'Consultoria',    color: '#7C3AED',       bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  { value: 'treinamento',  label: 'Treinamento',    color: '#0891B2',       bg: '#ECFEFF',          text: '#0E7490' },
]

const STATUS_PRODUTO = [
  { value: 'ativo',          label: 'Ativo',          color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  { value: 'rascunho',       label: 'Rascunho',       color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'descontinuado',  label: 'Descontinuado',  color: '#9A9590',       bg: 'var(--surface3)',  text: 'var(--text-muted)' },
]

const COBRANCAS = [
  { value: 'mensal',   label: 'Mensal' },
  { value: 'anual',    label: 'Anual' },
  { value: 'unico',    label: 'Pagamento único' },
  { value: 'uso',      label: 'Por uso' },
  { value: 'usuario',  label: 'Por usuário' },
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
      cobranca: r.cobranca || 'mensal', preco: parseFloat(r.preco) || 0,
      setup: parseFloat(r.setup) || 0, desconto_max: parseFloat(r.desconto_max) || 0,
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
    const ex = ['Canal NG Demo','CNG-DEMO','saas','CRM','rascunho','mensal','490','0','10','5','Feature 1\\nFeature 2','true','Descrição do produto',''].join(';')
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
          <button style={im.close} onClick={onClose}>✕</button>
        </div>

        {step === 'upload' && (
          <div style={im.body}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:13, color:'var(--text-soft)' }}>Envie um arquivo CSV com os produtos a importar.</span>
              <button style={im.tplBtn} onClick={downloadTemplate}>↓ Template CSV</button>
            </div>
            <div
              style={{ ...im.dropzone, borderColor: dragging ? 'var(--accent)' : 'var(--border)' }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='.csv'; i.onchange=ev=>handleFile(ev.target.files[0]); i.click() }}
            >
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
              <button style={im.cancelBtn} onClick={() => setStep('upload')}>← Voltar</button>
              <button style={{ ...im.saveBtn, opacity: okCount === 0 ? 0.5 : 1 }} disabled={okCount === 0} onClick={handleConfirm}>
                Importar {okCount} produto{okCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const im = {
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' },
  modal:     { background:'var(--surface)', borderRadius:14, width:680, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' },
  header:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  close:     { background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)', padding:4 },
  body:      { padding:'20px 24px', overflowY:'auto' },
  tplBtn:    { fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', cursor:'pointer', color:'var(--text-soft)', fontFamily:'var(--font)' },
  dropzone:  { border:'2px dashed', borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s', background:'var(--surface2)' },
  cancelBtn: { padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--text-soft)', fontFamily:'var(--font)' },
  saveBtn:   { padding:'7px 18px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'var(--font)' },
}

// ─── Export Tray ──────────────────────────────────────────────────────────────
function ExportTray({ logs, onClear, onClose }) {
  return (
    <div style={et.tray}>
      <div style={et.header}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Histórico de exportações</span>
        <div style={{ display:'flex', gap:10 }}>
          {logs.length > 0 && <button style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' }} onClick={onClear}>Limpar</button>}
          <button style={{ fontSize:13, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }} onClick={onClose}>✕</button>
        </div>
      </div>
      {logs.length === 0
        ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'32px 0' }}>
            <span style={{ fontSize:28 }}>📭</span>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhuma exportação ainda</span>
          </div>
        : <div style={{ maxHeight:320, overflowY:'auto' }}>
            {logs.map(l => (
              <div key={l.id} style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border2)' }}>
                <div style={{ width:28, height:28, borderRadius:7, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                  <span style={{ fontSize:14 }}>✅</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.fileName}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--mono)' }}>{l.total} registros · {l.scope} · {l.date}</div>
                </div>
              </div>
            ))}
          </div>
      }
      <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border2)', background:'var(--surface2)' }}>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          {logs.length} exportaç{logs.length !== 1 ? 'ões' : 'ão'} · sessão atual
        </span>
      </div>
    </div>
  )
}

const et = {
  tray:   { position:'absolute', top:'calc(100% + 8px)', right:0, width:360, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
}

// ─── CategoriaSelect — dropdown com gerenciamento inline de opções ────────────
function CategoriaSelect({ value, onChange, categorias, setCategorias, inputStyle }) {
  const [open, setOpen]     = useState(false)
  const [nova, setNova]     = useState('')
  const ref                 = useRef(null)

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
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          ...inputStyle,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          cursor:'pointer', textAlign:'left', width:'100%', boxSizing:'border-box',
          color: value ? 'var(--text)' : 'var(--text-muted)',
        }}>
        <span>{value || 'Selecione…'}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:400,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9,
          boxShadow:'0 8px 28px rgba(0,0,0,0.13)', overflow:'hidden', minWidth:200,
        }}>
          {/* Opções */}
          <div style={{ maxHeight:180, overflowY:'auto', padding:'4px 0' }}>
            <div
              onClick={() => { onChange(''); setOpen(false) }}
              style={{
                padding:'7px 12px', fontSize:12.5, cursor:'pointer', color:'var(--text-muted)',
                background: !value ? 'var(--accent-glow)' : 'transparent',
              }}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent' }}>
              — Nenhuma —
            </div>
            {categorias.map(cat => (
              <div key={cat} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'7px 12px', cursor:'pointer', fontSize:12.5,
                background: value === cat ? 'var(--accent-glow)' : 'transparent',
                color: value === cat ? 'var(--accent)' : 'var(--text)',
              }}
                onMouseEnter={e => { if (value !== cat) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (value !== cat) e.currentTarget.style.background = 'transparent' }}>
                <span onClick={() => { onChange(cat); setOpen(false) }} style={{ flex:1 }}>{cat}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeCategoria(cat) }}
                  title="Remover categoria"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:11, padding:'0 2px', lineHeight:1, marginLeft:6, flexShrink:0 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Adicionar nova */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'8px 10px', display:'flex', gap:6 }}>
            <input
              value={nova}
              onChange={e => setNova(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategoria() } }}
              placeholder="Nova categoria…"
              style={{
                flex:1, padding:'5px 8px', fontSize:12, border:'1px solid var(--border)',
                borderRadius:6, background:'var(--surface2)', color:'var(--text)',
                outline:'none', fontFamily:'var(--font)',
              }}
            />
            <button
              type="button"
              onClick={addCategoria}
              style={{
                padding:'5px 10px', background:'var(--accent)', color:'#fff', border:'none',
                borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0,
              }}>
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Produto Modal ────────────────────────────────────────────────────────────
function ProdutoModal({ onClose, onSave, onDelete, initial, existingCodigos, categorias, setCategorias }) {
  const [form, setForm]               = useState(initial || EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { sections, fieldById } = useFormLayout('products')

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function handleSave(e) {
    e.preventDefault()
    if (!form.nome.trim()) return alert('Nome é obrigatório')
    if (!form.codigo.trim()) return alert('Código é obrigatório')
    const codigo = form.codigo.trim().toUpperCase()
    const isDup = existingCodigos.includes(codigo) && initial?.codigo?.toUpperCase() !== codigo
    if (isDup) return alert('Já existe um produto com este código')
    onSave({ ...form, codigo, id: initial?.id || Date.now() })
    onClose()
  }

  function renderField(key) {
    switch (key) {
      case 'nome':
        return <input style={s.input} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Canal NG Pro" />
      case 'codigo':
        return <input style={{ ...s.input, fontFamily:'var(--mono)', textTransform:'uppercase' }} value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} placeholder="CNG-PRO" />
      case 'descricao':
        return <textarea style={{ ...s.input, minHeight:60, resize:'vertical' }} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o produto brevemente…" />
      case 'tipo':
        return <select style={s.input} value={form.tipo} onChange={e => set('tipo', e.target.value)}>{TIPOS_PRODUTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
      case 'categoria':
        return <CategoriaSelect value={form.categoria} onChange={v => set('categoria', v)} categorias={categorias} setCategorias={setCategorias} inputStyle={s.input} />
      case 'status':
        return <select style={s.input} value={form.status} onChange={e => set('status', e.target.value)}>{STATUS_PRODUTO.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}</select>
      case 'cobranca':
        return <select style={s.input} value={form.cobranca} onChange={e => set('cobranca', e.target.value)}>{COBRANCAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
      case 'preco':
        return <input style={{ ...s.input, fontFamily:'var(--mono)' }} type="number" min="0" step="0.01" value={form.preco} onChange={e => set('preco', e.target.value)} placeholder="0,00" />
      case 'setup':
        return <input style={{ ...s.input, fontFamily:'var(--mono)' }} type="number" min="0" step="0.01" value={form.setup} onChange={e => set('setup', e.target.value)} placeholder="0,00" />
      case 'desconto_max':
        return <input style={{ ...s.input, fontFamily:'var(--mono)' }} type="number" min="0" max="100" value={form.desconto_max} onChange={e => set('desconto_max', e.target.value)} placeholder="0" />
      case 'observacoes':
        return <textarea style={{ ...s.input, minHeight:60, resize:'vertical', fontSize:12 }} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas, restrições…" />
      default:
        return null
    }
  }

  const isEditing = !!initial

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.mHeader}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</div>
            {isEditing && <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>{initial.codigo}</div>}
          </div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
          <div style={s.mBody}>

            {/* Campos configuráveis via Conf. de Campos */}
            <DynamicFormLayout
              sections={sections}
              fieldById={fieldById}
              renderField={renderField}
              sectionStyle={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px', gap:12 }}
              labelStyle={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', display:'block', marginBottom:5 }}
            />

            {/* Funcionalidades (não configurável via layout) */}
            <div style={s.section}>
              <div style={s.sectionLabel}>Funcionalidades incluídas</div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Uma funcionalidade por linha</label>
                <textarea style={{ ...s.input, minHeight:90, resize:'vertical', fontFamily:'var(--mono)', fontSize:12 }}
                  value={form.features}
                  onChange={e => set('features', e.target.value)}
                  placeholder={'Pipeline Kanban\nGestão de metas\nRelatórios avançados'} />
              </div>
            </div>

            {/* Visibilidade */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Visibilidade no canal</label>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)' }}>
                <input type="checkbox" checked={form.visivel_canal} onChange={e => set('visivel_canal', e.target.checked)}
                  style={{ width:15, height:15, accentColor:'var(--accent)', cursor:'pointer' }} />
                <span style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>Visível no catálogo</span>
              </label>
            </div>

          </div>

          <div style={s.mFooter}>
            {isEditing ? (
              confirmDelete ? (
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>Excluir permanentemente?</span>
                  <button type="button" style={s.deleteConfirmBtn} onClick={() => { onDelete(initial.id); onClose() }}>Sim, excluir</button>
                  <button type="button" style={s.btn} onClick={() => setConfirmDelete(false)}>Cancelar</button>
                </div>
              ) : (
                <button type="button" style={s.deleteBtn} onClick={() => setConfirmDelete(true)}>Excluir produto</button>
              )
            ) : <div />}
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" style={s.btn} onClick={onClose}>Cancelar</button>
              <button type="submit" style={s.btnPrimary}>Salvar produto</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Produtos() {
  const [search, setSearch]             = useLocalState('produtos:search', '')
  const [filterTipo, setFilterTipo]     = useLocalState('produtos:filterTipo', '')
  const [filterStatus, setFilterStatus] = useLocalState('produtos:filterStatus', '')
  const [filterCat, setFilterCat]       = useLocalState('produtos:filterCat', '')
  const [sortBy, setSortBy]             = useLocalState('produtos:sortBy', 'nome')
  const [view, setView]                 = useLocalState('produtos:view', 'table')

  const [categorias, setCategorias]   = useLocalState('produtos:categorias', CATEGORIAS_DEFAULT)
  const { produtos, save: saveProduto, remove: deleteProduto, bulkSetStatus: bulkProdStatus, importMany: importProdutos } = useProducts()
  const [modal, setModal]             = useState(null)
  const [selected, setSelected]       = useState(new Set())
  const [importModal, setImportModal] = useState(false)
  const [exportLogs, setExportLogs]   = useState([])
  const [showTray, setShowTray]       = useState(false)
  const trayRef                       = useRef(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return produtos
      .filter(p => {
        if (filterTipo   && p.tipo      !== filterTipo)   return false
        if (filterStatus && p.status    !== filterStatus) return false
        if (filterCat    && p.categoria !== filterCat)    return false
        if (q && !(p.nome?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.descricao?.toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'preco_desc') return (b.preco||0) - (a.preco||0)
        if (sortBy === 'preco_asc')  return (a.preco||0) - (b.preco||0)
        if (sortBy === 'contratos')  return (b.contratos||0) - (a.contratos||0)
        if (sortBy === 'nome_z')     return b.nome?.localeCompare?.(a.nome) ?? 0
        return a.nome?.localeCompare?.(b.nome) ?? 0
      })
  }, [produtos, search, filterTipo, filterStatus, filterCat, sortBy])

  const ativos         = produtos.filter(p => p.status === 'ativo').length
  const visivelCanal   = produtos.filter(p => p.visivel_canal && p.status === 'ativo').length
  const totalContratos = produtos.reduce((acc, p) => acc + (p.contratos || 0), 0)

  const allIds       = filtered.map(p => p.id)
  const allSelected  = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected
  const chkRef       = useRef(null)
  useEffect(() => { if (chkRef.current) chkRef.current.indeterminate = someSelected }, [someSelected])
  function toggleAll()   { setSelected(allSelected ? new Set() : new Set(allIds)) }
  function toggleOne(id) { setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next }) }
  function clearSel()    { setSelected(new Set()) }

  function applyBulkAction(action) {
    if (action === 'delete') {
      if (!window.confirm(`Excluir ${selected.size} produto(s)?`)) return
      ;[...selected].forEach(id => deleteProduto(id))
    } else {
      bulkProdStatus([...selected], action)
    }
    clearSel()
  }

  function handleSave(data) { saveProduto(data) }
  function handleDelete(id) { deleteProduto(id) }
  function handleImport(items) { importProdutos(items) }

  function handleExport() {
    const scope = selected.size > 0 ? 'selecionados' : (search || filterTipo || filterStatus || filterCat) ? 'filtrados' : 'todos'
    const rows  = selected.size > 0 ? produtos.filter(p => selected.has(p.id)) : filtered
    const cols  = ['nome','codigo','tipo','categoria','status','cobranca','preco','setup','desconto_max','usuarios_incluidos','contratos','visivel_canal','descricao']
    const bom   = '﻿'
    const csv   = bom + [cols.join(';'), ...rows.map(r => cols.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(';'))].join('\n')
    const blob  = new Blob([csv], { type:'text/csv;charset=utf-8' })
    const a     = document.createElement('a')
    const fn    = `produtos_${new Date().toISOString().slice(0,10).replace(/-/g,'_')}.csv`
    a.href = URL.createObjectURL(blob); a.download = fn; a.click()
    setExportLogs(prev => [{ id: Date.now(), fileName: fn, total: rows.length, scope, date: new Date().toLocaleString('pt-BR') }, ...prev])
    setShowTray(true)
  }

  useEffect(() => {
    function h(e) { if (trayRef.current && !trayRef.current.contains(e.target)) setShowTray(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const existingCodigos = produtos.map(p => p.codigo?.toUpperCase()).filter(Boolean)
  const hasFilters      = !!(search || filterTipo || filterStatus || filterCat)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* ── Header ── */}
      <div style={pg.header}>
        <div>
          <h1 style={pg.title}>Produtos</h1>
          <p style={pg.desc}>Catálogo de produtos e serviços oferecidos pelo canal</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div ref={trayRef} style={{ position:'relative' }}>
            <button
              style={{ ...pg.actionBtn, ...(showTray ? { background:'var(--accent-glow)', borderColor:'rgba(30,58,95,0.2)', color:ACCENT } : {}) }}
              onClick={() => setShowTray(v => !v)}
            >
              ↓ Exportações
              {exportLogs.length > 0 && (
                <span style={{ position:'absolute', top:-5, right:-5, background:ACCENT, color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)' }}>
                  {exportLogs.length}
                </span>
              )}
            </button>
            {showTray && <ExportTray logs={exportLogs} onClear={() => setExportLogs([])} onClose={() => setShowTray(false)} />}
          </div>
          <button style={pg.actionBtn} onClick={() => setImportModal(true)}>↑ Importar</button>
          <button style={pg.newBtn} onClick={() => setModal('new')}>+ Novo produto</button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={pg.kpis}>
        <div style={{ ...pg.kpi, borderTop:'3px solid var(--border)' }}>
          <div style={pg.kpiVal}>{produtos.length}</div>
          <div style={pg.kpiLbl}>Total de produtos</div>
        </div>
        <div style={{ ...pg.kpi, borderTop:'3px solid var(--green)' }}>
          <div style={{ ...pg.kpiVal, color:'var(--green-text)' }}>{ativos}</div>
          <div style={pg.kpiLbl}>Ativos</div>
        </div>
        <div style={{ ...pg.kpi, borderTop:`3px solid ${ACCENT}` }}>
          <div style={{ ...pg.kpiVal, color:ACCENT }}>{visivelCanal}</div>
          <div style={pg.kpiLbl}>Visíveis no canal</div>
        </div>
        <div style={{ ...pg.kpi, borderRight:'none', borderTop:'3px solid var(--yellow)' }}>
          <div style={{ ...pg.kpiVal, color:'#B45309' }}>{totalContratos}</div>
          <div style={pg.kpiLbl}>Contratos ativos</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={pg.toolbar}>
        {/* Esquerda: busca + filtros */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:1, minWidth:0 }}>
          <div style={{ position:'relative', width:220, flexShrink:0 }}>
            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:14, pointerEvents:'none' }}>⌕</span>
            <input
              style={{ width:'100%', height:36, padding:'0 10px 0 28px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' }}
              placeholder="Buscar produto, código…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select style={pg.select} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS_PRODUTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select style={pg.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS_PRODUTO.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
          </select>
          <select style={pg.select} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilters && (
            <button style={{ fontSize:12, color:ACCENT, background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline', whiteSpace:'nowrap', flexShrink:0 }}
              onClick={() => { setSearch(''); setFilterTipo(''); setFilterStatus(''); setFilterCat('') }}>
              Limpar
            </button>
          )}
        </div>

        {/* Divisor */}
        <div style={{ width:1, height:24, background:'var(--border)', flexShrink:0, margin:'0 4px' }} />

        {/* Direita: ordenação + view toggle + contador */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <select style={pg.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="nome">Nome A–Z</option>
            <option value="nome_z">Nome Z–A</option>
            <option value="preco_desc">Maior preço</option>
            <option value="preco_asc">Menor preço</option>
            <option value="contratos">Mais contratos</option>
          </select>
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            <button style={{ padding:'6px 10px', background: view==='table' ? 'var(--accent-glow)' : 'none', border:'none', color: view==='table' ? ACCENT : 'var(--text-muted)', fontSize:14, cursor:'pointer' }} onClick={() => setView('table')}>☰</button>
            <button style={{ padding:'6px 10px', background: view==='cards' ? 'var(--accent-glow)' : 'none', border:'none', color: view==='cards' ? ACCENT : 'var(--text-muted)', fontSize:14, cursor:'pointer' }} onClick={() => setView('cards')}>⊞</button>
          </div>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
            {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 32px', background:ACCENT, flexWrap:'wrap', flexShrink:0 }}>
          <span style={{ display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--mono)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.7)', display:'inline-block' }} />
            {selected.size} selecionado{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>Alterar status:</span>
            {STATUS_PRODUTO.map(st => (
              <button key={st.value} style={{ padding:'4px 10px', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }} onClick={() => applyBulkAction(st.value)}>
                → {st.label}
              </button>
            ))}
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <button style={{ padding:'4px 10px', border:'1px solid rgba(252,165,165,0.3)', borderRadius:6, background:'rgba(255,255,255,0.12)', color:'#fca5a5', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }} onClick={() => applyBulkAction('delete')}>
              Excluir
            </button>
          </div>
          <button style={{ fontSize:12, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', marginLeft:'auto' }} onClick={clearSel}>✕ Limpar seleção</button>
        </div>
      )}

      {/* ── Content area ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 32px 32px' }}>

        {/* Table view */}
        {view === 'table' && (
          <table style={pg.table}>
            <thead>
              <tr>
                <th style={{ ...pg.th, width:36 }}>
                  <input type="checkbox" ref={chkRef} checked={allSelected} onChange={toggleAll} style={{ cursor:'pointer', accentColor:ACCENT }} />
                </th>
                <th style={pg.th}>Produto</th>
                <th style={pg.th}>Tipo</th>
                <th style={pg.th}>Cobrança</th>
                <th style={{ ...pg.th, textAlign:'right' }}>Preço</th>
                <th style={{ ...pg.th, textAlign:'right' }}>Setup</th>
                <th style={{ ...pg.th, textAlign:'center' }}>Canal</th>
                <th style={pg.th}>Status</th>
                <th style={{ ...pg.th, textAlign:'right' }}>Contratos</th>
                <th style={pg.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign:'center', padding:'48px 0', color:'var(--text-muted)', fontSize:14 }}>Nenhum produto encontrado</td></tr>
              )}
              {filtered.map(prod => (
                <tr key={prod.id} style={{ borderBottom:'1px solid var(--border2)', background: selected.has(prod.id) ? 'var(--accent-glow)' : 'transparent', transition:'background 0.1s' }}>
                  <td style={{ ...pg.td, width:36 }}>
                    <input type="checkbox" checked={selected.has(prod.id)} onChange={() => toggleOne(prod.id)} style={{ cursor:'pointer', accentColor:ACCENT }} />
                  </td>
                  <td style={pg.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={pg.avatar}>{prod.nome.slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{prod.nome}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{prod.codigo}{prod.categoria ? ` · ${prod.categoria}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={pg.td}><TipoBadge tipo={prod.tipo} /></td>
                  <td style={pg.td}><span style={{ fontSize:12, color:'var(--text-soft)' }}>{COBRANCAS.find(c => c.value === prod.cobranca)?.label || prod.cobranca}</span></td>
                  <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:'var(--text)' }}>
                    {prod.preco ? `R$ ${Number(prod.preco).toLocaleString('pt-BR')}` : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-soft)' }}>
                    {prod.setup ? `R$ ${Number(prod.setup).toLocaleString('pt-BR')}` : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ ...pg.td, textAlign:'center' }}>
                    <span style={{ fontSize:14, color: prod.visivel_canal ? 'var(--green-text)' : 'var(--text-muted)' }}>{prod.visivel_canal ? '✓' : '—'}</span>
                  </td>
                  <td style={pg.td}><StatusBadge status={prod.status} /></td>
                  <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontSize:13, color:'var(--text-soft)' }}>{prod.contratos ?? 0}</td>
                  <td style={pg.td}>
                    <button style={pg.btnEdit} onClick={() => setModal(prod)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Cards view */}
        {view === 'cards' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14, paddingTop:16 }}>
            {filtered.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'var(--text-muted)', fontSize:14 }}>Nenhum produto encontrado</div>
            )}
            {filtered.map(prod => {
              const tipoCfg = TIPOS_PRODUTO.find(t => t.value === prod.tipo)
              return (
                <div key={prod.id}
                  style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16, cursor:'pointer', transition:'box-shadow 0.15s', outlineOffset:2, outline: selected.has(prod.id) ? `2px solid ${ACCENT}` : 'none' }}
                  onClick={() => toggleOne(prod.id)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:`1px solid ${tipoCfg?.color || 'var(--border)'}33`, background: tipoCfg?.bg, color: tipoCfg?.text }}>
                      {prod.nome.slice(0,2).toUpperCase()}
                    </div>
                    <StatusBadge status={prod.status} />
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:2 }}>{prod.nome}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', marginBottom:8 }}>{prod.codigo}</div>
                  {prod.descricao && <div style={{ fontSize:12, color:'var(--text-soft)', marginBottom:10, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{prod.descricao}</div>}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                    <TipoBadge tipo={prod.tipo} />
                    {prod.categoria && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--surface2)', color:'var(--text-soft)' }}>{prod.categoria}</span>}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border2)' }}>
                    <div>
                      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>
                        {prod.preco ? `R$ ${Number(prod.preco).toLocaleString('pt-BR')}` : 'Gratuito'}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{COBRANCAS.find(c=>c.value===prod.cobranca)?.label}</div>
                    </div>
                    <button style={pg.btnEdit} onClick={e => { e.stopPropagation(); setModal(prod) }}>Editar</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <ProdutoModal
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          initial={modal === 'new' ? null : modal}
          existingCodigos={existingCodigos}
          categorias={categorias}
          setCategorias={setCategorias}
        />
      )}
      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onImport={handleImport}
          existingCodigos={existingCodigos}
        />
      )}
    </div>
  )
}

// ─── Page styles (Franquias pattern) ──────────────────────────────────────────
const pg = {
  header:    { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'28px 32px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  title:     { fontSize:22, fontWeight:800, color:'var(--text)', margin:0, letterSpacing:'-0.3px' },
  desc:      { fontSize:13, color:'var(--text-muted)', margin:'4px 0 0', lineHeight:1.4 },
  kpis:      { display:'flex', gap:0, borderBottom:'1px solid var(--border)', flexShrink:0 },
  kpi:       { flex:1, padding:'14px 32px', display:'flex', flexDirection:'column', justifyContent:'center', borderRight:'1px solid var(--border)' },
  kpiVal:    { fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl:    { fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 },
  toolbar:   { display:'flex', alignItems:'center', gap:12, padding:'14px 32px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' },
  select:    { padding:'7px 10px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)' },
  table:     { width:'100%', borderCollapse:'collapse', marginTop:8 },
  th:        { padding:'8px 12px', fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', textAlign:'left', borderBottom:'1px solid var(--border)' },
  td:        { padding:'12px 12px', fontSize:13, verticalAlign:'middle' },
  avatar:    { width:34, height:34, borderRadius:9, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0 },
  btnEdit:   { fontSize:11.5, fontWeight:600, color:ACCENT, background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:'var(--font)' },
  newBtn:    { fontSize:13, fontWeight:700, color:'#fff', background:ACCENT, border:'none', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontFamily:'var(--font)' },
  actionBtn: { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px solid var(--border)', borderRadius:8, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', position:'relative' },
}

// ─── Modal styles (Franquias pattern) ─────────────────────────────────────────
const s = {
  overlay:          { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(2px)' },
  modal:            { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' },
  mHeader:          { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  close:            { background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)', padding:4 },
  mBody:            { padding:'20px 24px', display:'flex', flexDirection:'column', gap:18, overflowY:'auto', flex:1 },
  mFooter:          { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 },
  section:          { display:'flex', flexDirection:'column', gap:12 },
  sectionLabel:     { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', paddingBottom:8, borderBottom:'1px solid var(--border2)' },
  fieldGroup:       { display:'flex', flexDirection:'column', gap:6 },
  label:            { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' },
  input:            { padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
  btn:              { fontSize:13, color:'var(--text-soft)', background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font)' },
  btnPrimary:       { fontSize:13, fontWeight:700, color:'#fff', background:ACCENT, border:'none', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontFamily:'var(--font)' },
  deleteBtn:        { fontSize:13, color:'var(--red)', background:'none', border:'1px solid var(--red)', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font)' },
  deleteConfirmBtn: { fontSize:13, fontWeight:700, color:'#fff', background:'var(--red)', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font)' },
}
