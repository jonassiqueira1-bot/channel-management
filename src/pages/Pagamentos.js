import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocalState } from '../hooks/useLocalState'
import { STATUS_PAGAMENTO } from '../data/mockPagamentos'
import { usePayments } from '../hooks/usePayments'
import { useContracts } from '../hooks/useContracts'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import { useProducts } from '../hooks/useProducts'
import EmpresaSearch from '../components/EmpresaSearch'
// eslint-disable-next-line no-unused-vars
import { RULES_STORAGE_KEY, PAYMENTS_STORAGE_KEY as COMISSOES_PAYMENTS_KEY, MOCK_RULES, MOCK_PAYMENTS as MOCK_COM_PAYMENTS } from '../data/mockComissoes'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'
import Button from '../components/Button'
import SearchSelect from '../components/SearchSelect'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { useAuditLog } from '../hooks/useAuditLog'
import { useCommissions } from '../hooks/useCommissions'
import { useProjects } from '../hooks/useProjects'
import ActionFeedback from '../components/ActionFeedback'

const ACCENT = 'var(--accent)'
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Distribui o valor do produto no bucket correto baseado no tipo
function valorPorTipo(prod, valor) {
  if (!prod || !valor) return {}
  const v = parseFloat(valor) || 0
  if (v <= 0) return {}
  const t = (prod.tipo || '').toLowerCase()
  if (t === 'saas')   return { amount_sms: v, amount_cdu: 0, amount_services: 0 }
  if (t === 'licenca') return { amount_cdu: v, amount_sms: 0, amount_services: 0 }
  // servico, consultoria, treinamento → Serviços
  return { amount_services: v, amount_cdu: 0, amount_sms: 0 }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
}
function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}
function parsePeriodo(dateStr) {
  const [y, m] = dateStr.split('-')
  return { year: Number(y), month: Number(m) }
}
function periodoLabel({ month, year }) {
  return `${MESES[month - 1]}/${year}`
}
function periodoKey({ month, year }) {
  return `${year}-${String(month).padStart(2,'0')}-01`
}
function periodosUnicos(lista) {
  const seen = new Set()
  return lista
    .map(p => p.reference_month)
    .filter(d => { if (seen.has(d)) return false; seen.add(d); return true })
    .sort((a, b) => b.localeCompare(a))
    .map(parsePeriodo)
}

// ─── PeriodoPicker ────────────────────────────────────────────────────────────
function PeriodoPicker({ value, onChange, periodos }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(value.year)
  const ref = useRef(null)

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const mesesDisponiveis = new Set(periodos.filter(p => p.year === year).map(p => p.month))
  const yearsDisponiveis = [...new Set(periodos.map(p => p.year))].sort((a,b)=>b-a)

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', gap:8, padding:'0 14px', height:36,
        background:'var(--surface)', border:`1.5px solid ${open ? ACCENT : 'var(--border)'}`,
        borderRadius:8, cursor:'pointer', fontFamily:'var(--font)', fontSize:13, fontWeight:600,
        color:'var(--text)', boxShadow: open ? `0 0 0 3px ${ACCENT}18` : 'none', transition:'all 0.15s',
      }}>
        <span style={{ fontSize:14 }}>📅</span>
        {periodoLabel(value)}
        <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:2,
          transform: open ? 'rotate(180deg)' : 'none', display:'inline-block', transition:'transform 0.15s' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:500,
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,0.14)',
          padding:16, minWidth:240,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <button onClick={() => setYear(y=>y-1)} disabled={!yearsDisponiveis.includes(year-1)}
              style={{ ...navBtn, opacity:yearsDisponiveis.includes(year-1)?1:0.3 }}>‹</button>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{year}</span>
            <button onClick={() => setYear(y=>y+1)} disabled={!yearsDisponiveis.includes(year+1)}
              style={{ ...navBtn, opacity:yearsDisponiveis.includes(year+1)?1:0.3 }}>›</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
            {MESES.map((m, i) => {
              const month = i+1
              const ativo = value.year===year && value.month===month
              const disp  = mesesDisponiveis.has(month)
              return (
                <button key={m} onClick={() => { if(disp){onChange({month,year});setOpen(false)} }}
                  style={{ padding:'7px 4px', borderRadius:7, border:'none', cursor:disp?'pointer':'default',
                    fontFamily:'var(--font)', fontSize:12, fontWeight:ativo?700:500,
                    background:ativo?ACCENT:disp?'var(--surface2)':'transparent',
                    color:ativo?'#fff':disp?'var(--text)':'var(--border2)', transition:'all 0.1s' }}>
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
const navBtn = {
  background:'none', border:'1px solid var(--border)', borderRadius:6, width:28, height:28,
  cursor:'pointer', color:'var(--text-soft)', fontSize:14, display:'flex',
  alignItems:'center', justifyContent:'center', padding:0, fontFamily:'var(--mono)',
}

// ─── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_PAGAMENTO[status] || STATUS_PAGAMENTO.pendente
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.text,
      whiteSpace:'nowrap', fontFamily:'var(--mono)' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}
function ProcessadoBadge({ processed }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:20, fontSize:11, fontWeight:700, fontFamily:'var(--mono)',
      background:processed?'#D1FAE5':'#F1F5F9', color:processed?'#065F46':'#64748B' }}>
      {processed ? '✓ Gerado' : '— Pendente'}
    </span>
  )
}


// ─── ImportModal ──────────────────────────────────────────────────────────────
const IMPORT_HEADERS = ['contract_numero','company_nome','num_documento','data_emissao','parcela',
                        'amount_cdu','amount_sms','amount_services','amount_discount',
                        'reference_month','due_date','status']
const TEMPLATE_CSV   = IMPORT_HEADERS.join(';')+
  '\nCTR-2024-001;Nexus Tech;NF100200;2026-07-01;1/1;890;47;450;0;2026-07-01;2026-07-10;pendente'

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers:[], rows:[] }
  const headers = lines[0].split(';').map(h=>h.trim())
  const rows = lines.slice(1).map(l => {
    const vals = l.split(';')
    const obj = {}
    headers.forEach((h,i) => { obj[h]=(vals[i]||'').trim() })
    return obj
  })
  return { headers, rows }
}

function validateImportRow(row) {
  const errors = []
  if (!row.contract_numero) errors.push('contract_numero obrigatório')
  if (!row.company_nome)    errors.push('company_nome obrigatório')
  if (!row.reference_month || !/^\d{4}-\d{2}-\d{2}$/.test(row.reference_month))
    errors.push('reference_month inválido (AAAA-MM-DD)')
  if (row.status && !STATUS_PAGAMENTO[row.status])
    errors.push(`status inválido: ${row.status}`)
  return errors
}

