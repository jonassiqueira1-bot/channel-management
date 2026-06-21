import { useState, useMemo, useRef, useEffect } from 'react'
import { SlidersHorizontal, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { STATUS_PAGAMENTO } from '../data/mockPagamentos'
import { usePayments } from '../hooks/usePayments'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import NotionDrawer, { DrawerBody, MetaSection, MetaRow, InlineText, InlineTextarea, InlineSelect, InlineDate, DeleteZone } from '../components/NotionDrawer'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'
import Button from '../components/Button'
import { FullPageEdit, FPESection, FPEField, FPEGrid, FPESeparator, AsideCard } from '../components/ui'

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

// ─── FiltrosPopover ────────────────────────────────────────────────────────────
function FiltrosPopover({ anchorRef, onClose,
  filtroStatus, setFiltroStatus, filtroProcessado, setFiltroProcessado,
  filtroVencIni, setFiltroVencIni, filtroVencFim, setFiltroVencFim, onClear }) {

  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])

  const SL = { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
               letterSpacing:'0.07em', display:'block', marginBottom:5 }
  const inp = { padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7,
               background:'var(--surface)', color:'var(--text)', fontSize:13,
               fontFamily:'var(--font)', width:'100%', boxSizing:'border-box', outline:'none' }

  return (
    <div ref={ref} style={{
      position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:500,
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,0.14)', padding:20, minWidth:320,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Filtros avançados</span>
        <button onClick={onClear} style={{ background:'none', border:'none', color:'var(--text-muted)',
          fontSize:12, cursor:'pointer', fontFamily:'var(--font)', padding:'2px 6px' }}>
          Limpar tudo
        </button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={SL}>Status</label>
          <select style={inp} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_PAGAMENTO).map(([k,v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={SL}>Processado</label>
          <select style={inp} value={filtroProcessado} onChange={e=>setFiltroProcessado(e.target.value)}>
            <option value="">Todos</option>
            <option value="sim">Gerado</option>
            <option value="nao">Pendente</option>
          </select>
        </div>
        <div>
          <label style={SL}>Vencimento</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <label style={{ fontSize:10, color:'var(--text-muted)', display:'block', marginBottom:3 }}>De</label>
              <input type="date" style={inp} value={filtroVencIni} onChange={e=>setFiltroVencIni(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:10, color:'var(--text-muted)', display:'block', marginBottom:3 }}>Até</label>
              <input type="date" style={inp} value={filtroVencFim} onChange={e=>setFiltroVencFim(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)', textAlign:'right' }}>
        <button onClick={onClose} style={{ padding:'7px 16px', background:ACCENT, color:'#fff',
          border:'none', borderRadius:7, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
          Aplicar
        </button>
      </div>
    </div>
  )
}

// ─── ExportTray ───────────────────────────────────────────────────────────────
function ExportTray({ logs, onClose, onClear }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12,
      boxShadow:'0 12px 40px rgba(0,0,0,0.18)', padding:16, minWidth:300, maxWidth:360 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Histórico de exportações</span>
        <div style={{ display:'flex', gap:6 }}>
          {logs.length>0 && (
            <button onClick={onClear} style={{ background:'none', border:'none', color:'var(--text-muted)',
              fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>Limpar</button>
          )}
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)',
            fontSize:16, cursor:'pointer', padding:'0 4px' }}>✕</button>
        </div>
      </div>
      {logs.length===0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 0' }}>
          <span style={{ fontSize:24 }}>📭</span>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhuma exportação ainda</span>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:280, overflowY:'auto' }}>
          {logs.map(l => (
            <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'8px 10px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{l.fileName}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                  {l.total} registro{l.total!==1?'s':''} · {l.scope} · {l.date}
                </div>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:'#10B981', fontFamily:'var(--mono)',
                background:'#D1FAE5', borderRadius:6, padding:'2px 7px' }}>✓</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border2)',
        fontSize:11, color:'var(--text-muted)', textAlign:'right' }}>
        {logs.length} exportaç{logs.length!==1?'ões':'ão'} · sessão atual
      </div>
    </div>
  )
}