function ImportModal({ onClose, onImport }) {
  const [parsed, setParsed] = useState(null)
  const [fileName, setFileName] = useState('')

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const { headers, rows } = parseCSV(ev.target.result)
      const rowResults = rows.map((row, i) => {
        const errors = validateImportRow(row)
        return { row, errors, ok:errors.length===0, line:i+2 }
      })
      setParsed({ headers, rows, rowResults })
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download='template_pagamentos.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function handleConfirmImport() {
    const okRows = parsed.rowResults.filter(r=>r.ok).map(r => {
      const cdu      = parseFloat(r.row.amount_cdu)||0
      const sms      = parseFloat(r.row.amount_sms)||0
      const services = parseFloat(r.row.amount_services)||0
      const discount = parseFloat(r.row.amount_discount)||0
      return {
        id: 'imp_'+Date.now()+'_'+Math.random().toString(36).slice(2),
        contract_id: null, contract_numero: r.row.contract_numero,
        company_id: null,  company_nome: r.row.company_nome,
        num_documento: r.row.num_documento||null,
        data_emissao:  r.row.data_emissao||null,
        parcela:       r.row.parcela||'1/1',
        amount_cdu: cdu, amount_sms: sms,
        amount_services: services, amount_discount: discount,
        amount_total_net: cdu+sms+services-discount,
        valor_recebido: null, data_baixa: null,
        reference_month: r.row.reference_month,
        due_date: r.row.due_date||null,
        status: STATUS_PAGAMENTO[r.row.status] ? r.row.status : 'pendente',
        processed: false, notes: '', tenant_id:'t1',
        criado: new Date().toISOString().slice(0,10),
      }
    })
    onImport(okRows, {
      id:Date.now(), fileName, date:new Date().toLocaleString('pt-BR'),
      total:okRows.length, errors:parsed.rowResults.filter(r=>!r.ok).length, scope:'importados',
    })
    onClose()
  }

  const okCount = parsed?.rowResults.filter(r=>r.ok).length||0
  const SL = { fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase',
               letterSpacing:'0.08em', display:'block', marginBottom:5 }

  return (
    <div style={ov.wrap} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ ...ov.modal, maxWidth:560 }}>
        <div style={ov.header}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Importar pagamentos</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>CSV com separador ponto-e-vírgula (;) — UTF-8</div>
          </div>
          <button style={ov.xBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:'20px 24px' }}>
          <div style={{ background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Template CSV</span>
              <button onClick={handleDownloadTemplate}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                  background:ACCENT, color:'#fff', border:'none', borderRadius:7,
                  fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                ⬇ Baixar template
              </button>
            </div>
            <div style={{ background:'var(--surface)', borderRadius:7, border:'1px solid var(--border2)',
              padding:'10px 12px', fontFamily:'var(--mono)', fontSize:11, color:'var(--text-soft)',
              overflow:'auto', whiteSpace:'pre' }}>
              {TEMPLATE_CSV}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={SL}>Selecionar arquivo</label>
            <input type="file" accept=".csv" onChange={handleFile}
              style={{ display:'block', fontSize:13, color:'var(--text)', fontFamily:'var(--font)',
                padding:'8px', border:'1px dashed var(--border)', borderRadius:8, width:'100%',
                boxSizing:'border-box', background:'var(--surface2)', cursor:'pointer' }} />
          </div>
          {parsed && (
            <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid var(--border)',
              borderRadius:8, background:'var(--surface2)' }}>
              {parsed.rowResults.map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px',
                  borderBottom:i<parsed.rowResults.length-1?'1px solid var(--border2)':'none',
                  background:r.ok?'transparent':'rgba(239,68,68,0.04)' }}>
                  <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--mono)',
                    color:r.ok?'#10B981':'#EF4444', flexShrink:0, marginTop:2 }}>
                    {r.ok?'✓':'✗'} L{r.line}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:'var(--text)', fontWeight:600,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.row.contract_numero} · {r.row.company_nome}
                    </div>
                    {!r.ok && <div style={{ fontSize:11, color:'#EF4444', marginTop:2 }}>{r.errors.join(', ')}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={ov.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={okCount===0} onClick={handleConfirmImport}>
            Importar {okCount} pagamento{okCount!==1?'s':''}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── PagamentoDetail (SlideOver) ─────────────────────────────────────────────
function PagamentoDetail({ pagamento, onSave, onClose, pagamentosExistentes = [], projetos = [], saveRef }) {
  const [form, setForm] = useState({
    amount_cdu:      pagamento.amount_cdu,
    amount_sms:      pagamento.amount_sms,
    amount_services: pagamento.amount_services,
    amount_discount: pagamento.amount_discount,
    status:          pagamento.status,
    due_date:        pagamento.due_date||'',
    data_emissao:    pagamento.data_emissao||'',
    data_baixa:      pagamento.data_baixa||'',
    num_documento:   pagamento.num_documento||'',
    valor_recebido:  pagamento.valor_recebido??'',
    parcela:         pagamento.parcela||'',
    produto_id:      pagamento.produto_id||'',
    produto_nome:    pagamento.produto_nome||'',
    notes:           pagamento.notes||'',
  })
  const [dirty, setDirty] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  function set(k, v) { setForm(f=>({...f,[k]:v})); setDirty(true); setSavedOk(false) }

  function numVal(k) {
    return {
      type:'text', inputMode:'numeric',
      value: form[k]!=='' && form[k]!==null ? Number(form[k]).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '',
      placeholder:'0,00',
      onChange: e => { const r=e.target.value.replace(/\./g,'').replace(',','.'); set(k,isNaN(parseFloat(r))?'':parseFloat(r)) },
    }
  }

  function handleSave() {
    const built = { ...pagamento, ...form,
      amount_total_net: Math.max(0,(Number(form.amount_cdu)||0)+(Number(form.amount_sms)||0)+(Number(form.amount_services)||0)-(Number(form.amount_discount)||0)),
      valor_recebido: form.valor_recebido!==''?Number(form.valor_recebido)||0:null,
      produto_id: form.produto_id?Number(form.produto_id):null,
      processed: true,
    }
    if (form.produto_id && pagamento.company_id && form.due_date) {
      const dup = pagamentosExistentes.find(p =>
        p.id !== pagamento.id &&
        String(p.produto_id) === String(form.produto_id) &&
        String(p.company_id) === String(pagamento.company_id) &&
        p.due_date === form.due_date
      )
      if (dup) { alert(`Já existe um pagamento deste produto para esta empresa com o mesmo vencimento.`); return }
    }
    onSave(built)
    setDirty(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2200)
  }

  if (saveRef) saveRef.current = handleSave

  const bruto    = (Number(form.amount_cdu)||0)+(Number(form.amount_sms)||0)+(Number(form.amount_services)||0)
  const liquido  = Math.max(0, bruto-(Number(form.amount_discount)||0))
  const recebido = form.valor_recebido!=='' ? Number(form.valor_recebido)||0 : null
  const diferenca = recebido !== null ? recebido - liquido : null

  const { produtos: produtosRaw } = useProducts()
  const prodListDrawer = (produtosRaw.length > 0 ? produtosRaw : MOCK_PRODUTOS).filter(p => p.status === 'ativo')

  const rInp = { paddingLeft: 28, fontFamily:'var(--mono)', fontWeight:600 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <FormSection label="Fatura" />
      <FormGrid cols={2}>
        <FormField label="Status">
          <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_PAGAMENTO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </FormField>
        <FormField label="Produto">
          <SearchSelect
            options={prodListDrawer.map(p => ({ id: String(p.id), label: p.nome, sublabel: p.codigo || '' }))}
            value={form.produto_id ? String(form.produto_id) : ''}
            placeholder="Pesquisar produto…"
            onChange={id => {
              const prod = prodListDrawer.find(p => String(p.id) === id)
              const buckets = valorPorTipo(prod, prod?.preco)
              setForm(f => ({ ...f, produto_id: id || '', produto_nome: prod?.nome||'', ...buckets }))
              setDirty(true); setSavedOk(false)
            }}
          />
        </FormField>
        <FormField label="Nº Documento">
          <input className="so-field" value={form.num_documento} placeholder="NF000000"
            onChange={e => set('num_documento', e.target.value)} />
        </FormField>
        <FormField label="Emissão">
          <input type="date" className="so-field" value={form.data_emissao}
            onChange={e => set('data_emissao', e.target.value)} />
        </FormField>
        <FormField label="Parcela">
          <input className="so-field" value={form.parcela} placeholder="1/1"
            onChange={e => set('parcela', e.target.value)} />
        </FormField>
      </FormGrid>

      <FormSection label="Composição de valores" />
      <div style={{ padding:'0 24px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <FormGrid cols={3}>
          {[
            { k:'amount_cdu',      label:'Licença',      color:'var(--accent)' },
            { k:'amount_sms',      label:'Mensalidade',  color:'#3B82F6' },
            { k:'amount_services', label:'Serviços',     color:'#10B981' },
          ].map(({ k, label, color }) => (
            <FormField key={k} label={label}>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                  fontSize:11, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
                <input {...numVal(k)} className="so-field" style={rInp} />
              </div>
            </FormField>
          ))}
        </FormGrid>
        <FormField label="Desconto">
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
              fontSize:11, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
            <input {...numVal('amount_discount')} className="so-field" style={rInp} />
          </div>
        </FormField>
        <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8,
          padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
            textTransform:'uppercase', letterSpacing:'0.06em' }}>Total líquido</span>
          <span style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)',
            color: liquido > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
            {fmtMoeda(liquido)}
          </span>
        </div>
      </div>

      <FormSection label="Baixa / Liquidação" />
      <FormGrid cols={3}>
        <FormField label="Vencimento">
          <input type="date" className="so-field" value={form.due_date}
            onChange={e => set('due_date', e.target.value)} />
        </FormField>
        <FormField label="Data de Baixa">
          <input type="date" className="so-field" value={form.data_baixa}
            onChange={e => set('data_baixa', e.target.value)} />
        </FormField>
        <FormField label="Valor Recebido">
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
              fontSize:11, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
            <input {...numVal('valor_recebido')} className="so-field" style={rInp}
              placeholder={liquido>0?Number(liquido).toLocaleString('pt-BR',{minimumFractionDigits:2}):'0,00'} />
          </div>
        </FormField>
      </FormGrid>
      {diferenca !== null && diferenca !== 0 && (
        <div style={{ margin:'0 24px 8px', padding:'8px 12px', borderRadius:8,
          background: diferenca>0 ? 'var(--green-bg)' : 'var(--red-bg)',
          border:`1px solid ${diferenca>0?'var(--green)':'var(--red)'}30`,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, fontWeight:700,
            color: diferenca>0 ? 'var(--green-text)' : 'var(--red-text)',
            textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {diferenca>0 ? '↑ Recebido a mais' : '↓ Diferença a cobrar'}
          </span>
          <span style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)',
            color: diferenca>0 ? 'var(--green-text)' : 'var(--red-text)' }}>
            {diferenca>0?'+':''}{fmtMoeda(Math.abs(diferenca))}
          </span>
        </div>
      )}

      <FormSection label="Contrato / Origem" />
      <FormGrid cols={3}>
        <FormField label="Empresa">
          <input className="so-field" value={pagamento.company_nome} readOnly disabled />
        </FormField>
        <FormField label="Contrato">
          <input className="so-field" value={pagamento.contract_numero || '—'} readOnly disabled style={{ fontFamily:'var(--mono)' }} />
        </FormField>
        <FormField label="Competência">
          <input className="so-field" value={periodoLabel(parsePeriodo(pagamento.reference_month))} readOnly disabled style={{ fontFamily:'var(--mono)' }} />
        </FormField>
        {(pagamento.origin_type === 'projeto' || pagamento.project_id) && (() => {
          const proj = projetos.find(p => p.id === pagamento.project_id)
          return (
            <FormField label="Projeto" style={{ gridColumn: 'span 2' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                  background:'rgba(16,185,129,0.12)', color:'#10B981',
                  textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>
                  projeto
                </span>
                <input className="so-field" value={proj?.name || pagamento.contract_numero || '—'} readOnly disabled />
              </div>
            </FormField>
          )
        })()}
      </FormGrid>

      <FormSection label="Observações" />
      <div style={{ padding:'0 24px 24px' }}>
        <textarea className="so-field" rows={3} value={form.notes || ''} placeholder="Observações sobre este faturamento…"
          style={{ resize:'vertical', minHeight:72 }}
          onChange={e => set('notes', e.target.value)} />
      </div>

    </div>
  )
}

function _PagamentoModalLegacy({ pagamento, onSave, onClose }) { // eslint-disable-line
  const [form, setForm] = useState({
    amount_cdu:      pagamento.amount_cdu,
    amount_sms:      pagamento.amount_sms,
    amount_services: pagamento.amount_services,
    amount_discount: pagamento.amount_discount,
    status:          pagamento.status,
    due_date:        pagamento.due_date||'',
    data_emissao:    pagamento.data_emissao||'',
    data_baixa:      pagamento.data_baixa||'',
    num_documento:   pagamento.num_documento||'',
    valor_recebido:  pagamento.valor_recebido??'',
    parcela:         pagamento.parcela||'',
    produto_id:      pagamento.produto_id||'',
    produto_nome:    pagamento.produto_nome||'',
    notes:           pagamento.notes||'',
  })
  function set(k, v) { setForm(f=>({...f,[k]:v})) }
  function numVal(k) {
    return {
      type:'text', inputMode:'numeric',
      value: form[k]!=='' && form[k]!==null ? Number(form[k]).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '',
      placeholder:'0,00',
      onChange: e => { const r=e.target.value.replace(/\./g,'').replace(',','.'); set(k,isNaN(parseFloat(r))?'':parseFloat(r)) },
    }
  }
  const bruto          = (Number(form.amount_cdu)||0)+(Number(form.amount_sms)||0)+(Number(form.amount_services)||0)
  const liquido        = Math.max(0, bruto-(Number(form.amount_discount)||0))
  const recebido       = form.valor_recebido!=='' ? Number(form.valor_recebido)||0 : null
  const diferenca      = recebido !== null ? recebido - liquido : null

  const SL = { fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase',
               letterSpacing:'0.08em', display:'block', marginBottom:5 }
  const inp = { padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7,
                background:'var(--surface2)', color:'var(--text)', fontSize:13,
                fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' }
  const rInp = { ...inp, paddingLeft:28, fontFamily:'var(--mono)', fontWeight:600 }

  return (
    <div style={ov.wrap} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={ov.modal}>
        <div style={ov.header}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{pagamento.contract_numero}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {pagamento.company_nome} · {periodoLabel(parsePeriodo(pagamento.reference_month))}
            </div>
          </div>
          <button style={ov.xBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ov.body}>

          {/* ── Seção 1: Identificação do documento ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={SL}>Produto / Tipo</label>
              <select style={inp} value={form.produto_id}
                onChange={e => {
                  const prod = MOCK_PRODUTOS.find(p=>String(p.id)===e.target.value)
                  const buckets = valorPorTipo(prod, prod?.preco)
                  setForm(f => ({ ...f, produto_id: e.target.value, produto_nome: prod?.nome||'', ...buckets }))
                }}>
                <option value="">Selecione o produto…</option>
                {MOCK_PRODUTOS.filter(p=>p.status==='ativo').map(p=>(
                  <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={SL}>Num. Documento</label>
              <input style={inp} value={form.num_documento} placeholder="NF000000"
                onChange={e=>set('num_documento',e.target.value)} />
            </div>
            <div>
              <label style={SL}>Emissão Nota</label>
              <input type="date" style={inp} value={form.data_emissao} onChange={e=>set('data_emissao',e.target.value)} />
            </div>
            <div>
              <label style={SL}>Parcela</label>
              <input style={inp} value={form.parcela} placeholder="1/1"
                onChange={e=>set('parcela',e.target.value)} />
            </div>
          </div>

          {/* ── Seção 2: Composição de valores ── */}
          <div style={{ background:'rgba(248,250,252,0.9)', border:'1px solid #E2E8F0',
            borderRadius:12, padding:18, marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
              {[
                { k:'amount_cdu',      label:'Valor CDU',     color:'var(--accent)' },
                { k:'amount_sms',      label:'Valor SMS',     color:'#3B82F6' },
                { k:'amount_services', label:'Valor Serviços',color:'#10B981' },
              ].map(({ k, label, color }) => (
                <div key={k}>
                  <label style={{ ...SL, color }}>
                    <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%',
                      background:color, marginRight:5, verticalAlign:'middle' }} />
                    {label}
                  </label>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                      fontSize:11, fontWeight:600, color:'#94A3B8', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
                    <input {...numVal(k)} style={rInp} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid #E2E8F0', paddingTop:14, textAlign:'right' }}>
              <label style={{ ...SL, textAlign:'right', marginBottom:6 }}>Total Líquido</label>
              <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.03em',
                fontFamily:'var(--mono)', color:liquido>0?'#0F172A':'#94A3B8' }}>
                {fmtMoeda(liquido)}
              </div>
            </div>
          </div>

          {/* ── Seção 3: Baixa / Liquidação ── */}
          <div style={{ background:'rgba(248,250,252,0.6)', border:'1px solid #E2E8F0',
            borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase',
              letterSpacing:'0.08em', marginBottom:12 }}>Baixa / Liquidação</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, alignItems:'end' }}>
              <div>
                <label style={SL}>Vencimento</label>
                <input type="date" style={inp} value={form.due_date} onChange={e=>set('due_date',e.target.value)} />
              </div>
              <div>
                <label style={SL}>Data de Baixa</label>
                <input type="date" style={inp} value={form.data_baixa} onChange={e=>set('data_baixa',e.target.value)} />
              </div>
              <div>
                <label style={SL}>Valor Recebido (R$)</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                    fontSize:11, fontWeight:600, color:'#94A3B8', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
                  <input {...numVal('valor_recebido')} style={rInp}
                    placeholder={liquido > 0 ? Number(liquido).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '0,00'} />
                </div>
              </div>
            </div>
            {/* Diferença */}
            {diferenca !== null && diferenca !== 0 && (
              <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8,
                background: diferenca > 0 ? '#D1FAE5' : '#FEE2E2',
                border: `1px solid ${diferenca > 0 ? '#6EE7B7' : '#FECACA'}`,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, fontWeight:700, color: diferenca>0?'#065F46':'#991B1B',
                  textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {diferenca>0 ? '↑ Recebido a mais' : '↓ Diferença a cobrar'}
                </span>
                <span style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)',
                  color: diferenca>0?'#065F46':'#991B1B' }}>
                  {diferenca>0?'+':''}{fmtMoeda(Math.abs(diferenca))}
                </span>
              </div>
            )}
          </div>

          {/* ── Seção 4: Status + Observações ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={SL}>Status</label>
              <select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}>
                {Object.entries(STATUS_PAGAMENTO).map(([k,v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={SL}>Observações</label>
              <input style={inp} value={form.notes} placeholder="Observações sobre este faturamento…"
                onChange={e=>set('notes',e.target.value)} />
            </div>
          </div>
        </div>
        <div style={ov.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={()=>{
              onSave({
                ...pagamento, ...form,
                amount_total_net: liquido,
                valor_recebido: recebido,
                produto_id: form.produto_id ? Number(form.produto_id) : null,
                processed: true,
              })
              onClose()
            }}>
            {pagamento.processed?'Salvar alterações':'✓ Gerar fatura'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── GerarTodosModal ──────────────────────────────────────────────────────────
function GerarTodosModal({ periodo, pendentes, onConfirm, onClose }) {
  const total = pendentes.reduce((s,p)=>s+p.amount_total_net,0)
  return (
    <div style={ov.wrap} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ ...ov.modal, maxWidth:420 }}>
        <div style={ov.header}>
          <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Gerar Todos — {periodoLabel(periodo)}</div>
          <button style={ov.xBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:'20px 24px' }}>
          {pendentes.length===0 ? (
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
              Todas as cobranças desta competência já foram geradas.
            </p>
          ) : (
            <>
              <p style={{ fontSize:13, color:'var(--text-soft)', margin:'0 0 16px' }}>
                Serão geradas <strong>{pendentes.length}</strong> fatura{pendentes.length>1?'s':''} para{' '}
                <strong>{periodoLabel(periodo)}</strong>, totalizando <strong>{fmtMoeda(total)}</strong>.
              </p>
              <div style={{ background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', overflow:'hidden' }}>
                {pendentes.map((p, i) => (
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'9px 14px', borderBottom:i<pendentes.length-1?'1px solid var(--border2)':'none' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{p.company_nome}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{p.contract_numero}</div>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>
                      {fmtMoeda(p.amount_total_net)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={ov.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          {pendentes.length>0 && (
            <Button onClick={()=>{onConfirm();onClose()}}>✓ Confirmar geração</Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── NovoPagamentoModal ────────────────────────────────────────────────────────
const EMPTY_PAG = {
  contract_numero: '', company_nome: '', company_id: null,
  reference_month: new Date().toISOString().slice(0, 7) + '-01',
  amount_cdu: '', amount_sms: '', amount_services: '', amount_discount: '',
  due_date: '', status: 'pendente', notes: '',
}

function NovoPagamentoModal({ onClose, onSave, periodo, pagamentosExistentes = [] }) {
  const [form, setForm] = useState({
    ...EMPTY_PAG,
    reference_month: periodoKey(periodo),
    due_date: periodoKey(periodo),
  })
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const cdu      = parseFloat(form.amount_cdu)      || 0
  const sms      = parseFloat(form.amount_sms)      || 0
  const services = parseFloat(form.amount_services) || 0
  const discount = parseFloat(form.amount_discount) || 0
  const liquido  = Math.max(0, cdu + sms + services - discount)

  function handleSave() {
    if (!form.contract_numero.trim()) return alert('Número do contrato é obrigatório')
    if (!form.company_nome.trim())    return alert('Empresa é obrigatória')
    // Bloqueia duplicata: mesmo produto + empresa + vencimento
    if (form.produto_id && form.company_id && form.due_date) {
      const dup = pagamentosExistentes.find(p =>
        String(p.produto_id) === String(form.produto_id) &&
        String(p.company_id) === String(form.company_id) &&
        p.due_date === form.due_date
      )
      if (dup) return alert(`Já existe um pagamento deste produto para ${form.company_nome} com vencimento em ${form.due_date}.`)
    }
    onSave({
      id: 'man_' + Date.now(),
      contract_id: null,
      contract_numero: form.contract_numero.trim(),
      company_id: form.company_id,
      company_nome: form.company_nome.trim(),
      num_documento: null, data_emissao: null, parcela: '1/1',
      amount_cdu: cdu, amount_sms: sms,
      amount_services: services, amount_discount: discount,
      amount_total_net: liquido,
      valor_recebido: null, data_baixa: null,
      reference_month: form.reference_month,
      due_date: form.due_date || null,
      status: form.status,
      processed: false,
      notes: form.notes,
      produto_id: form.produto_id ? Number(form.produto_id) : null,
      produto_nome: form.produto_nome || '',
      tenant_id: 't1',
      criado: new Date().toISOString().slice(0, 10),
    })
    onClose()
  }

  const { produtos: produtosRaw2 } = useProducts()
  const produtosDisponiveis = (produtosRaw2.length > 0 ? produtosRaw2 : MOCK_PRODUTOS).filter(p => p.status === 'ativo')

  const SL  = { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', display:'block', marginBottom:5 }
  const inp = { padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' }
  const rInp = { ...inp, paddingLeft:28, fontFamily:'var(--mono)', fontWeight:600 }
  const statusOptions = Object.entries(STATUS_PAGAMENTO).map(([k, v]) => ({ value: k, label: v.label }))

  const { sections: pgSections, fieldById: pgFieldById } = useFormLayout('payments')

  function renderPagamentoField(key) {
    switch (key) {
      case 'referencia':
        return <input style={inp} value={form.contract_numero} placeholder="CTR-2024-001" onChange={e => set('contract_numero', e.target.value)} />
      case 'empresa_id':
        return <input style={inp} value={form.company_nome} placeholder="Nome da empresa" onChange={e => set('company_nome', e.target.value)} />
      case 'tipo':
        return (
          <SearchSelect
            options={produtosDisponiveis.map(p => ({ id: String(p.id), label: p.nome, sublabel: p.codigo || '' }))}
            value={form.produto_id ? String(form.produto_id) : ''}
            placeholder="Pesquisar produto…"
            onChange={id => {
              const prod = produtosDisponiveis.find(p => String(p.id) === id)
              set('produto_id', id || '')
              set('produto_nome', prod?.nome || '')
            }}
          />
        )
      case 'status':
        return (
          <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'valor':       return null  // calculado a partir dos componentes CDU/SMS/Serviços
      case 'vencimento':
        return <input type="date" style={inp} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
      case 'data_pagamento':
        return <input type="month" style={inp} value={form.reference_month.slice(0, 7)} onChange={e => set('reference_month', e.target.value + '-01')} />
      case 'descricao':
        return <input style={inp} value={form.notes || ''} placeholder="Observações opcionais…" onChange={e => set('notes', e.target.value)} />
      case 'observacoes': return null
      default:            return null
    }
  }

  return (
    <div style={ov.wrap} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...ov.modal, maxWidth: 560 }}>
        <div style={ov.header}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Novo Pagamento</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Lançamento manual de cobrança</div>
          </div>
          <button style={ov.xBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Campos configuráveis via Conf. de Campos */}
          <DynamicFormLayout
            sections={pgSections}
            fieldById={pgFieldById}
            renderField={renderPagamentoField}
            sectionStyle={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', gap:12 }}
            labelStyle={SL}
          />

          {/* Composição de valores — fixo */}
          <div>
            <label style={{ ...SL, marginBottom:10 }}>Composição de valores</label>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                {[
                  { k:'amount_cdu',      label:'CDU',      color:'var(--accent)' },
                  { k:'amount_sms',      label:'SMS',      color:'#3B82F6' },
                  { k:'amount_services', label:'Serviços', color:'#10B981' },
                  { k:'amount_discount', label:'Desconto', color:'#EF4444' },
                ].map(({ k, label, color }) => (
                  <div key={k}>
                    <div style={{ fontSize:10, color, fontFamily:'var(--mono)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{label}</div>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:10, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
                      <input type="number" min="0" step="0.01" style={rInp}
                        value={form[k]} placeholder="0,00"
                        onChange={e => set(k, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Total líquido</span>
                <span style={{ fontSize:20, fontWeight:800, fontFamily:'var(--mono)', color: liquido > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                  R$ {liquido.toLocaleString('pt-BR', { minimumFractionDigits:2 })}
                </span>
              </div>
            </div>
          </div>

        </div>

        <div style={ov.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>+ Adicionar pagamento</Button>
        </div>
      </div>
    </div>
  )
}


// ─── Página principal ─────────────────────────────────────────────────────────
const FILTERS_DEF = [
  { key: 'status',     label: 'Status',    options: Object.entries(STATUS_PAGAMENTO).map(([k,v]) => ({ value:k, label:v.label })) },
  { key: 'processado', label: 'Processado', options: [{ value:'sim', label:'Gerado' }, { value:'nao', label:'Pendente' }] },
]

export default function Pagamentos() {
  const { pagamentos, setPagamentos, save: savePagamento } = usePayments()
  const { registrar: log } = useAuditLog()
  const { contratos } = useContracts()
  const { savePayment: saveCommissionPayment, rules: commissionRules } = useCommissions()
  const { projetos } = useProjects()

  // ── estado persistido ─────────────────────────────────────────────────────
  const [search, setSearch]                     = useLocalState('pagamentos:search', '')
  const [filtroStatus, setFiltroStatus]         = useLocalState('pagamentos:filtroStatus', '')
  const [filtroProcessado, setFiltroProcessado] = useLocalState('pagamentos:filtroProcessado', '')
  const { produtos: produtosReais } = useProducts()
  const produtosNovo = produtosReais.length > 0
    ? produtosReais.filter(p => p.status === 'ativo')
    : MOCK_PRODUTOS.filter(p => p.status === 'ativo')

  // ── estado efêmero ────────────────────────────────────────────────────────
  const [detalheModal, setDetalheModal]       = useState(null)
  const pagSaveRef = useRef(null)
  const [gerarTodosModal, setGerarTodosModal] = useState(false)
  const [novoPagForm, setNovoPagForm]         = useState(null)
  const [savingNovo, setSavingNovo]           = useState(false) // eslint-disable-line no-unused-vars
  const [importModal, setImportModal]         = useState(false)
  const [recebidoFeedback, setRecebidoFeedback] = useState(null) // { pag, steps }
  const [confirmComissao, setConfirmComissao] = useState(null)   // pag aguardando confirmação

  const periodos = useMemo(() => periodosUnicos(pagamentos), [pagamentos])
  const [periodo, setPeriodo] = useState(() => periodos[0] || { month:6, year:2026 })

  const doPeriodo = useMemo(() => {
    const key = periodoKey(periodo)
    return pagamentos.filter(p => p.reference_month === key)
  }, [pagamentos, periodo])

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return doPeriodo.filter(p => {
      if (filtroStatus && p.status !== filtroStatus) return false
      if (filtroProcessado === 'sim' && !p.processed) return false
      if (filtroProcessado === 'nao' && p.processed)  return false
      if (q && !p.company_nome.toLowerCase().includes(q) &&
               !p.contract_numero.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => a.company_nome.localeCompare(b.company_nome, 'pt-BR'))
  }, [doPeriodo, search, filtroStatus, filtroProcessado])


  const naoProcessados = doPeriodo.filter(p=>!p.processed)

  // ── Filtros BrowseLayout ──────────────────────────────────────────────────
  const activeFiltersNorm = {
    status:     filtroStatus     ? [filtroStatus]     : [],
    processado: filtroProcessado ? [filtroProcessado] : [],
  }
  function handleFilterChange(f) {
    setFiltroStatus(f.status?.[0]     || '')
    setFiltroProcessado(f.processado?.[0] || '')
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const headers = ['contract_numero','company_nome','num_documento','data_emissao','parcela',
                     'amount_cdu','amount_sms','amount_services','amount_discount','amount_total_net',
                     'valor_recebido','reference_month','due_date','data_baixa','status','processed']
    const fileName = `pagamentos_${periodoKey(periodo).slice(0,7)}_${new Date().toISOString().slice(0,10)}.csv`
    const csv = [headers.join(';'), ...lista.map(p => headers.map(h => p[h]??'').join(';'))].join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url)
  }

  // ── Novo pagamento ────────────────────────────────────────────────────────
  function handleSaveNovo() {
    const form = novoPagForm
    if (!form) return
    if (!form.contract_numero.trim()) return alert('Número do contrato é obrigatório')
    if (!form.company_nome.trim())    return alert('Empresa é obrigatória')
    if (form.produto_id && form.company_id && form.due_date) {
      const dup = pagamentos.find(p =>
        String(p.produto_id) === String(form.produto_id) &&
        String(p.company_id) === String(form.company_id) &&
        p.due_date === form.due_date
      )
      if (dup) return alert(`Já existe um pagamento deste produto para ${form.company_nome} com vencimento em ${form.due_date}.`)
    }
    const licenca  = parseFloat(form.amount_cdu)      || 0
    const mensalid = parseFloat(form.amount_sms)      || 0
    const services = parseFloat(form.amount_services) || 0
    const discount = parseFloat(form.amount_discount) || 0
    handleNovoPagamento({
      id: 'man_' + Date.now(),
      contract_id: null,
      contract_numero: form.contract_numero.trim(),
      company_id: form.company_id,
      company_nome: form.company_nome.trim(),
      num_documento: null, data_emissao: null, parcela: '1/1',
      amount_cdu: licenca, amount_sms: mensalid,
      amount_services: services, amount_discount: discount,
      amount_total_net: Math.max(0, licenca + mensalid + services - discount),
      valor_recebido: null, data_baixa: null,
      reference_month: form.reference_month,
      due_date: form.due_date || null,
      status: form.status,
      processed: false,
      notes: form.notes,
      produto_id: form.produto_id ? Number(form.produto_id) : null,
      produto_nome: form.produto_nome || '',
      tenant_id: 't1',
      criado: new Date().toISOString().slice(0, 10),
    })
    setNovoPagForm(null)
  }

  // Gera repasses de comissão para um pagamento recém marcado como pago
  function gerarRepasses(pag) {
    try {
      const ref    = pag.reference_month || ''
      const parts  = ref.slice(0, 7).split('-')
      const periodo_ano = parts[0] ? Number(parts[0]) : new Date().getFullYear()
      const periodo_mes = parts[1] ? Number(parts[1]) : new Date().getMonth() + 1

      const regrasAtivas = (commissionRules || []).filter(r => r.ativo !== false && r.status !== 'inativa')

      regrasAtivas.forEach(rule => {
        // Filtra por produto se a regra tiver filtro
        if (rule.produto_filtro_tipo === 'produto' && rule.produto_ids?.length > 0) {
          if (!rule.produto_ids.map(String).includes(String(pag.produto_id))) return
        }

        const percs = rule.persona_percentuais || []
        percs.forEach(pp => {
          if (!pp.persona_id && !pp.persona_slug) return
          const cdu_val      = (pag.amount_cdu      || 0) * (Number(pp.cdu_pct)      || 0) / 100
          const sms_val      = (pag.amount_sms      || 0) * (Number(pp.sms_pct)      || 0) / 100
          const servicos_val = (pag.amount_services || 0) * (Number(pp.servicos_pct) || 0) / 100
          const valor_comissao = cdu_val + sms_val + servicos_val
          if (valor_comissao <= 0) return

          saveCommissionPayment({
            rule_id:           rule.id,
            company_id:        pag.company_id  || null,
            contract_id:       pag.contract_id || null,
            beneficiario_id:   pp.persona_id   || null,
            beneficiario_nome: pp.persona_nome  || pp.persona_slug || '',
            persona_slug:      pp.persona_slug  || '',
            periodo_mes,
            periodo_ano,
            valor_bruto:       Number(pag.amount_total_net) || 0,
            valor_comissao,
            status:            'pendente',
            observacoes:       `Repasse — ${pag.contract_numero || ''} (${pag.company_nome || ''})`,
            custom_fields: {
              base_cdu:              cdu_val,
              base_sms:              sms_val,
              base_servicos:         servicos_val,
              contract_numero:       pag.contract_numero || '',
              company_nome:          pag.company_nome    || '',
              produto_nome:          pag.produto_nome    || '',
              origem_pagamento_id:   pag.id,
            },
          })
        })
      })
    } catch (e) {
      console.warn('[gerarRepasses]', e)
    }
  }

  function handleSave(pag) {
    const anterior = pagamentos.find(p => p.id === pag.id)
    savePagamento(pag)
    log('editar', 'pagamento', pag.id, { descricao: `Pagamento editado: ${pag.company_nome || ''} — ${pag.reference_month || ''}${pag.status !== anterior?.status ? ` (status: ${pag.status})` : ''}` })
    console.log('[handleSave] status:', pag.status, '| anterior:', anterior?.status, '| vai mostrar popup:', pag.status === 'pago' && anterior?.status !== 'pago')
    if (pag.status === 'pago' && anterior?.status !== 'pago') {
      setConfirmComissao(pag)
    }
  }

  function confirmarGerarComissao(pag) {
    setConfirmComissao(null)
    gerarRepasses(pag)
    const isFromProjeto = pag.origin_type === 'projeto' || pag._origem === 'fechamento_horas' ||
      (pag.notes || '').toLowerCase().includes('fechamento de horas')
    const temValores = (pag.amount_cdu || 0) + (pag.amount_sms || 0) + (pag.amount_services || 0) > 0
    const steps = [
      { id: 'recebimento', label: `Recebimento registrado — ${pag.company_nome || pag.contract_numero}` },
      { id: 'tipo',        label: isFromProjeto
          ? `Origem: Serviços de projeto — ${pag.contract_numero || 'N/D'}`
          : `Origem: Venda — Contrato ${pag.contract_numero || 'N/D'}` },
      { id: 'comissao',    label: 'Gerando lançamento de comissão pendente', skip: !temValores },
      { id: 'repasse',     label: 'Calculando repasses por persona' },
    ]
    setRecebidoFeedback({ pag, steps })
  }

  function gerarLancamentoComissao(pag) {
    // Determina origem (projeto vs venda)
    const isFromProjeto = pag.origin_type === 'projeto' || pag._origem === 'fechamento_horas' ||
      (pag.notes || '').toLowerCase().includes('fechamento de horas')

    // Tipo de receita dominante
    const cdu      = Number(pag.amount_cdu)      || 0
    const sms      = Number(pag.amount_sms)      || 0
    const services = Number(pag.amount_services) || 0
    let receita_tipo = 'Serviços'
    if (!isFromProjeto) {
      if (cdu >= sms && cdu >= services && cdu > 0)      receita_tipo = 'CDU'
      else if (sms >= cdu && sms >= services && sms > 0) receita_tipo = 'SMS'
      else if (services > 0)                             receita_tipo = 'Serviços'
    }

    // Descrição/origem descritiva
    const descricao = isFromProjeto
      ? `Comissão de Serviços — Projeto: ${pag.contract_numero || 'N/D'}`
      : `Comissão de Vendas — Contrato: ${pag.contract_numero || 'N/D'} — ${pag.company_nome || ''}`

    // Extrai mês/ano do reference_month (formato YYYY-MM-DD)
    const ref   = pag.reference_month || pag.data_emissao || ''
    const parts = ref.slice(0, 7).split('-')
    const periodo_ano = parts[0] ? Number(parts[0]) : new Date().getFullYear()
    const periodo_mes = parts[1] ? Number(parts[1]) : new Date().getMonth() + 1

    saveCommissionPayment({
      status:            'pendente',
      valor_bruto:       Number(pag.amount_total_net) || 0,
      valor_comissao:    0,
      beneficiario_id:   null,
      beneficiario_nome: null,
      persona_slug:      null,
      rule_id:           null,
      company_id:        pag.company_id  || null,
      contract_id:       pag.contract_id || null,
      periodo_mes,
      periodo_ano,
      observacoes:       descricao,
      custom_fields: {
        receita_tipo,
        origem:              isFromProjeto ? 'projeto' : 'venda',
        origem_pagamento_id: pag.id,
        contract_numero:     pag.contract_numero || '',
        company_nome:        pag.company_nome    || '',
        produto_nome:        pag.produto_nome    || '',
        amount_cdu:          cdu,
        amount_sms:          sms,
        amount_services:     services,
      },
    })
  }

  function handleNovoPagamento(pag) {
    const pagComOrigem = { ...pag, origin_type: pag.origin_type || 'manual' }
    savePagamento(pagComOrigem)
    log('criar', 'pagamento', pag.id, { descricao: `Pagamento criado: ${pag.company_nome || ''} — ${pag.reference_month || ''}` })
    gerarLancamentoComissao(pagComOrigem)
    // navega para o período do novo pagamento
    const ref = parsePeriodo(pag.reference_month)
    setPeriodo(ref)
  }

  function handleImport(rows) {
    setPagamentos(prev => [...prev, ...rows])
  }

  function gerarTodos() {
    const key = periodoKey(periodo)
    setPagamentos(prev => prev.map(p => p.reference_month === key && !p.processed ? { ...p, processed: true } : p))
  }

  // ── KPIs node ─────────────────────────────────────────────────────────────
  const kpisNode = (data) => {
    const kpis = {
      total:       data.length,
      processados: data.filter(p=>p.processed).length,
      pendentes:   data.filter(p=>!p.processed).length,
      valorTotal:  data.reduce((s,p)=>s+(p.amount_total_net||0),0),
      emAberto:    data.filter(p=>p.status==='pendente'||p.status==='vencido')
                       .reduce((s,p)=>s+(p.amount_total_net||0),0),
    }
    return (
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', padding:'8px 0' }}>
        {[
          { label:'Contratos',    value:kpis.total,                color:'var(--text)' },
          { label:'Gerados',      value:kpis.processados,          color:'#10B981' },
          { label:'Não gerados',  value:kpis.pendentes,            color:'#F59E0B' },
          { label:'Total líquido',value:fmtMoeda(kpis.valorTotal), color:ACCENT, mono:true },
          { label:'Em aberto',    value:fmtMoeda(kpis.emAberto),   color:'#EF4444', mono:true },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border)',
            borderTop:`2px solid ${k.color}`, borderRadius:10, padding:'14px 20px',
            display:'flex', flexDirection:'column', gap:2, minWidth:120 }}>
            <span style={{ fontSize:k.mono?16:24, fontWeight:800, color:k.color,
              fontFamily:k.mono?'var(--mono)':'var(--font)', letterSpacing:k.mono?'-0.02em':'-0.03em' }}>
              {k.value}
            </span>
            <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{k.label}</span>
          </div>
        ))}
      </div>
    )
  }

  // ── Colunas da tabela ─────────────────────────────────────────────────────
  const hoje = new Date().toISOString().slice(0, 10)
  const columns = [
    {
      key: 'company_nome', label: 'Contrato / Empresa',
      render: (val, row) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:`${ACCENT}18`,
            color:ACCENT, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:10, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
            border:`1px solid ${ACCENT}30` }}>
            {(val||'?').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
              {row.contract_numero}{row.parcela && row.parcela!=='1/1' ? ` · ${row.parcela}` : ''}
            </div>
            {row.produto_nome && (
              <span style={{ fontSize:9, fontWeight:700, color:ACCENT, background:`${ACCENT}10`,
                border:`1px solid ${ACCENT}25`, borderRadius:4, padding:'1px 5px',
                fontFamily:'var(--mono)', display:'inline-block', marginTop:2, lineHeight:'14px' }}>
                {row.produto_nome}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'num_documento', label: 'Num. Documento',
      render: (val, row) => val
        ? <div>
            <span style={{ fontSize:11, fontFamily:'var(--mono)', fontWeight:600,
              color:'var(--text-soft)', background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:5, padding:'2px 7px',
              whiteSpace:'nowrap' }}>{val}</span>
            {row.data_emissao && <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>emissão {fmtData(row.data_emissao)}</div>}
          </div>
        : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>,
    },
    { key:'amount_cdu',       label:'Licença',      render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'var(--accent)' }}>{fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_sms',       label:'Mensalidade',  render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'#3B82F6' }}>{fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_services',  label:'Serviços',     render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'#10B981' }}>{fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_discount',  label:'Desconto',     render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'#EF4444' }}>↓ {fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_total_net', label:'Total Líquido', render: v => <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14, color:'var(--text)' }}>{fmtMoeda(v)}</span> },
    {
      key:'valor_recebido', label:'Vl. Recebido',
      render: (v, row) => v != null
        ? <div>
            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12,
              color: v > row.amount_total_net ? '#10B981' : v < row.amount_total_net ? '#EF4444' : 'var(--text-soft)' }}>
              {fmtMoeda(v)}
            </span>
            {v !== row.amount_total_net && (
              <div style={{ fontSize:9, fontFamily:'var(--mono)', color: v > row.amount_total_net ? '#10B981' : '#EF4444' }}>
                {v > row.amount_total_net ? '+' : ''}{fmtMoeda(v - row.amount_total_net)}
              </div>
            )}
          </div>
        : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>,
    },
    {
      key:'due_date', label:'Vencimento',
      render: (v, row) => {
        const atras = row.status !== 'pago' && v && v < hoje
        const urge  = !atras && v && new Date(v) - new Date(hoje) <= 7 * 86400000
        return <span style={{ fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap', color: atras?'#EF4444':urge?'#D97706':'var(--text-soft)' }}>{atras?'⚠ ':urge?'⏰ ':''}{fmtData(v)}</span>
      },
    },
    { key:'data_baixa',  label:'Baixa',      render: v => <span style={{ fontFamily:'var(--mono)', fontSize:12, color: v ? '#10B981' : 'var(--border2)' }}>{v ? fmtData(v) : '—'}</span> },
    { key:'processed',   label:'Processado', render: v => <ProcessadoBadge processed={v} /> },
    { key:'status',      label:'Status',     render: v => <StatusBadge status={v} /> },
  ]

  return (
    <>
      <BrowseLayout
        data={lista}
        columns={columns}
        keyField="id"
        storageKey="pagamentos_browse"
        kpis={kpisNode}
        kpisLabel="Indicadores"
        search={search}
        onSearchChange={setSearch}
        filters={FILTERS_DEF}
        activeFilters={activeFiltersNorm}
        onFilterChange={handleFilterChange}
        onNew={() => setNovoPagForm({ ...EMPTY_PAG, reference_month: periodoKey(periodo), due_date: periodoKey(periodo) })}
        newLabel="Novo Pagamento"
        bulkActions={[
          { label: '✓ Gerar faturas', onClick: ids => setPagamentos(prev => prev.map(p => ids.includes(p.id) ? { ...p, processed: true } : p)) },
          { label: 'Marcar como recebido', onClick: ids => {
            const naoEramPagos = pagamentos.filter(p => ids.includes(p.id) && p.status !== 'pago')
            setPagamentos(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'pago' } : p))
            naoEramPagos.forEach(p => gerarRepasses({ ...p, status: 'pago' }))
          }},
          { label: 'Excluir', onClick: ids => {
            if (window.confirm(`Excluir ${ids.length} pagamento(s) permanentemente?`))
              setPagamentos(prev => prev.filter(p => !ids.includes(p.id)))
          }},
        ]}
        onRowClick={p => setDetalheModal(p)}
        onImport={() => setImportModal(true)}
        onExportCsv={handleExport}
        secondaryActions={
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <PeriodoPicker value={periodo} onChange={p => setPeriodo(p)} periodos={periodos} />
            <Button onClick={() => setGerarTodosModal(true)}>
              + Gerar Todos
              {naoProcessados.length > 0 && (
                <span style={{ marginLeft:6, background:'rgba(255,255,255,0.25)', borderRadius:10,
                  padding:'1px 7px', fontSize:10, fontWeight:800, fontFamily:'var(--mono)' }}>
                  {naoProcessados.length}
                </span>
              )}
            </Button>
          </div>
        }
        emptyState={
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'var(--text-muted)' }}>
            <span style={{ fontSize:28, opacity:0.3 }}>💸</span>
            <span style={{ fontSize:13 }}>Nenhum faturamento encontrado para este período</span>
          </div>
        }
      />

      {/* ── Detalhe (SlideOver) ── */}
      <SlideOver
        open={!!detalheModal}
        onClose={() => setDetalheModal(null)}
        title={detalheModal ? `${detalheModal.contract_numero} — ${detalheModal.company_nome}` : ''}
        subtitle={detalheModal ? periodoLabel(parsePeriodo(detalheModal.reference_month)) : ''}
        defaultWidth={720}
        onSave={() => pagSaveRef.current?.()}
        saveLabel="Salvar"
      >
        {detalheModal && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <PagamentoDetail
              pagamento={detalheModal}
              onSave={handleSave}
              onClose={() => setDetalheModal(null)}
              pagamentosExistentes={pagamentos}
              projetos={projetos || []}
              saveRef={pagSaveRef}
            />
          </div>
        )}
      </SlideOver>

      {/* ── Novo Pagamento (SlideOver) ── */}
      <SlideOver
        open={!!novoPagForm}
        onClose={() => setNovoPagForm(null)}
        title="Novo Pagamento"
        subtitle="Lançamento manual de cobrança"
        onSave={handleSaveNovo}
        saveLabel="+ Adicionar pagamento"
        defaultWidth={720}
      >
        {novoPagForm && (() => {
          const form = novoPagForm
          const set = (k, v) => setNovoPagForm(f => ({ ...f, [k]: v }))
          const licenca  = parseFloat(form.amount_cdu)      || 0
          const mensalid = parseFloat(form.amount_sms)      || 0
          const services = parseFloat(form.amount_services) || 0
          const discount = parseFloat(form.amount_discount) || 0
          const liquido  = Math.max(0, licenca + mensalid + services - discount)
          return (
            <div style={{ flex:1, overflowY:'auto', minHeight:0, display:'flex', flexDirection:'column', gap:0 }}>
              <FormSection label="Identificação" />
              <FormGrid cols={2}>
                <FormField label="Nº do contrato" required>
                  <SearchSelect
                    options={contratos.map(c => ({ id: c.id, label: c.numero, sublabel: c.empresa_nome || '' }))}
                    value={form.contract_id || null}
                    placeholder="Buscar contrato…"
                    onChange={id => {
                      const c = contratos.find(ct => ct.id === id)
                      setNovoPagForm(f => ({
                        ...f, contract_id: id || null, contract_numero: c?.numero || '',
                        company_id: c?.empresa_id || f.company_id, company_nome: c?.empresa_nome || f.company_nome,
                        produto_id: null, produto_nome: '',
                        amount_cdu: 0, amount_sms: 0, amount_services: 0, amount_discount: 0,
                      }))
                    }}
                  />
                </FormField>
                <FormField label="Empresa" required>
                  <EmpresaSearch
                    value={form.company_id}
                    label={form.company_nome}
                    onChange={(id, nome) => setNovoPagForm(f => ({ ...f, company_id: id, company_nome: nome }))}
                  />
                </FormField>
                <FormField label="Produto">
                  {(() => {
                    const contratoSel = form.contract_id ? contratos.find(c => c.id === form.contract_id) : null
                    const idsDoContrato = contratoSel
                      ? [...(contratoSel.itens_adesao||[]), ...(contratoSel.itens_mrr||[]), ...(contratoSel.itens_servico||[])]
                          .map(i => String(i.produto_id)).filter(Boolean)
                      : []
                    const opcoesDisponiveis = idsDoContrato.length > 0
                      ? produtosNovo.filter(p => idsDoContrato.includes(String(p.id)))
                      : produtosNovo
                    return (
                      <SearchSelect
                        options={opcoesDisponiveis.map(p => ({ id: String(p.id), label: p.nome, sublabel: p.codigo || '' }))}
                        value={form.produto_id ? String(form.produto_id) : null}
                        onChange={id => {
                          const prod = opcoesDisponiveis.find(p => String(p.id) === id)
                          // Busca o valor deste produto no contrato selecionado
                          const contratoSel2 = form.contract_id ? contratos.find(c => c.id === form.contract_id) : null
                          let amount_cdu = 0, amount_sms = 0, amount_services = 0
                          if (contratoSel2 && id) {
                            const itemAdesao  = (contratoSel2.itens_adesao  || []).find(i => String(i.produto_id) === id)
                            const itemMrr     = (contratoSel2.itens_mrr     || []).find(i => String(i.produto_id) === id)
                            const itemServico = (contratoSel2.itens_servico || []).find(i => String(i.produto_id) === id)
                            amount_cdu      = parseFloat(itemAdesao?.valor)  || 0
                            amount_sms      = parseFloat(itemMrr?.valor)     || 0
                            amount_services = parseFloat(itemServico?.valor) || 0
                          }
                          setNovoPagForm(f => ({ ...f, produto_id: id || null, produto_nome: prod?.nome || '', amount_cdu, amount_sms, amount_services }))
                        }}
                        placeholder={idsDoContrato.length > 0 ? `${idsDoContrato.length} produto(s) do contrato…` : 'Buscar produto…'}
                        inputStyle={{ height:40, border:'1px solid var(--border)', borderRadius:7, padding:'0 12px', fontSize:13, width:'100%', boxSizing:'border-box', background:'var(--surface2)', fontFamily:'var(--font)', color:'var(--text)' }}
                      />
                    )
                  })()}
                </FormField>
                <FormField label="Status">
                  <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
                    {Object.entries(STATUS_PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Competência">
                  <input type="month" className="so-field" value={form.reference_month.slice(0,7)} onChange={e => set('reference_month', e.target.value + '-01')} />
                </FormField>
                <FormField label="Vencimento">
                  <input type="date" className="so-field" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                </FormField>
                <FormField label="Observações">
                  <input className="so-field" value={form.notes||''} placeholder="Observações opcionais…" onChange={e => set('notes', e.target.value)} />
                </FormField>
              </FormGrid>
              <FormSection label="Composição de valores" />
              <FormGrid cols={2}>
                {[
                  { k:'amount_cdu',      label:'Licença' },
                  { k:'amount_sms',      label:'Mensalidade' },
                  { k:'amount_services', label:'Serviços' },
                  { k:'amount_discount', label:'Desconto', hint:'Aplicado sobre o total' },
                ].map(({ k, label, hint }) => (
                  <FormField key={k} label={label} hint={hint}>
                    <input type="number" min="0" step="0.01" className="so-field" value={form[k]} placeholder="0,00" onChange={e => set(k, e.target.value)} />
                  </FormField>
                ))}
              </FormGrid>
              <div style={{ margin:'4px 24px 20px', background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Total líquido</span>
                <span style={{ fontSize:20, fontWeight:800, fontFamily:'var(--mono)', color: liquido > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{fmtMoeda(liquido)}</span>
              </div>
            </div>
          )
        })()}
      </SlideOver>

      {gerarTodosModal && (
        <GerarTodosModal periodo={periodo} pendentes={naoProcessados}
          onConfirm={gerarTodos} onClose={() => setGerarTodosModal(false)} />
      )}
      {importModal && (
        <ImportModal onClose={() => setImportModal(false)} onImport={handleImport} />
      )}

      {recebidoFeedback && (
        <ActionFeedback
          title={`Recebimento confirmado — ${recebidoFeedback.pag.company_nome || recebidoFeedback.pag.contract_numero}`}
          subtitle="Comissões geradas · Repasses calculados"
          steps={recebidoFeedback.steps}
          onClose={() => setRecebidoFeedback(null)}
          stepDelay={750}
          autoClose={4500}
        />
      )}

      {/* ── Confirmação de geração de comissão ── */}
      {confirmComissao && (() => {
        const pag = confirmComissao
        const temValores = (pag.amount_cdu||0) + (pag.amount_sms||0) + (pag.amount_services||0) > 0
        const isFromProjeto = pag.origin_type === 'projeto' || pag._origem === 'fechamento_horas' || (pag.notes||'').toLowerCase().includes('fechamento de horas')
        return createPortal(
          <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.7)', backdropFilter:'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:9999 }}>
            <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:460,
              boxShadow:'0 24px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ width:42, height:42, borderRadius:12, background:'rgba(16,185,129,0.12)', display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>💰</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Pagamento recebido</div>
                  <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:3 }}>
                    Ao confirmar, as seguintes ações serão executadas automaticamente:
                  </div>
                </div>
              </div>
              {/* Itens */}
              <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 12px',
                  borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                  <div style={{ width:18, height:18, borderRadius:4, background:'var(--accent)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Registrar recebimento</div>
                    <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>
                      {pag.company_nome || pag.contract_numero} · {isFromProjeto ? 'Serviços de projeto' : `Contrato ${pag.contract_numero || ''}`}
                    </div>
                  </div>
                </div>
                {temValores && (
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 12px',
                    borderRadius:10, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                    <div style={{ width:18, height:18, borderRadius:4, background:'var(--accent)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Gerar lançamento de comissão pendente</div>
                      <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>
                        Valor bruto: {(Number(pag.amount_cdu)||0) + (Number(pag.amount_sms)||0) + (Number(pag.amount_services)||0) > 0
                          ? `R$ ${((Number(pag.amount_cdu)||0)+(Number(pag.amount_sms)||0)+(Number(pag.amount_services)||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
                          : '—'} · Status: pendente em Comissões
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button onClick={() => setConfirmComissao(null)}
                  style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)',
                    background:'transparent', color:'var(--text-muted)', fontSize:13, cursor:'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => confirmarGerarComissao(pag)}
                  style={{ padding:'8px 20px', borderRadius:8, border:'none',
                    background:'#10B981', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Confirmar e gerar comissão
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}
    </>
  )
}

// ─── Styles (modais) ──────────────────────────────────────────────────────────
const ov = {
  wrap:      { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:500,
               display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  modal:     { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:520,
               boxShadow:'0 20px 60px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  header:    { display:'flex', justifyContent:'space-between', alignItems:'flex-start',
               padding:'20px 24px 14px', borderBottom:'1px solid var(--border)' },
  body:      { padding:'20px 24px', overflowY:'auto', flex:1 },
  footer:    { padding:'14px 24px', borderTop:'1px solid var(--border)',
               display:'flex', justifyContent:'flex-end', gap:8 },
  xBtn:      { background:'none', border:'none', color:'var(--text-muted)', fontSize:16,
               cursor:'pointer', padding:'4px 6px', borderRadius:6 },
  cancelBtn: { padding:'8px 18px', background:'var(--surface2)', color:'var(--text-soft)',
               border:'1px solid var(--border)', borderRadius:8, fontWeight:600,
               fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
  saveBtn:   { padding:'8px 20px', background:ACCENT, color:'#fff', border:'none',
               borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
}