// ─── AcoesMenu ────────────────────────────────────────────────────────────────
function AcoesMenu({ onExport, onImport, onClose, anchorRef, selected, exportLogs, setShowTray }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])

  const menuItem = { display:'flex', alignItems:'center', gap:10, padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left',
    fontSize:13, color:'var(--text)', fontFamily:'var(--font)', borderRadius:7, transition:'background 0.1s' }

  return (
    <div ref={ref} style={{
      position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:500,
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:10, boxShadow:'0 10px 36px rgba(0,0,0,0.14)', padding:'6px', minWidth:220,
    }}>
      <button style={menuItem}
        onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e=>e.currentTarget.style.background='none'}
        onClick={onImport}>
        <span style={{ fontSize:15 }}>⬆</span>Importar dados
      </button>
      <button style={menuItem}
        onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e=>e.currentTarget.style.background='none'}
        onClick={onExport}>
        <span style={{ fontSize:15 }}>⬇</span>
        {selected?.size>0 ? `Exportar selecionados (${selected.size})` : 'Exportar dados'}
      </button>
      {exportLogs?.length>0 && (
        <>
          <div style={{ height:1, background:'var(--border)', margin:'4px 8px' }} />
          <button style={{ ...menuItem, color:'var(--text-muted)', fontSize:12 }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
            onClick={()=>{ setShowTray(true); onClose() }}>
            <span style={{ fontSize:14 }}>📋</span>Ver exportações ({exportLogs.length})
          </button>
        </>
      )}
    </div>
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

// ─── PagamentoModal ───────────────────────────────────────────────────────────
function PagamentoDetail({ pagamento, onSave, onClose }) {
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
  function patch(k, v) { setForm(f => { const n={...f,[k]:v}; onSave({...pagamento,...n,amount_total_net:Math.max(0,(Number(n.amount_cdu)||0)+(Number(n.amount_sms)||0)+(Number(n.amount_services)||0)-(Number(n.amount_discount)||0)),valor_recebido:n.valor_recebido!==''?Number(n.valor_recebido)||0:null,produto_id:n.produto_id?Number(n.produto_id):null,processed:true}); return n }) }
  function numVal(k) {
    return {
      type:'text', inputMode:'numeric',
      value: form[k]!=='' && form[k]!==null ? Number(form[k]).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '',
      placeholder:'0,00',
      onChange: e => { const r=e.target.value.replace(/\./g,'').replace(',','.'); set(k,isNaN(parseFloat(r))?'':parseFloat(r)) },
      onBlur: () => patch(k, form[k]),
    }
  }
  const bruto          = (Number(form.amount_cdu)||0)+(Number(form.amount_sms)||0)+(Number(form.amount_services)||0)
  const liquido        = Math.max(0, bruto-(Number(form.amount_discount)||0))
  const recebido       = form.valor_recebido!=='' ? Number(form.valor_recebido)||0 : null
  const diferenca      = recebido !== null ? recebido - liquido : null

  const inp = { padding:'8px 12px', border:'1px solid var(--border)', borderRadius:7,
                background:'var(--surface2)', color:'var(--text)', fontSize:13,
                fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' }
  const rInp = { ...inp, paddingLeft:28, fontFamily:'var(--mono)', fontWeight:600 }
  const statusOptions = Object.entries(STATUS_PAGAMENTO).map(([k,v]) => ({ value:k, label:v.label }))
  const produtoOptions = [{ value:'', label:'— Selecione —' }, ...MOCK_PRODUTOS.filter(p=>p.status==='ativo').map(p=>({ value:String(p.id), label:`${p.nome} (${p.codigo})` }))]

  const left = (
    <div style={{ padding:'32px 40px', display:'flex', flexDirection:'column', gap:20, flex:1 }}>
      {/* Title */}
      <div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>
          {pagamento.contract_numero}
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, display:'flex', gap:8 }}>
          <span style={{ color:'var(--accent)', fontWeight:600 }}>{pagamento.company_nome}</span>
          <span>·</span>
          <span>{periodoLabel(parsePeriodo(pagamento.reference_month))}</span>
        </div>
      </div>

      {/* Composição de valores */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Composição de valores</div>
        <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            {[
              { k:'amount_cdu',      label:'CDU',      color:'var(--accent)' },
              { k:'amount_sms',      label:'SMS',      color:'#3B82F6' },
              { k:'amount_services', label:'Serviços', color:'#10B981' },
            ].map(({ k, label, color }) => (
              <div key={k}>
                <div style={{ fontSize:10, color, fontFamily:'var(--mono)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                    fontSize:11, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
                  <input {...numVal(k)} style={rInp} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
              textTransform:'uppercase', letterSpacing:'0.06em' }}>Total líquido</span>
            <span style={{ fontSize:24, fontWeight:800, fontFamily:'var(--mono)',
              color: liquido > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
              {fmtMoeda(liquido)}
            </span>
          </div>
        </div>
      </div>

      {/* Baixa */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Baixa / Liquidação</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[
            { k:'due_date', label:'Vencimento', type:'date' },
            { k:'data_baixa', label:'Data de Baixa', type:'date' },
          ].map(({ k, label }) => (
            <div key={k}>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)',
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
              <input type="date" style={inp} value={form[k]}
                onChange={e=>set(k,e.target.value)} onBlur={e=>patch(k,e.target.value)} />
            </div>
          ))}
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)',
              textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Valor recebido (R$)</div>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                fontSize:11, fontWeight:600, color:'var(--text-muted)', pointerEvents:'none', fontFamily:'var(--mono)' }}>R$</span>
              <input {...numVal('valor_recebido')} style={rInp}
                placeholder={liquido>0?Number(liquido).toLocaleString('pt-BR',{minimumFractionDigits:2}):'0,00'} />
            </div>
          </div>
        </div>
        {diferenca !== null && diferenca !== 0 && (
          <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8,
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
      </div>

      {/* Observações */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Observações</div>
        <InlineTextarea value={form.notes || ''} onChange={v => patch('notes', v)}
          placeholder="Observações sobre este faturamento…" minRows={2} />
      </div>
    </div>
  )

  const right = (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      <MetaSection label="Fatura" />
      <MetaRow label="Status">
        <InlineSelect value={form.status} onChange={v => patch('status', v)} options={statusOptions} />
      </MetaRow>
      <MetaRow label="Produto">
        <InlineSelect value={form.produto_id ? String(form.produto_id) : ''} onChange={v => {
          const prod = MOCK_PRODUTOS.find(p => String(p.id) === v)
          const buckets = valorPorTipo(prod, prod?.preco)
          setForm(f => {
            const n = { ...f, produto_id: v, produto_nome: prod?.nome||'', ...buckets }
            onSave({ ...pagamento, ...n,
              amount_total_net: Math.max(0,
                (Number(n.amount_cdu)||0)+(Number(n.amount_sms)||0)+(Number(n.amount_services)||0)-(Number(n.amount_discount)||0)
              ),
              valor_recebido: n.valor_recebido!==''?Number(n.valor_recebido)||0:null,
              produto_id: n.produto_id?Number(n.produto_id):null,
              processed: true,
            })
            return n
          })
        }} options={produtoOptions} />
      </MetaRow>
      <MetaRow label="Nº Documento">
        <InlineText value={form.num_documento} onChange={v => patch('num_documento', v)} placeholder="NF000000" mono />
      </MetaRow>
      <MetaRow label="Emissão">
        <InlineDate value={form.data_emissao} onChange={v => patch('data_emissao', v)} placeholder="Definir data" />
      </MetaRow>
      <MetaRow label="Parcela">
        <InlineText value={form.parcela} onChange={v => patch('parcela', v)} placeholder="1/1" mono />
      </MetaRow>
      <MetaSection label="Contrato" />
      <MetaRow label="Empresa">
        <span style={{ fontSize:12, color:'var(--text)', paddingLeft:6, fontWeight:600 }}>{pagamento.company_nome}</span>
      </MetaRow>
      <MetaRow label="Contrato">
        <span style={{ fontSize:12, color:'var(--text-muted)', paddingLeft:6, fontFamily:'var(--mono)' }}>{pagamento.contract_numero}</span>
      </MetaRow>
      <MetaRow label="Competência">
        <span style={{ fontSize:12, color:'var(--text-muted)', paddingLeft:6, fontFamily:'var(--mono)' }}>
          {periodoLabel(parsePeriodo(pagamento.reference_month))}
        </span>
      </MetaRow>
    </div>
  )

  return <DrawerBody left={left} right={right} />
}

function _PagamentoModalLegacy({ pagamento, onSave, onClose }) {
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

function NovoPagamentoModal({ onClose, onSave, periodo }) {
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
      tenant_id: 't1',
      criado: new Date().toISOString().slice(0, 10),
    })
    onClose()
  }

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
      case 'tipo':        return null
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
export default function Pagamentos() {
  const { pagamentos, setPagamentos } = usePayments()

  // ── estado persistido ─────────────────────────────────────────────────────
  const [search, setSearch]                     = useLocalState('pagamentos:search', '')
  const [filtroStatus, setFiltroStatus]         = useLocalState('pagamentos:filtroStatus', '')
  const [filtroProcessado, setFiltroProcessado] = useLocalState('pagamentos:filtroProcessado', '')
  const [filtroEmpresa, setFiltroEmpresa]       = useLocalState('pagamentos:filtroEmpresa', '')
  const [filtroVencIni, setFiltroVencIni]       = useLocalState('pagamentos:filtroVencIni', '')
  const [filtroVencFim, setFiltroVencFim]       = useLocalState('pagamentos:filtroVencFim', '')
  const [sortBy, setSortBy]                     = useLocalState('pagamentos:sortBy', 'empresa')
  const [showMetrics, setShowMetrics]           = useLocalState('pagamentos:showMetrics', true)

  // ── estado efêmero ────────────────────────────────────────────────────────
  const [detalheModal, setDetalheModal]       = useState(null)
  const [gerarTodosModal, setGerarTodosModal] = useState(false)
  const [novoPagModal, setNovoPagModal]       = useState(false)
  const [novoPagForm, setNovoPagForm]         = useState(null)
  const [savingNovo, setSavingNovo]           = useState(false)
  const [importModal, setImportModal]         = useState(false)
  const [exportLogs, setExportLogs]       = useState([])
  const [showTray, setShowTray]           = useState(false)
  const [filtrosOpen, setFiltrosOpen]     = useState(false)
  const [acoesOpen, setAcoesOpen]         = useState(false)
  const [selected, setSelected]           = useState(new Set())

  const filtrosRef = useRef(null)
  const acoesRef   = useRef(null)

  const periodos = useMemo(() => periodosUnicos(pagamentos), [pagamentos])
  const [periodo, setPeriodo] = useState(() => periodos[0] || { month:6, year:2026 })

  const doPeriodo = useMemo(() => {
    const key = periodoKey(periodo)
    return pagamentos.filter(p => p.reference_month === key)
  }, [pagamentos, periodo])

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return doPeriodo.filter(p => {
      if (filtroStatus    && p.status !== filtroStatus)              return false
      if (filtroEmpresa   && p.company_id !== Number(filtroEmpresa)) return false
      if (filtroProcessado==='sim' && !p.processed)                  return false
      if (filtroProcessado==='nao' && p.processed)                   return false
      if (filtroVencIni   && p.due_date && p.due_date < filtroVencIni) return false
      if (filtroVencFim   && p.due_date && p.due_date > filtroVencFim) return false
      if (q && !p.company_nome.toLowerCase().includes(q) &&
               !p.contract_numero.toLowerCase().includes(q))         return false
      return true
    }).sort((a,b) => {
      if (sortBy==='empresa')    return a.company_nome.localeCompare(b.company_nome,'pt-BR')
      if (sortBy==='valor_desc') return b.amount_total_net - a.amount_total_net
      if (sortBy==='valor_asc')  return a.amount_total_net - b.amount_total_net
      if (sortBy==='vencimento') return (a.due_date||'9999') < (b.due_date||'9999') ? -1 : 1
      if (sortBy==='status')     return a.status.localeCompare(b.status)
      return 0
    })
  }, [doPeriodo, search, filtroStatus, filtroEmpresa, filtroProcessado, filtroVencIni, filtroVencFim, sortBy])

  const kpis = useMemo(() => ({
    total:       doPeriodo.length,
    processados: doPeriodo.filter(p=>p.processed).length,
    pendentes:   doPeriodo.filter(p=>!p.processed).length,
    valorTotal:  doPeriodo.reduce((s,p)=>s+(p.amount_total_net||0),0),
    emAberto:    doPeriodo.filter(p=>p.status==='pendente'||p.status==='vencido')
                          .reduce((s,p)=>s+(p.amount_total_net||0),0),
  }), [doPeriodo])

  const empresasPeriodo = useMemo(() => {
    const ids = new Set(doPeriodo.map(p=>p.company_id).filter(Boolean))
    return MOCK_EMPRESAS.filter(e=>ids.has(e.id))
  }, [doPeriodo])

  const naoProcessados = doPeriodo.filter(p=>!p.processed)

  const advancedFilterCount = [filtroStatus, filtroProcessado, (filtroVencIni||filtroVencFim)?'y':''].filter(Boolean).length
  const hasFilter = search || advancedFilterCount>0 || filtroEmpresa

  function clearAllFilters() {
    setSearch(''); setFiltroStatus(''); setFiltroProcessado(''); setFiltroEmpresa('')
    setFiltroVencIni(''); setFiltroVencFim('')
  }

  // Seleção
  const allFilteredIds = lista.map(p=>p.id)
  const allSelected  = allFilteredIds.length>0 && allFilteredIds.every(id=>selected.has(id))
  const someSelected = allFilteredIds.some(id=>selected.has(id)) && !allSelected

  function toggleAll() {
    if (allSelected) setSelected(prev=>{ const s=new Set(prev); allFilteredIds.forEach(id=>s.delete(id)); return s })
    else setSelected(prev=>new Set([...prev,...allFilteredIds]))
  }
  function toggleOne(id) { setSelected(prev=>{ const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s }) }
  function clearSelection() { setSelected(new Set()) }

  // Ações em lote
  function applyBulk(action) {
    const ids = [...selected]
    if (action==='delete') {
      if (!window.confirm(`Excluir ${ids.length} pagamento(s) permanentemente?`)) return
      setPagamentos(prev=>prev.filter(p=>!ids.includes(p.id))); clearSelection()
    } else if (action==='gerar') {
      setPagamentos(prev=>prev.map(p=>ids.includes(p.id)?{...p,processed:true}:p)); clearSelection()
    } else if (action==='pago') {
      setPagamentos(prev=>prev.map(p=>ids.includes(p.id)?{...p,status:'pago'}:p)); clearSelection()
    }
  }

  // Export
  function handleExport() {
    const scope = selected.size>0 ? 'selecionados' : hasFilter ? 'filtrados' : 'todos'
    const rows  = selected.size>0 ? lista.filter(p=>selected.has(p.id)) : lista
    const headers = ['contract_numero','company_nome','num_documento','data_emissao','parcela',
                     'amount_cdu','amount_sms','amount_services','amount_discount','amount_total_net',
                     'valor_recebido','reference_month','due_date','data_baixa','status','processed']
    const fileName = `pagamentos_${periodoKey(periodo).slice(0,7)}_${new Date().toISOString().slice(0,10)}.csv`
    const csv = [headers.join(';'), ...rows.map(p=>headers.map(h=>p[h]??'').join(';'))].join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href=url; a.download=fileName; a.click(); URL.revokeObjectURL(url)
    setExportLogs(prev=>[{ id:Date.now(), fileName, date:new Date().toLocaleString('pt-BR'),
      total:rows.length, scope, status:'concluido' },...prev])
    setShowTray(true)
  }

  function handleSave(pag) {
    setPagamentos(prev=>prev.map(p=>p.id===pag.id?pag:p))
  }

  function handleNovoPagamento(pag) {
    setPagamentos(prev=>[pag, ...prev])
    // navega para o período do novo pagamento
    const ref = parsePeriodo(pag.reference_month)
    setPeriodo(ref)
  }

  function handleImport(rows, log) {
    setPagamentos(prev=>[...prev,...rows])
    setExportLogs(prev=>[{ ...log, scope:'importados' },...prev])
    setShowTray(true)
  }

  function gerarTodos() {
    const key = periodoKey(periodo)
    setPagamentos(prev=>prev.map(p=>p.reference_month===key&&!p.processed?{...p,processed:true}:p))
  }

  if (novoPagForm) {
    const form = novoPagForm
    const set = (k, v) => setNovoPagForm(f => ({ ...f, [k]: v }))
    const cdu      = parseFloat(form.amount_cdu)      || 0
    const sms      = parseFloat(form.amount_sms)      || 0
    const services = parseFloat(form.amount_services) || 0
    const discount = parseFloat(form.amount_discount) || 0
    const liquido  = Math.max(0, cdu + sms + services - discount)

    async function handleSaveNovo() {
      if (!form.contract_numero.trim()) return alert('Número do contrato é obrigatório')
      if (!form.company_nome.trim())    return alert('Empresa é obrigatória')
      setSavingNovo(true)
      try {
        handleNovoPagamento({
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
          tenant_id: 't1',
          criado: new Date().toISOString().slice(0, 10),
        })
        setNovoPagForm(null)
      } finally { setSavingNovo(false) }
    }

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Faturamento', onClick: () => setNovoPagForm(null) }, { label: 'Novo Pagamento' }]}
        title="Novo Pagamento"
        subtitle="Lançamento manual de cobrança"
        onSave={handleSaveNovo}
        onCancel={() => setNovoPagForm(null)}
        saving={savingNovo}
        saveLabel="+ Adicionar pagamento"
        aside={
          <AsideCard title="Total líquido">
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ fontSize:28, fontWeight:800, fontFamily:'var(--mono)', color: liquido > 0 ? '#18181B' : '#A1A1AA' }}>
                {fmtMoeda(liquido)}
              </div>
              <div style={{ fontSize:11, color:'#71717A', marginTop:4 }}>CDU + SMS + Serviços - Desconto</div>
            </div>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'CDU',      val:cdu,      color:'var(--accent)' },
                { label:'SMS',      val:sms,      color:'#3B82F6' },
                { label:'Serviços', val:services, color:'#10B981' },
                { label:'Desconto', val:discount, color:'#EF4444' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #F4F4F5' }}>
                  <span style={{ fontSize:12, color:'#71717A' }}>{label}</span>
                  <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color: val > 0 ? color : '#A1A1AA' }}>{val > 0 ? fmtMoeda(val) : '—'}</span>
                </div>
              ))}
            </div>
          </AsideCard>
        }
      >
        <FPESection label="Identificação" noBorder columns={2}>
          <FPEField label="Nº do contrato" required>
            <input className="fpe-field" value={form.contract_numero} placeholder="CTR-2024-001" onChange={e => set('contract_numero', e.target.value)} />
          </FPEField>
          <FPEField label="Empresa" required>
            <input className="fpe-field" value={form.company_nome} placeholder="Nome da empresa" onChange={e => set('company_nome', e.target.value)} />
          </FPEField>
          <FPEField label="Status">
            <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS_PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Competência">
            <input type="month" className="fpe-field" value={form.reference_month.slice(0, 7)} onChange={e => set('reference_month', e.target.value + '-01')} />
          </FPEField>
          <FPEField label="Vencimento">
            <input type="date" className="fpe-field" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </FPEField>
          <FPEField label="Observações">
            <input className="fpe-field" value={form.notes || ''} placeholder="Observações opcionais…" onChange={e => set('notes', e.target.value)} />
          </FPEField>
        </FPESection>
        <FPESection label="Composição de valores" columns={2}>
          {[
            { k:'amount_cdu',      label:'CDU',      color:'var(--accent)' },
            { k:'amount_sms',      label:'SMS',      color:'#3B82F6' },
            { k:'amount_services', label:'Serviços', color:'#10B981' },
            { k:'amount_discount', label:'Desconto', color:'#EF4444' },
          ].map(({ k, label, color }) => (
            <FPEField key={k} label={label}>
              <input type="number" min="0" step="0.01" className="fpe-field" value={form[k]} placeholder="0,00" onChange={e => set(k, e.target.value)} />
            </FPEField>
          ))}
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <div style={pg.wrap}>

      {/* ── Page header ── */}
      <div style={pg.pageHeader}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>
              <span>Faturamento</span>
              <span style={{ margin:'0 5px', opacity:0.4 }}>›</span>
              <span>Pagamentos</span>
            </div>
            <h1 style={pg.title}>Faturamento de Contratos</h1>
          </div>
          <button onClick={()=>setShowMetrics(v=>!v)}
            title={showMetrics?'Ocultar métricas':'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
              borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
              color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="secondary" onClick={() => setNovoPagForm({ ...EMPTY_PAG, reference_month: periodoKey(periodo), due_date: periodoKey(periodo) })}>+ Novo Pagamento</Button>
          <Button onClick={()=>setGerarTodosModal(true)}>
            + Gerar Todos
            {naoProcessados.length>0 && (
              <span style={{ marginLeft:6, background:'rgba(255,255,255,0.25)', borderRadius:10,
                padding:'1px 7px', fontSize:10, fontWeight:800, fontFamily:'var(--mono)' }}>
                {naoProcessados.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── KPIs retráteis ── */}
      <div style={{ display:'grid', gridTemplateRows:showMetrics?'1fr':'0fr',
        transition:'grid-template-rows 0.25s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0 }}>
          <div style={pg.kpiRow}>
            {[
              { label:'Contratos',    value:kpis.total,       color:'var(--text)' },
              { label:'Gerados',      value:kpis.processados,  color:'#10B981'     },
              { label:'Não gerados',  value:kpis.pendentes,   color:'#F59E0B'     },
              { label:'Total líquido',value:fmtMoeda(kpis.valorTotal), color:ACCENT, mono:true },
              { label:'Em aberto',    value:fmtMoeda(kpis.emAberto), color:'#EF4444', mono:true },
            ].map(k => (
              <div key={k.label} style={{ ...pg.kpiCard, borderTop:`2px solid ${k.color}` }}>
                <span style={{ fontSize:k.mono?16:24, fontWeight:800, color:k.color,
                  fontFamily:k.mono?'var(--mono)':'var(--font)', letterSpacing:k.mono?'-0.02em':'-0.03em' }}>
                  {k.value}
                </span>
                <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{k.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={pg.toolbar}>
        {/* Esquerda */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:'1 1 200px', maxWidth:320 }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
              fontSize:14, color:'var(--text-muted)', pointerEvents:'none' }}>⌕</span>
            <input style={{ ...pg.searchInput, paddingLeft:32 }}
              placeholder="Buscar contrato ou empresa…"
              value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select style={pg.select} value={filtroEmpresa} onChange={e=>setFiltroEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresasPeriodo.map(e=>(
              <option key={e.id} value={e.id}>{e.fantasia||e.razao}</option>
            ))}
          </select>
          <PeriodoPicker value={periodo} onChange={p=>{setPeriodo(p);clearSelection()}} periodos={periodos}/>
        </div>

        {/* Separador */}
        <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', margin:'0 4px', flexShrink:0 }} />

        {/* Direita */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Filtros avançados */}
          <div ref={filtrosRef} style={{ position:'relative' }}>
            <button onClick={()=>setFiltrosOpen(v=>!v)} style={{
              display:'flex', alignItems:'center', gap:7, padding:'0 13px', height:36, borderRadius:8,
              border:`1.5px solid ${advancedFilterCount>0?ACCENT:'var(--border)'}`,
              background:advancedFilterCount>0?`${ACCENT}15`:'var(--surface)',
              color:advancedFilterCount>0?ACCENT:'var(--text-soft)',
              fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s',
            }}>
              <SlidersHorizontal size={14}/>
              Filtros
              {advancedFilterCount>0 && (
                <span style={{ background:ACCENT, color:'#fff', borderRadius:10,
                  fontSize:10, fontWeight:700, padding:'1px 6px', lineHeight:'16px' }}>
                  {advancedFilterCount}
                </span>
              )}
            </button>
            {filtrosOpen && (
              <FiltrosPopover
                anchorRef={filtrosRef} onClose={()=>setFiltrosOpen(false)}
                filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
                filtroProcessado={filtroProcessado} setFiltroProcessado={setFiltroProcessado}
                filtroVencIni={filtroVencIni} setFiltroVencIni={setFiltroVencIni}
                filtroVencFim={filtroVencFim} setFiltroVencFim={setFiltroVencFim}
                onClear={clearAllFilters}
              />
            )}
          </div>

          {/* Ordenação */}
          <select style={{ ...pg.select, color:'var(--text-muted)' }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="empresa">Empresa A–Z</option>
            <option value="valor_desc">Maior valor</option>
            <option value="valor_asc">Menor valor</option>
            <option value="vencimento">Vencimento próximo</option>
            <option value="status">Status</option>
          </select>

          {/* ⋯ Ações */}
          <div ref={acoesRef} style={{ position:'relative' }}>
            <button onClick={()=>setAcoesOpen(v=>!v)}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36,
                borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)',
                color:'var(--text-soft)', cursor:'pointer', transition:'all 0.15s' }}>
              <MoreHorizontal size={16}/>
            </button>
            {acoesOpen && (
              <AcoesMenu
                onExport={()=>{ handleExport(); setAcoesOpen(false) }}
                onImport={()=>{ setImportModal(true); setAcoesOpen(false) }}
                onClose={()=>setAcoesOpen(false)}
                anchorRef={acoesRef} selected={selected}
                exportLogs={exportLogs} setShowTray={setShowTray}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Result row ── */}
      <div style={pg.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {lista.length} pagamento{lista.length!==1?'s':''} encontrado{lista.length!==1?'s':''}
        </span>
        {hasFilter && (
          <button style={pg.clearBtn} onClick={clearAllFilters}>Limpar filtros</button>
        )}
      </div>

      {/* ── ExportTray flutuante ── */}
      {showTray && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:800 }}>
          <ExportTray logs={exportLogs} onClose={()=>setShowTray(false)} onClear={()=>setExportLogs([])}/>
        </div>
      )}

      {/* ── Bulk bar ── */}
      {selected.size>0 && (
        <div style={pg.bulkBar}>
          <span style={pg.bulkCount}>
            <span style={pg.bulkDot}/>
            {selected.size} selecionado{selected.size>1?'s':''}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Ações:</span>
            <button style={pg.bulkBtn} onClick={()=>applyBulk('gerar')}>✓ Gerar faturas</button>
            <button style={pg.bulkBtn} onClick={()=>applyBulk('pago')}>Marcar como pago</button>
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }}/>
            <button style={{ ...pg.bulkBtn, color:'#FCA5A5', borderColor:'rgba(252,165,165,0.3)' }}
              onClick={()=>applyBulk('delete')}>Excluir</button>
          </div>
          <button style={pg.bulkClear} onClick={clearSelection}>✕ Limpar seleção</button>
        </div>
      )}

      {/* ── Tabela ── */}
      <div style={pg.tableWrap}>
        <table style={pg.table}>
          <thead>
            <tr>
              <th style={{ ...pg.th, width:36, textAlign:'center' }}>
                <input type="checkbox" checked={allSelected}
                  ref={el=>{ if(el) el.indeterminate=someSelected }}
                  onChange={toggleAll} style={{ cursor:'pointer' }}/>
              </th>
              {[
                { h:'Contrato / Empresa', align:'left'  },
                { h:'Num. Documento',    align:'left'  },
                { h:'CDU',               align:'right' },
                { h:'SMS',               align:'right' },
                { h:'Serviços',          align:'right' },
                { h:'Desconto',          align:'right' },
                { h:'Total Líquido',     align:'right' },
                { h:'Vl. Recebido',      align:'right' },
                { h:'Vencimento',        align:'left'  },
                { h:'Baixa',             align:'left'  },
                { h:'Processado',        align:'left'  },
                { h:'Status',            align:'left'  },
                { h:'',                  align:'right' },
              ].map((c,i) => (
                <th key={i} style={{ ...pg.th, textAlign:c.align }}>{c.h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length===0 && (
              <tr>
                <td colSpan={14} style={{ padding:'40px 16px', textAlign:'center',
                  color:'var(--text-muted)', fontSize:13 }}>
                  Nenhum faturamento encontrado para este período.
                </td>
              </tr>
            )}
            {lista.map(p => {
              const hoje  = new Date().toISOString().slice(0,10)
              const atras = p.status!=='pago' && p.due_date && p.due_date<hoje
              const urge  = !atras && p.due_date && new Date(p.due_date)-new Date(hoje)<=7*86400000
              const isSel = selected.has(p.id)

              return (
                <tr key={p.id} style={{ ...pg.tr, background:isSel?`${ACCENT}08`:'transparent' }}
                  onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background='var(--surface2)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=isSel?`${ACCENT}08`:'transparent' }}>

                  <td style={{ ...pg.td, textAlign:'center', width:36 }}>
                    <input type="checkbox" checked={isSel} onChange={()=>toggleOne(p.id)} style={{ cursor:'pointer' }}/>
                  </td>

                  {/* Contrato / Empresa */}
                  <td style={pg.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`${ACCENT}18`,
                        color:ACCENT, display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:10, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
                        border:`1px solid ${ACCENT}30` }}>
                        {p.company_nome.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <button onClick={()=>setDetalheModal(p)}
                          style={{ background:'none', border:'none', padding:0, cursor:'pointer',
                            fontWeight:700, fontSize:13, color:'var(--text)', fontFamily:'var(--font)',
                            textDecoration:'underline', textDecorationColor:'transparent', transition:'text-decoration-color 0.15s' }}
                          onMouseEnter={e=>e.currentTarget.style.textDecorationColor='var(--text)'}
                          onMouseLeave={e=>e.currentTarget.style.textDecorationColor='transparent'}>
                          {p.company_nome}
                        </button>
                        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                          {p.contract_numero}{p.parcela && p.parcela!=='1/1' ? ` · ${p.parcela}` : ''}
                        </div>
                        {p.produto_nome && (
                          <span style={{ fontSize:9, fontWeight:700, color:ACCENT, background:`${ACCENT}10`,
                            border:`1px solid ${ACCENT}25`, borderRadius:4, padding:'1px 5px',
                            fontFamily:'var(--mono)', display:'inline-block', marginTop:2, lineHeight:'14px' }}>
                            {p.produto_nome}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Num. Documento */}
                  <td style={pg.td}>
                    {p.num_documento
                      ? <span style={{ fontSize:11, fontFamily:'var(--mono)', fontWeight:600,
                          color:'var(--text-soft)', background:'var(--surface2)',
                          border:'1px solid var(--border)', borderRadius:5, padding:'2px 7px',
                          whiteSpace:'nowrap' }}>{p.num_documento}</span>
                      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                    {p.data_emissao && (
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>
                        emissão {fmtData(p.data_emissao)}
                      </div>
                    )}
                  </td>

                  <td style={{ ...pg.td, textAlign:'right' }}>
                    {p.amount_cdu>0
                      ? <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color:'var(--accent)' }}>{fmtMoeda(p.amount_cdu)}</span>
                      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                  </td>
                  <td style={{ ...pg.td, textAlign:'right' }}>
                    {p.amount_sms>0
                      ? <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color:'#3B82F6' }}>{fmtMoeda(p.amount_sms)}</span>
                      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                  </td>
                  <td style={{ ...pg.td, textAlign:'right' }}>
                    {p.amount_services>0
                      ? <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color:'#10B981' }}>{fmtMoeda(p.amount_services)}</span>
                      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                  </td>
                  <td style={{ ...pg.td, textAlign:'right' }}>
                    {p.amount_discount>0
                      ? <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color:'#EF4444' }}>↓ {fmtMoeda(p.amount_discount)}</span>
                      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                  </td>

                  <td style={{ ...pg.td, textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:800, fontFamily:'var(--mono)',
                      letterSpacing:'-0.02em', color:'var(--text)' }}>
                      {fmtMoeda(p.amount_total_net)}
                    </div>
                  </td>

                  {/* Vl. Recebido */}
                  <td style={{ ...pg.td, textAlign:'right' }}>
                    {p.valor_recebido != null ? (
                      <div>
                        <span style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:700,
                          color: p.valor_recebido > p.amount_total_net ? '#10B981'
                               : p.valor_recebido < p.amount_total_net ? '#EF4444'
                               : 'var(--text-soft)' }}>
                          {fmtMoeda(p.valor_recebido)}
                        </span>
                        {p.valor_recebido !== p.amount_total_net && (
                          <div style={{ fontSize:9, fontFamily:'var(--mono)', marginTop:1,
                            color: p.valor_recebido > p.amount_total_net ? '#10B981' : '#EF4444' }}>
                            {p.valor_recebido > p.amount_total_net ? '+' : ''}
                            {fmtMoeda(p.valor_recebido - p.amount_total_net)}
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>}
                  </td>

                  {/* Vencimento */}
                  <td style={{ ...pg.td, fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap',
                    color:atras?'#EF4444':urge?'#D97706':'var(--text-soft)' }}>
                    {atras?'⚠ ':urge?'⏰ ':''}{fmtData(p.due_date)}
                  </td>

                  {/* Data de Baixa */}
                  <td style={{ ...pg.td, fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap',
                    color: p.data_baixa ? '#10B981' : 'var(--border2)' }}>
                    {p.data_baixa ? fmtData(p.data_baixa) : '—'}
                  </td>

                  <td style={pg.td}><ProcessadoBadge processed={p.processed}/></td>
                  <td style={pg.td}><StatusBadge status={p.status}/></td>

                  <td style={{ ...pg.td, textAlign:'right' }}>
                    <button onClick={()=>setDetalheModal(p)}
                      title={p.processed?'Editar':'Gerar fatura'}
                      style={{ background:'none', border:'1px solid var(--border)', borderRadius:6,
                        padding:'4px 8px', cursor:'pointer', fontSize:12, color:'var(--text-soft)',
                        fontFamily:'var(--font)', transition:'all 0.1s' }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=ACCENT; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor=ACCENT }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='var(--text-soft)'; e.currentTarget.style.borderColor='var(--border)' }}>
                      {p.processed?'✏':'↗'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {lista.length>0 && (
            <tfoot>
              <tr style={{ background:'var(--surface2)', borderTop:'2px solid var(--border)' }}>
                <td colSpan={2} style={{ ...pg.td, fontWeight:700, color:'var(--text-muted)',
                  fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Totais ({lista.length})
                </td>
                {/* Num. Documento — vazio no rodapé */}
                <td/>
                <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'var(--accent)' }}>
                  {fmtMoeda(lista.reduce((s,p)=>s+p.amount_cdu,0))}
                </td>
                <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'#3B82F6' }}>
                  {fmtMoeda(lista.reduce((s,p)=>s+p.amount_sms,0))}
                </td>
                <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'#10B981' }}>
                  {fmtMoeda(lista.reduce((s,p)=>s+p.amount_services,0))}
                </td>
                <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color:'#EF4444' }}>
                  {lista.some(p=>p.amount_discount>0)?fmtMoeda(lista.reduce((s,p)=>s+p.amount_discount,0)):'—'}
                </td>
                <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontWeight:800, fontSize:14, color:'var(--text)' }}>
                  {fmtMoeda(lista.reduce((s,p)=>s+p.amount_total_net,0))}
                </td>
                {/* Vl. Recebido total */}
                <td style={{ ...pg.td, textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, fontSize:12,
                  color: lista.some(p=>p.valor_recebido!=null) ? '#10B981' : 'var(--border2)' }}>
                  {lista.some(p=>p.valor_recebido!=null)
                    ? fmtMoeda(lista.reduce((s,p)=>s+(p.valor_recebido!=null?p.valor_recebido:0),0))
                    : '—'}
                </td>
                <td colSpan={5}/>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Notion Drawer ── */}
      <NotionDrawer
        open={!!detalheModal}
        onClose={() => setDetalheModal(null)}
        breadcrumb="Faturamento · Pagamentos"
        title={detalheModal ? `${detalheModal.contract_numero} — ${detalheModal.company_nome}` : ''}>
        {detalheModal && (
          <PagamentoDetail pagamento={detalheModal} onSave={handleSave} onClose={() => setDetalheModal(null)} />
        )}
      </NotionDrawer>
      {gerarTodosModal && (
        <GerarTodosModal periodo={periodo} pendentes={naoProcessados}
          onConfirm={gerarTodos} onClose={()=>setGerarTodosModal(false)}/>
      )}
      {importModal && (
        <ImportModal onClose={()=>setImportModal(false)} onImport={handleImport}/>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const pg = {
  wrap:       { padding:'28px 32px', display:'flex', flexDirection:'column', gap:16 },
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 },
  title:      { margin:0, fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.03em' },
  primaryBtn: { display:'flex', alignItems:'center', padding:'9px 20px', background:'var(--accent)', color:'#fff',
                border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer',
                fontFamily:'var(--font)', whiteSpace:'nowrap', letterSpacing:'-0.01em' },
  kpiRow:     { display:'flex', gap:12, flexWrap:'wrap', paddingBottom:4 },
  kpiCard:    { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
                padding:'14px 20px', display:'flex', flexDirection:'column', gap:2, minWidth:120 },
  toolbar:    { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
  searchInput:{ padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, height:36,
                background:'var(--surface2)', color:'var(--text)', fontSize:13,
                fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
  select:     { padding:'0 12px', border:'1px solid var(--border)', borderRadius:8, height:36,
                background:'var(--surface2)', color:'var(--text)', fontSize:13,
                fontFamily:'var(--font)', outline:'none', cursor:'pointer', flexShrink:0 },
  resultRow:  { display:'flex', alignItems:'center', gap:10 },
  clearBtn:   { padding:'4px 10px', background:'none', border:'1px solid var(--border)', borderRadius:6,
                color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  tableWrap:  { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'auto' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'10px 14px', fontSize:10, fontWeight:700, color:'var(--text-muted)',
                textTransform:'uppercase', letterSpacing:'0.08em',
                background:'var(--surface2)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' },
  tr:         { borderBottom:'1px solid var(--border2)', transition:'background 0.1s' },
  td:         { padding:'10px 14px', fontSize:13, verticalAlign:'middle' },
  bulkBar:    { display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                background:'#1E293B', borderRadius:10, flexWrap:'wrap',
                boxShadow:'0 4px 24px rgba(0,0,0,0.2)' },
  bulkCount:  { display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700,
                color:'#fff', whiteSpace:'nowrap' },
  bulkDot:    { width:8, height:8, borderRadius:'50%', background:ACCENT, flexShrink:0 },
  bulkBtn:    { padding:'5px 12px', background:'none', border:'1px solid rgba(255,255,255,0.2)',
                borderRadius:6, color:'rgba(255,255,255,0.9)', fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  bulkClear:  { marginLeft:'auto', padding:'5px 10px', background:'none', border:'none',
                color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' },
}

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
