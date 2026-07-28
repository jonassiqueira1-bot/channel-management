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
import { useOppMembros } from '../hooks/useOppMembros'
import { useUsuarios } from '../hooks/useUsuarios'
import ActionFeedback from '../components/ActionFeedback'
import BatchProgress from '../components/BatchProgress'
import { useAuth } from '../contexts/AuthContext'
import { useCompanies } from '../hooks/useCompanies'
import TabProvisoes from './TabProvisoes'
import TabFaturas from './TabFaturas'
import { useProvisoes } from '../hooks/useProvisoes'
import { useFaturas } from '../hooks/useFaturas'
import { useImportJobs, startImportJob, updateImportJob, finishImportJob } from '../hooks/useImportJobs'

const TABS_PAG = [
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'provisoes',  label: 'Provisões'  },
  { id: 'faturas',    label: 'Faturas'    },
]

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

// ─── Inconsistência ───────────────────────────────────────────────────────────
const INCONSISTENCIA_OPTS = [
  { value: 'sem_inconsistencia', label: 'Sem inconsistência',        color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  { value: 'pendente',           label: 'Inconsistência pendente',   color: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
  { value: 'em_analise',         label: 'Inconsistência em análise', color: '#3B82F6', bg: '#DBEAFE', text: '#1E40AF' },
  { value: 'fechada',            label: 'Inconsistência fechada',    color: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
]

// ─── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_PAGAMENTO[status] || STATUS_PAGAMENTO.pendente
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:cfg.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}
function ProcessadoBadge({ processed }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:processed?'#065F46':'#64748B' }}>
      {processed ? '✓ Gerado' : '— Pendente'}
    </span>
  )
}


// ─── ImportModal ──────────────────────────────────────────────────────────────
const IMPORT_BASE_KEYS = new Set([
  'contract_numero','company_nome','company_cnpj','produto_nome','num_documento','data_emissao','parcela',
  'amount_cdu','amount_sms','amount_services','amount_discount',
  'reference_month','due_date','status','notes',
])

function parseCSVPag(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
  if (lines.length < 2) return { headers:[], rows:[] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g,''))
  const rows = lines.slice(1).map(line => {
    const cells = []; let cur='', inQ=false
    for (const ch of line) {
      if (ch==='"') { inQ=!inQ }
      else if (ch===sep && !inQ) { cells.push(cur.trim()); cur='' }
      else cur+=ch
    }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h,i) => [h, cells[i]??'']))
  })
  return { headers, rows }
}

// `produtoMap` resolve por código ou nome exato — mesmo critério dos
// importadores de Contratos e Provisões. Pagamento sem produto quebraria a
// cadeia Oportunidade/Contrato/Provisão/Pagamento, então é obrigatório.
function validateImportRowPag(row, cfFields=[], produtoMap) {
  const errors = []
  if (!row.contract_numero?.trim()) errors.push('contract_numero obrigatório')
  if (!row.company_nome?.trim())    errors.push('company_nome obrigatório')
  if (!row.produto_nome?.trim())    errors.push('produto_nome obrigatório — pagamento sem produto não é permitido')
  else if (!produtoMap.get(row.produto_nome.trim().toLowerCase()))
    errors.push(`Produto não encontrado: "${row.produto_nome}"`)
  if (!row.reference_month || !/^\d{4}-\d{2}-\d{2}$/.test(row.reference_month))
    errors.push('reference_month inválido (AAAA-MM-DD)')
  if (row.status && !STATUS_PAGAMENTO[row.status])
    errors.push(`status inválido: ${row.status}`)
  cfFields.filter(f=>f.required).forEach(f => {
    if (!row[f.key]?.trim()) errors.push(`${f.label} obrigatório`)
  })
  return errors
}

function dupKeyPag(row) {
  const periodo = (row.reference_month || '').slice(0, 7)
  const doc     = (row.num_documento || '').trim().toLowerCase()
  const fallback = (row.company_nome || '').trim().toLowerCase()
  return `${(row.contract_numero||'').toLowerCase()}|${periodo}|${doc || fallback}`
}

function ImportModal({ onClose, onImport, companies, addCompany, updateCompany, contratos, saveContrato, pagamentos, provisoes, saveProvisao, produtos }) {
  const { fieldById } = useFormLayout('payments')
  const customFormFields = useMemo(() => (
    Object.values(fieldById||{})
      .filter(f => f.entity === 'payments' && !IMPORT_BASE_KEYS.has(f.field_key))
      .map(f => ({ key: f.field_key, label: f.label, required: f.is_required||false }))
  ), [fieldById])

  const produtoMap = useMemo(() => {
    const m = new Map()
    ;(produtos||[]).forEach(p => {
      if (p.codigo) m.set(String(p.codigo).toLowerCase(), p)
      if (p.nome) m.set(String(p.nome).toLowerCase(), p)
    })
    return m
  }, [produtos])

  const allCols = useMemo(() => [
    ...Array.from(IMPORT_BASE_KEYS),
    ...customFormFields.map(f=>f.key),
  ], [customFormFields])

  // Índice de duplicatas existentes no banco
  const existingKeys = useMemo(() => {
    const s = new Set()
    ;(pagamentos||[]).forEach(p => {
      const periodo = (p.reference_month||'').slice(0,7)
      const doc     = (p.num_documento||'').trim().toLowerCase()
      const fallback = (p.company_nome||'').trim().toLowerCase()
      s.add(`${(p.contract_numero||'').toLowerCase()}|${periodo}|${doc || fallback}`)
    })
    return s
  }, [pagamentos])

  const [step, setStep]           = useState('upload')  // upload|preview|importing|reconciliation|done
  const [parsed, setParsed]       = useState(null)
  const [dragging, setDragging]   = useState(false)
  const [jobId, setJobId] = useState(null)
  const [empresasCriadas, setEmpresasCriadas] = useState(0)
  const [contratosCriados, setContratosCriados] = useState(0)
  const [empresasPromovidas, setEmpresasPromovidas] = useState(0)
  const jobs = useImportJobs()
  const job = jobs.find(j => j.id === jobId)
  const [reconcData, setReconcData] = useState(null)    // { matched, unmatched, months }
  const [reconciling, setReconciling] = useState(false)
  const fileRef = useRef(null)

  function handleDownloadTemplate() {
    const cfEx = customFormFields.map(() => '')
    const example = ['CTR-2026-001','Nexus Tech','12.345.678/0001-99','Produto SaaS','NF100200','2026-07-01','1/1','890','47','450','0','2026-07-01','2026-07-31','pendente','', ...cfEx]
    const csv = ['﻿'+allCols.join(';'), example.slice(0,allCols.length).join(';')].join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='template_pagamentos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows } = parseCSVPag(e.target.result)
      const seenInFile = new Set()
      const rowResults = rows.map((row, i) => {
        const errors    = validateImportRowPag(row, customFormFields, produtoMap)
        const key       = dupKeyPag(row)
        const dupInFile = seenInFile.has(key)
        const dupInDB   = existingKeys.has(key)
        if (!dupInFile) seenInFile.add(key)
        const isDup = dupInFile || dupInDB
        return { row, errors, ok: errors.length===0 && !isDup, line:i+2, isDup, dupInFile, dupInDB }
      })
      setParsed({ fileName:file.name, rowResults })
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleConfirmImport() {
    const okRows = parsed.rowResults.filter(r=>r.ok)
    const total  = okRows.length
    const id = startImportJob({ label: 'Pagamentos', total })
    updateImportJob(id, { subLabel: 'Preparando…' })
    setJobId(id)
    setStep('importing')

    const compByName = {}; const compByCnpj = {}
    ;(companies||[]).forEach(c => {
      const n=(c.fantasia||c.razao||'').toLowerCase(); if(n) compByName[n]=c
      if(c.cnpj) compByCnpj[c.cnpj.replace(/\D/g,'')]=c
    })
    const ctrByNum = {}
    ;(contratos||[]).forEach(c => { if(c.numero) ctrByNum[c.numero.toLowerCase()]=c })
    const createdComp = {}; const createdCtr = {}
    let empresasCriadasCount=0, contratosCriadosCount=0

    async function resolveEmpresa(nome, cnpj) {
      const key = nome.toLowerCase()
      const cnpjClean = (cnpj||'').replace(/\D/g,'')
      if(cnpjClean && compByCnpj[cnpjClean]) return compByCnpj[cnpjClean].id
      if(compByName[key]) return compByName[key].id
      if(createdComp[key]) return createdComp[key]
      const result = await addCompany({ razao:nome, fantasia:nome, cnpj:cnpj||'', tipo:'rascunho' })
      if(result?.ok && result?.data?.id) {
        createdComp[key]=result.data.id; empresasCriadasCount++; return result.data.id
      }
      return null
    }

    // Slot do produto — mesmo mapeamento de Contratos.js/TabProvisoes.js:
    // saas → mrr; licença/hardware → adesão; serviço/consultoria → serviço.
    function slotDoProduto(produto) {
      const t = (produto?.tipo || '').toLowerCase()
      if (t === 'saas') return 'mrr'
      if (t === 'servico' || t === 'consultoria') return 'servico'
      return 'adesao'
    }

    function buildItemDoPagamento(row) {
      const produto = produtoMap.get((row.produto_nome||'').trim().toLowerCase())
      const valor = (parseFloat(row.amount_cdu)||0) + (parseFloat(row.amount_sms)||0) + (parseFloat(row.amount_services)||0)
      const item = {
        produto_id: produto?.id || null, nome: produto?.nome || row.produto_nome,
        tipo_produto: produto?.tipo || null, quantidade: 1,
        valor: valor || produto?.preco || 0, tabela: produto?.preco || null,
        desconto_pct: 0, desconto_autorizado: false, status_item: 'ativo',
        vencimento_primeiro_pagamento: '',
      }
      return { item, slot: slotDoProduto(produto), produto }
    }

    // Contrato criado automaticamente pela importação de Pagamentos nunca
    // pode ficar sem produto — mesma regra de Contratos/Provisões. Usa o
    // produto/valor da própria linha de pagamento como item do contrato.
    async function resolveContrato(numero, companyId, companyNome, row) {
      const key = numero.toLowerCase()
      if(ctrByNum[key]) return ctrByNum[key].id
      if(createdCtr[key]) return createdCtr[key]
      const { item, slot } = buildItemDoPagamento(row)
      const itensPorSlot = { adesao: [], mrr: [], servico: [] }
      itensPorSlot[slot] = [item]
      const result = await saveContrato({
        id: 'imp_ctr_'+Date.now()+'_'+Math.random().toString(36).slice(2),
        // saveContrato (useContracts) espera empresa_id/empresa_nome — não
        // company_id/company_nome. Com os nomes errados, o contrato salvava
        // sempre com o vínculo de empresa vazio (bug pré-existente, achado
        // ao mexer aqui pra adicionar o produto obrigatório).
        numero, empresa_id:companyId, empresa_nome:companyNome,
        status:'ativo', tipo:'', criado:new Date().toISOString().slice(0,10),
        itens:[item], itens_adesao:itensPorSlot.adesao, itens_mrr:itensPorSlot.mrr, itens_servico:itensPorSlot.servico,
      })
      if(result?.ok) {
        const id = result?.data?.id || key
        createdCtr[key]=id; contratosCriadosCount++; return id
      }
      return null
    }

    const hoje = new Date().toISOString().slice(0, 10)
    const importRows = []
    const empresasTocadas = new Set()
    for (let i=0; i<okRows.length; i++) {
      const { row } = okRows[i]
      updateImportJob(id, { current:i+1, subLabel:`${row.company_nome} — ${row.contract_numero}` })
      setEmpresasCriadas(empresasCriadasCount)
      setContratosCriados(contratosCriadosCount)
      const empresa_id     = await resolveEmpresa(row.company_nome, row.company_cnpj)
      const contract_id    = await resolveContrato(row.contract_numero, empresa_id, row.company_nome, row)
      if (empresa_id) empresasTocadas.add(empresa_id)
      const { item } = buildItemDoPagamento(row)
      const custom_fields  = {}
      customFormFields.forEach(f => { if(row[f.key]!==undefined) custom_fields[f.key]=row[f.key] })
      const cdu=parseFloat(row.amount_cdu)||0, sms=parseFloat(row.amount_sms)||0
      const services=parseFloat(row.amount_services)||0, discount=parseFloat(row.amount_discount)||0
      // Pagamentos importados são sempre recebidos (já foram pagos pelo cliente)
      importRows.push({
        id: 'imp_'+Date.now()+'_'+Math.random().toString(36).slice(2),
        contract_id, contract_numero:row.contract_numero,
        company_id:empresa_id, company_nome:row.company_nome,
        produto_id: item.produto_id, produto_nome: item.nome, itens: [item],
        num_documento:row.num_documento||null, data_emissao:row.data_emissao||null,
        parcela:row.parcela||'1/1',
        amount_cdu:cdu, amount_sms:sms, amount_services:services, amount_discount:discount,
        amount_total_net:cdu+sms+services-discount,
        valor_recebido:cdu+sms+services-discount, data_baixa:row.data_emissao||hoje,
        reference_month:row.reference_month, due_date:row.due_date||null,
        status: 'pago',
        processed:true, notes:row.notes||'', custom_fields,
        criado:hoje,
      })
    }

    // Toda empresa tocada aqui ganhou (ou já tinha) um contrato ativo — vira
    // Cliente Final, igual aos importadores de Contratos e Provisões.
    let promovidasCount = 0
    for (const eid of empresasTocadas) {
      const emp = companies.find(c => c.id === eid)
      if (emp && emp.tipo === 'cliente_final') continue
      const r = await updateCompany(eid, { tipo: 'cliente_final' })
      if (r?.ok !== false) promovidasCount++
    }
    setEmpresasPromovidas(promovidasCount)

    updateImportJob(id, { current:total, subLabel:'Conciliando provisões…' })
    setEmpresasCriadas(empresasCriadasCount)
    setContratosCriados(contratosCriadosCount)

    // ── Reconciliação de Provisões ──────────────────────────────────────────
    // Identifica meses cobertos pelo arquivo importado
    const mesesImportados = new Set(importRows.map(r => (r.reference_month||'').slice(0,7)).filter(Boolean))
    // Índice rápido: contract_numero + reference_month dos pagamentos importados
    const pagIndex = new Set(importRows.map(r => `${(r.contract_numero||'').toLowerCase()}|${(r.reference_month||'').slice(0,7)}`))
    // Provisões no mesmo período
    const provisoesDoPeriodo = (provisoes||[]).filter(p =>
      mesesImportados.has((p.reference_month||'').slice(0,7)) && p.status !== 'cancelado'
    )
    const matched   = provisoesDoPeriodo.filter(p => pagIndex.has(`${(p.contract_numero||'').toLowerCase()}|${(p.reference_month||'').slice(0,7)}`))
    const unmatched = provisoesDoPeriodo.filter(p => !pagIndex.has(`${(p.contract_numero||'').toLowerCase()}|${(p.reference_month||'').slice(0,7)}`))

    const log = {
      id:Date.now(), tipo:'importacao', fileName:parsed.fileName, date:new Date().toLocaleString('pt-BR'),
      total:parsed.rowResults.length, imported:importRows.length,
      errors:parsed.rowResults.filter(r=>!r.ok && !r.isDup).length,
      duplicados:parsed.rowResults.filter(r=>r.isDup).length,
      rowResults:parsed.rowResults,
      empresasCriadas: empresasCriadasCount, contratosCriados: contratosCriadosCount,
      provisoesReconciliadas: matched.length,
      provisoesSemPagamento:  unmatched.length,
      meses: Array.from(mesesImportados).sort(),
      inconsistentes: unmatched.map(p => ({
        id:p.id, company_nome:p.company_nome, contract_numero:p.contract_numero,
        reference_month:p.reference_month, amount_total_net:p.amount_total_net,
      })),
    }
    await onImport(importRows, log)
    setReconcData({ matched, unmatched, months: Array.from(mesesImportados).sort() })
    updateImportJob(id, { subLabel: 'Aguardando conciliação de provisões…' })
    setStep('reconciliation')
  }

  async function handleConfirmReconciliation() {
    if (!reconcData || !saveProvisao) return
    setReconciling(true)
    if (jobId) updateImportJob(jobId, { subLabel: 'Conciliando provisões…' })
    const hoje = new Date().toISOString().slice(0, 10)
    // Provisões com pagamento → status pago
    for (const p of reconcData.matched) {
      await saveProvisao({ ...p, status: 'pago', data_baixa: p.data_baixa || hoje })
    }
    // Provisões sem pagamento → inconsistência pendente
    for (const p of reconcData.unmatched) {
      await saveProvisao({ ...p, inconsistencia_status: 'inconsistencia_pendente', inconsistencia: true })
    }
    setReconciling(false)
    if (jobId) finishImportJob(jobId, { subLabel: `Concluído!${empresasCriadas > 0 ? ` · ${empresasCriadas} empresa(s) criada(s)` : ''}${contratosCriados > 0 ? ` · ${contratosCriados} contrato(s) criado(s)` : ''}${empresasPromovidas > 0 ? ` · ${empresasPromovidas} promovida(s) a Cliente Final` : ''}` })
    setStep('done')
  }

  const okCount  = parsed?.rowResults.filter(r=>r.ok).length??0
  const errCount = parsed?.rowResults.filter(r=>!r.ok && !r.isDup).length??0
  const dupCount = parsed?.rowResults.filter(r=>r.isDup).length??0

  const impBox = {
    border:'2px dashed var(--border)', borderRadius:12, padding:32,
    textAlign:'center', cursor:'pointer', transition:'border-color 0.2s, background 0.2s',
    background:dragging?'var(--accent-glow)':'var(--surface2)',
    borderColor:dragging?'var(--accent)':'var(--border)',
  }

  return (
    <div style={ov.wrap} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ ...ov.modal, maxWidth:640 }}>
        <div style={ov.header}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Importar Pagamentos</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {step==='upload'    && 'CSV com separador ponto-e-vírgula (;) — UTF-8'}
              {step==='preview'   && `${parsed?.fileName} — ${okCount} válidos${dupCount>0?`, ${dupCount} duplicados`:''}${errCount>0?`, ${errCount} com erro`:''}`}
              {step==='importing' && `Processando ${job?.current ?? 0} de ${job?.total ?? 0}…`}
              {step==='done'      && 'Importação concluída'}
            </div>
          </div>
          <button style={ov.xBtn} onClick={onClose}>✕</button>
        </div>

        {step==='upload' && (
          <div style={{ padding:24 }}>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Template CSV</span>
                <button onClick={handleDownloadTemplate}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                    background:ACCENT, color:'#fff', border:'none', borderRadius:7,
                    fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                  ⬇ Baixar template
                </button>
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', overflowX:'auto', whiteSpace:'nowrap' }}>
                {allCols.join(' · ')}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, lineHeight:1.6 }}>
                <b>produto_nome é obrigatório</b> e precisa bater com um produto cadastrado (código ou nome exato)
                — pagamento sem produto não é permitido. Empresa/contrato resolvidos e criados automaticamente
                quando não existem (contrato sempre com o produto da linha como item); empresa nova ou já
                cadastrada com contrato ativo vira tipo <b>Cliente Final</b>.
              </div>
              {customFormFields.length>0 && (
                <div style={{ marginTop:6, fontSize:11, color:'var(--accent)' }}>
                  + {customFormFields.length} campo{customFormFields.length>1?'s':''} customizados incluídos no template
                </div>
              )}
            </div>
            <div
              style={impBox}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
            >
              <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Arraste o arquivo CSV aqui</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>ou clique para selecionar</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
                onChange={e => processFile(e.target.files[0])} />
            </div>
          </div>
        )}

        {step==='preview' && parsed && (
          <div style={{ padding:'0 0 4px' }}>
            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {parsed.rowResults.map((r,i) => {
                const color = r.ok ? '#10B981' : r.isDup ? '#F59E0B' : '#EF4444'
                const icon  = r.ok ? '✓' : r.isDup ? '⊘' : '✗'
                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 24px',
                    borderBottom:'1px solid var(--border2)',
                    background:r.ok?'transparent':r.isDup?'rgba(245,158,11,0.04)':'rgba(239,68,68,0.03)' }}>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--mono)',
                      color, flexShrink:0, marginTop:2, minWidth:36 }}>
                      {icon} L{r.line}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.row.contract_numero} · {r.row.company_nome}
                        {r.row.reference_month && <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>{r.row.reference_month.slice(0,7)}</span>}
                        {r.row.num_documento && <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>{r.row.num_documento}</span>}
                      </div>
                      {r.isDup && (
                        <div style={{ fontSize:11, color:'#F59E0B', marginTop:2 }}>
                          {r.dupInDB ? 'Duplicado — já existe em Pagamentos' : 'Duplicado — repetido no próprio arquivo'}
                        </div>
                      )}
                      {!r.ok && !r.isDup && <div style={{ fontSize:11, color:'#EF4444', marginTop:2 }}>{r.errors.join(' · ')}</div>}
                    </div>
                    {r.ok && <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', flexShrink:0 }}>
                      {parseFloat(r.row.amount_cdu||0)+parseFloat(r.row.amount_sms||0)+parseFloat(r.row.amount_services||0)-parseFloat(r.row.amount_discount||0) > 0
                        ? `R$ ${(parseFloat(r.row.amount_cdu||0)+parseFloat(r.row.amount_sms||0)+parseFloat(r.row.amount_services||0)-parseFloat(r.row.amount_discount||0)).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
                        : ''}
                    </span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {step==='importing' && (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚙️</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{job?.subLabel}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>
              {job?.current ?? 0} / {job?.total ?? 0} registros
            </div>
            <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
              <div style={{ height:'100%', background:'var(--accent)', borderRadius:3,
                width:`${job?.total>0?Math.round((job.current||0)/job.total*100):0}%`,
                transition:'width 0.3s ease' }} />
            </div>
            {(empresasCriadas>0||contratosCriados>0) && (
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>
                {empresasCriadas>0 && `${empresasCriadas} empresa${empresasCriadas>1?'s':''} criada${empresasCriadas>1?'s':''}`}
                {empresasCriadas>0 && contratosCriados>0 && ' · '}
                {contratosCriados>0 && `${contratosCriados} contrato${contratosCriados>1?'s':''} criado${contratosCriados>1?'s':''}`}
              </div>
            )}
            <div style={{ marginTop:12, fontSize:11, color:'var(--text-muted)' }}>
              Pode fechar esta janela ou trocar de tela — o progresso continua visível no canto inferior direito.
            </div>
          </div>
        )}

        {step==='reconciliation' && reconcData && (
          <div style={{ padding:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:16 }}>
              Conciliação de Provisões — {reconcData.months.join(', ')}
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              <div style={{ flex:1, background:'#D1FAE520', border:'1px solid #10B98140', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#10B981' }}>{reconcData.matched.length}</div>
                <div style={{ fontSize:11, color:'#059669', marginTop:2, fontWeight:600 }}>Provisões conciliadas</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Status → Recebido</div>
              </div>
              <div style={{ flex:1, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#F59E0B' }}>{reconcData.unmatched.length}</div>
                <div style={{ fontSize:11, color:'#D97706', marginTop:2, fontWeight:600 }}>Sem pagamento</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Inconsistência Pendente</div>
              </div>
            </div>
            {reconcData.unmatched.length > 0 && (
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', maxHeight:220, overflowY:'auto' }}>
                <div style={{ padding:'8px 12px', background:'var(--surface2)', fontSize:11, fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)' }}>
                  Provisões sem pagamento correspondente
                </div>
                {reconcData.unmatched.map((p, i) => (
                  <div key={p.id||i} style={{ padding:'8px 12px', borderBottom: i < reconcData.unmatched.length-1 ? '1px solid var(--border2)' : 'none', background:'rgba(245,158,11,0.03)' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{p.company_nome} · {p.contract_numero}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                      {(p.reference_month||'').slice(0,7)} · {p.amount_total_net != null ? `R$ ${Number(p.amount_total_net).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {reconcData.matched.length === 0 && reconcData.unmatched.length === 0 && (
              <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', padding:20 }}>
                Nenhuma provisão encontrada nos meses importados.
              </div>
            )}
          </div>
        )}

        {step==='done' && (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
              {job?.current ?? 0} pagamento{(job?.current ?? 0)!==1?'s':''} importado{(job?.current ?? 0)!==1?'s':''}
            </div>
            {(empresasCriadas>0||contratosCriados>0) && (
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                {empresasCriadas>0 && `${empresasCriadas} empresa${empresasCriadas>1?'s':''} criada${empresasCriadas>1?'s':''}`}
                {empresasCriadas>0 && contratosCriados>0 && ' · '}
                {contratosCriados>0 && `${contratosCriados} contrato${contratosCriados>1?'s':''} criado${contratosCriados>1?'s':''}`}
              </div>
            )}
            {reconcData && (reconcData.matched.length > 0 || reconcData.unmatched.length > 0) && (
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:8 }}>
                {reconcData.matched.length > 0 && `${reconcData.matched.length} provisão(ões) marcada(s) como Recebido`}
                {reconcData.matched.length > 0 && reconcData.unmatched.length > 0 && ' · '}
                {reconcData.unmatched.length > 0 && `${reconcData.unmatched.length} com Inconsistência Pendente`}
              </div>
            )}
          </div>
        )}

        <div style={ov.footer}>
          {step==='upload' && <Button variant="secondary" onClick={onClose}>Cancelar</Button>}
          {step==='preview' && <>
            <Button variant="secondary" onClick={()=>setStep('upload')}>← Voltar</Button>
            <Button disabled={okCount===0} onClick={handleConfirmImport}>
              Importar {okCount} pagamento{okCount!==1?'s':''}
            </Button>
          </>}
          {step==='importing' && <span style={{ fontSize:12, color:'var(--text-muted)' }}>Aguarde…</span>}
          {step==='reconciliation' && <>
            {(reconcData?.matched.length > 0 || reconcData?.unmatched.length > 0)
              ? <Button onClick={handleConfirmReconciliation} disabled={reconciling}>
                  {reconciling ? 'Aplicando…' : `Aplicar conciliação (${(reconcData?.matched.length||0)+(reconcData?.unmatched.length||0)} provisões)`}
                </Button>
              : <Button onClick={() => setStep('done')}>Concluir</Button>
            }
          </>}
          {step==='done' && <Button onClick={onClose}>Fechar</Button>}
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
    notes:                 pagamento.notes||'',
    inconsistencia_status: pagamento.inconsistencia_status || 'sem_inconsistencia',
  })
  const [dirty, setDirty] = useState(false)
  const [statusBloqueado, setStatusBloqueado] = useState(false)
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
      produto_id: form.produto_id || null,
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
          <select className="so-field" value={form.status}
            onChange={e => {
              if (pagamento.status === 'pago' && e.target.value !== 'pago') {
                setStatusBloqueado(true)
                return
              }
              setStatusBloqueado(false)
              set('status', e.target.value)
            }}>
            {Object.entries(STATUS_PAGAMENTO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {statusBloqueado && (
            <div style={{ marginTop:6, padding:'7px 10px', borderRadius:7,
              background:'#FEF3C7', border:'1px solid #F59E0B',
              fontSize:11, color:'#92400E', lineHeight:1.5 }}>
              Este pagamento já foi confirmado como recebido e não pode ser revertido. Caso necessário, crie um novo lançamento de ajuste.
            </div>
          )}
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
        <FormField label="Inconsistência" span={2}>
          <select className="so-field" value={form.inconsistencia_status}
            onChange={e => { set('inconsistencia_status', e.target.value) }}>
            {INCONSISTENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
                produto_id: form.produto_id || null,
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
      produto_id: form.produto_id || null,
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

// ─── ConfirmBulkModal ─────────────────────────────────────────────────────────
function ConfirmBulkModal({ ids, pagamentos, produtosNovo, onConfirm, onCancel }) {
  const [isFechamento, setIsFechamento] = useState(false)

  const selecionados = pagamentos.filter(p => ids.includes(p.id) && p.status !== 'pago')
  const totalValor   = selecionados.reduce((s, p) => s + (p.amount_total_net || 0), 0)
  const fmtR = v => `R$ ${Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits:2 })}`

  const comProvisao = selecionados.filter(p => {
    const prod = produtosNovo.find(pr => String(pr.id) === String(p.produto_id))
      || produtosNovo.find(pr => pr.nome === p.produto_nome)
    return prod?.cobranca === 'mensal'
  }).length

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.72)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:9999 }}>
      <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:480,
        boxShadow:'0 24px 60px rgba(0,0,0,0.28)', overflow:'hidden', fontFamily:'var(--font)' }}>

        {/* Header */}
        <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#DBEAFE',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
              ✅
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>
                Confirmar processamento em lote
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                Revise o resumo abaixo antes de iniciar
              </div>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              ['Pagamentos a processar', selecionados.length],
              ['Valor total líquido', fmtR(totalValor)],
              ['Vão gerar nova provisão', comProvisao],
              ['Já recebidos (ignorados)', ids.length - selecionados.length],
            ].map(([label, val]) => (
              <div key={label} style={{ background:'var(--surface2)', borderRadius:8,
                padding:'10px 14px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Opção de Fechamento */}
          <button
            type="button"
            onClick={() => setIsFechamento(v => !v)}
            style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px',
              background: isFechamento ? '#EFF6FF' : 'var(--surface2)',
              border: `2px solid ${isFechamento ? '#3B82F6' : 'var(--border)'}`,
              borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              fontFamily:'var(--font)', width:'100%' }}>
            <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
              border:`2px solid ${isFechamento ? '#3B82F6' : 'var(--border2)'}`,
              background: isFechamento ? '#3B82F6' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
              {isFechamento && <span style={{ color:'#fff', fontSize:11, fontWeight:800, lineHeight:1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color: isFechamento ? '#1D4ED8' : 'var(--text)' }}>
                Este é um Fechamento Mensal
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, lineHeight:1.4 }}>
                Marca os pagamentos com a data de fechamento e gera o Relatório de Fechamento com valores liberados e inconsistências
              </div>
            </div>
          </button>

          <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
              <strong style={{ color:'var(--text)' }}>Etapas:</strong>{' '}
              Registrar recebimento · Verificar inconsistências · Gerar provisões · Calcular comissões
              {isFechamento && <span style={{ color:'#1D4ED8', fontWeight:600 }}> · Gerar Relatório de Fechamento</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px 20px', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm(isFechamento)} disabled={selecionados.length === 0}>
            Processar {selecionados.length} pagamento{selecionados.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}

const FECHAMENTO_LS_KEY = 'pagamentos:fechamentos_v1'
function loadFechamentos() { try { return JSON.parse(localStorage.getItem(FECHAMENTO_LS_KEY)||'[]') } catch { return [] } }
function saveFechamentos(list) { try { localStorage.setItem(FECHAMENTO_LS_KEY, JSON.stringify(list)) } catch {} }

function exportFechamentoExcel(fechamento) {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const fmtR = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const isImport = fechamento.tipo === 'importacao'
  const incRows = (fechamento.inconsistentes||[]).map(i => {
    const motivo = isImport
      ? 'Provisão sem pagamento correspondente'
      : ((i.notes||'').split('\n').find(l=>l.startsWith('[Inconsistência]'))||'')
    return `<tr><td>${esc(i.company_nome)}</td><td>${esc(i.contract_numero)}</td><td>${esc(i.reference_month)}</td><td>${esc(fmtR(i.amount_total_net))}</td><td>${esc(motivo)}</td></tr>`
  }).join('')
  const statsRows = isImport ? `
<tr><td><b>Arquivo</b></td><td>${esc(fechamento.fileName)}</td></tr>
<tr><td><b>Data/Hora</b></td><td>${esc(fechamento.date)}</td></tr>
<tr><td><b>Meses importados</b></td><td>${esc((fechamento.meses||[]).join(', '))}</td></tr>
<tr><td><b>Pagamentos Importados</b></td><td>${fechamento.imported||0}</td></tr>
<tr><td><b>Duplicados ignorados</b></td><td>${fechamento.duplicados||0}</td></tr>
<tr><td><b>Provisões conciliadas (Recebido)</b></td><td>${fechamento.provisoesReconciliadas||0}</td></tr>
<tr><td><b>Provisões sem pagamento (Inconsistência)</b></td><td>${fechamento.provisoesSemPagamento||0}</td></tr>` : `
<tr><td><b>Operador</b></td><td>${esc(fechamento.usuario)}</td></tr>
<tr><td><b>Data/Hora</b></td><td>${esc(fechamento.data)}</td></tr>
<tr><td><b>Registros Processados</b></td><td>${fechamento.totalProcessados}</td></tr>
<tr><td><b>Provisões Geradas</b></td><td>${fechamento.totalProvisoes||0}</td></tr>
<tr><td><b>Valor Liberado (sem problemas)</b></td><td>${esc(fmtR(fechamento.valorLiberado))}</td></tr>
<tr><td><b>Valor com Inconsistências</b></td><td>${esc(fmtR(fechamento.valorInconsistente))}</td></tr>`
  const titulo = isImport ? `Importação de Pagamentos — ${esc(fechamento.date)}` : `Relatório de Fechamento — ${esc(fechamento.data)}`
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/></head><body>
<table border="1">
<thead><tr><th colspan="2"><b>${titulo}</b></th></tr></thead>
<tbody>${statsRows}</tbody>
</table>
${incRows.length>0?`<br/><table border="1">
<thead><tr><th><b>Empresa</b></th><th><b>Contrato</b></th><th><b>Competência</b></th><th><b>Valor</b></th><th><b>Motivo</b></th></tr></thead>
<tbody>${incRows}</tbody>
</table>`:''}
</body></html>`
  const blob = new Blob(['﻿'+html],{type:'application/vnd.ms-excel;charset=utf-8'})
  const url=URL.createObjectURL(blob); const a=document.createElement('a')
  a.href=url; a.download=`fechamento_${fechamento.id}.xls`; a.click(); URL.revokeObjectURL(url)
}

function FechamentoModal({ fechamentos, onClose }) {
  const [selected, setSelected] = useState(fechamentos[0]?.id||null)
  const fch = fechamentos.find(f=>f.id===selected)
  const fmtR = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const isImport = fch?.tipo === 'importacao'

  const statsCards = fch ? (isImport ? [
    ['Arquivo',                    fch.fileName||'—'],
    ['Data/Hora',                  fch.date||'—'],
    ['Meses importados',           (fch.meses||[]).join(', ')||'—'],
    ['Pagamentos importados',      fch.imported||0],
    ['Duplicados ignorados',       fch.duplicados||0],
    ['Provisões → Recebido',       fch.provisoesReconciliadas||0],
    ['Provisões → Inconsistência', fch.provisoesSemPagamento||0],
  ] : [
    ['Operador',                   fch.usuario||'—'],
    ['Data/Hora',                  fch.data||'—'],
    ['Registros Processados',      fch.totalProcessados||0],
    ['Provisões Geradas',          fch.totalProvisoes||0],
    ['Valor Liberado',             fmtR(fch.valorLiberado)],
    ['Valor com Inconsistências',  fmtR(fch.valorInconsistente)],
  ]) : []

  return (
    <div style={ov.wrap} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{...ov.modal, maxWidth:720, maxHeight:'90vh', display:'flex', flexDirection:'column'}}>
        <div style={ov.header}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>Relatório de Fechamento</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{fechamentos.length} operaç{fechamentos.length===1?'ão':'ões'} registrada{fechamentos.length===1?'':'s'}</div>
          </div>
          <button style={ov.xBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{display:'flex',flex:1,minHeight:0,overflow:'hidden'}}>
          {/* Lista de operações */}
          <div style={{width:200,borderRight:'1px solid var(--border)',overflowY:'auto',padding:'8px 0',flexShrink:0}}>
            {fechamentos.length===0 && <div style={{fontSize:12,color:'var(--text-muted)',padding:'12px 16px'}}>Nenhum fechamento registrado</div>}
            {fechamentos.map(f=>(
              <button key={f.id} onClick={()=>setSelected(f.id)} style={{
                width:'100%',textAlign:'left',padding:'10px 14px',border:'none',cursor:'pointer',
                fontFamily:'var(--font)',background:selected===f.id?'var(--accent-glow)':'none',
                borderLeft:`3px solid ${selected===f.id?'var(--accent)':'transparent'}`,
              }}>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2}}>
                  {f.tipo==='importacao' ? '📥 Importação' : '📋 Fechamento'}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text)',lineHeight:1.3}}>
                  {f.tipo==='importacao' ? (f.date||'—') : (f.data||'—')}
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                  {f.tipo==='importacao' ? `${f.imported||0} pagamentos` : `${f.totalProcessados||0} registros`}
                </div>
              </button>
            ))}
          </div>
          {/* Detalhe */}
          <div style={{flex:1,overflowY:'auto',padding:20}}>
            {!fch && <div style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',paddingTop:40}}>Selecione um fechamento</div>}
            {fch && (<>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                {isImport ? '📥 Importação de Pagamentos' : '📋 Fechamento Mensal'}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                {statsCards.map(([label,val])=>(
                  <div key={label} style={{background:'var(--surface2)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--border)'}}>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:3}}>{label}</div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{val}</div>
                  </div>
                ))}
              </div>
              {fch.inconsistentes?.length>0 && (<>
                <div style={{fontSize:12,fontWeight:700,color:'#92400E',marginBottom:8}}>
                  ⚠ {fch.inconsistentes.length} {isImport ? 'provisão(ões) sem pagamento' : `pagamento${fch.inconsistentes.length>1?'s':''} com inconsistência`}
                </div>
                <div style={{border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
                  {fch.inconsistentes.map((inc,i)=>(
                    <div key={i} style={{padding:'8px 12px',borderBottom:i<fch.inconsistentes.length-1?'1px solid var(--border2)':'none',background:'rgba(239,68,68,0.03)'}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{inc.company_nome} · {inc.contract_numero}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                        {(inc.reference_month||'').slice(0,7)} · {fmtR(inc.amount_total_net)}
                        {!isImport && inc.notes && <span style={{marginLeft:8,color:'#EF4444'}}>{inc.notes.split('\n').find(l=>l.startsWith('[Inconsistência]'))||''}</span>}
                        {isImport && <span style={{marginLeft:8,color:'#F59E0B'}}>Inconsistência Pendente</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>)}
              {(!fch.inconsistentes||fch.inconsistentes.length===0) && (
                <div style={{fontSize:12,color:'#10B981',padding:'12px',background:'#D1FAE520',borderRadius:8,border:'1px solid #10B98140'}}>
                  ✓ Nenhuma inconsistência registrada nesta operação
                </div>
              )}
            </>)}
          </div>
        </div>
        <div style={ov.footer}>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          {fch && <Button onClick={()=>exportFechamentoExcel(fch)}>⬇ Exportar Excel</Button>}
        </div>
      </div>
    </div>
  )
}

export default function Pagamentos() {
  const { session } = useAuth()
  const { pagamentos, setPagamentos, save: savePagamento } = usePayments()
  const { provisoes, save: saveProvisao } = useProvisoes()
  const { bulkSetStatus: bulkSetFaturaStatus } = useFaturas()
  const { registrar: log } = useAuditLog()
  const { contratos, save: saveContrato } = useContracts()
  const { companies, add: addCompany, update: updateCompany } = useCompanies()
  const { savePayment: saveCommissionPayment, rules: commissionRules, personas: commissionPersonas } = useCommissions()
  const { projetos } = useProjects()
  const { membros: oppMembros } = useOppMembros()
  const { usuarios } = useUsuarios()

  const [tab, setTab] = useLocalState('pagamentos:tab', 'pagamentos')

  // ── estado persistido ─────────────────────────────────────────────────────
  const [search, setSearch]                     = useLocalState('pagamentos:search', '')
  const [filtroStatus, setFiltroStatus]         = useLocalState('pagamentos:filtroStatus', '')
  const [filtroProcessado, setFiltroProcessado] = useLocalState('pagamentos:filtroProcessado', '')
  const { produtos: produtosReais } = useProducts()
  const produtosNovo = produtosReais.length > 0 ? produtosReais : MOCK_PRODUTOS
  const produtosAtivos = produtosNovo.filter(p => p.status === 'ativo')

  // ── estado efêmero ────────────────────────────────────────────────────────
  const [detalheModal, setDetalheModal]       = useState(null)
  const pagSaveRef = useRef(null)
  const [gerarTodosModal, setGerarTodosModal] = useState(false)
  const [novoPagForm, setNovoPagForm]         = useState(null)
  const [savingNovo, setSavingNovo]           = useState(false) // eslint-disable-line no-unused-vars
  const [importModal, setImportModal]         = useState(false)
  const [recebidoFeedback, setRecebidoFeedback] = useState(null) // { pag, steps }
  const [confirmComissao, setConfirmComissao] = useState(null)   // pag aguardando confirmação
  const [batchProgress, setBatchProgress]     = useState(null)   // { operations: [...] }
  const [inconsistenciaModal, setInconsistenciaModal] = useState(null) // { itens: [...], ids: [...] }
  const [confirmBulkModal, setConfirmBulkModal]       = useState(null) // { ids: [...] }
  const [pendingBulkEdit, setPendingBulkEdit]         = useState(null) // { ids, changes }
  const bulkEditCloseRef = useRef(null)
  const [fechamentos, setFechamentos]         = useState(() => loadFechamentos())
  const [fechamentoModal, setFechamentoModal] = useState(false)

  const periodos = useMemo(() => periodosUnicos(pagamentos), [pagamentos])
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const firstOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const [periododeDe, setPeriodoDe] = useLocalState('pagamentos:filtroDe', firstOfMonthStr)
  const [periodoAte, setPeriodoAte] = useLocalState('pagamentos:filtroAte', todayStr)

  const doPeriodo = useMemo(() => {
    return pagamentos.filter(p => {
      const ref = (p.reference_month || p.due_date || '').slice(0, 10)
      if (periododeDe && ref < periododeDe) return false
      if (periodoAte  && ref > periodoAte)  return false
      return true
    })
  }, [pagamentos, periododeDe, periodoAte])

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
    const fileName = `pagamentos_ate_${periodoAte}_${new Date().toISOString().slice(0,10)}.csv`
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
      produto_id: form.produto_id || null,
      produto_nome: form.produto_nome || '',
      tenant_id: 't1',
      criado: new Date().toISOString().slice(0, 10),
    })
    setNovoPagForm(null)
  }

  // Gera repasses de comissão para um pagamento recém marcado como pago
  function gerarRepasses(pag) {
    try {
      const ref = pag.reference_month || ''
      const parts = ref.slice(0, 7).split('-')
      const periodo_ano = parts[0] ? Number(parts[0]) : new Date().getFullYear()
      const periodo_mes = parts[1] ? Number(parts[1]) : new Date().getMonth() + 1
      const valorBase   = Number(pag.amount_total_net) || 0

      const regrasAtivas = (commissionRules || []).filter(r =>
        r.ativo !== false && r.status !== 'inativa' && r.status !== 'inativo'
      )
      if (!regrasAtivas.length) return

      const contrato = contratos.find(c =>
        String(c.id) === String(pag.contract_id) ||
        c.numero === pag.contract_numero
      )

      // produto do pagamento — usado para filtros de produto/categoria
      const prodPag = produtosNovo.find(p => String(p.id) === String(pag.produto_id))
      const catPag  = prodPag?.categoria || ''

      // membros do time interno da oportunidade (se houver)
      const membrosTimeInterno = contrato?.opportunity_id
        ? (oppMembros || []).filter(m =>
            String(m.oportunidade_id) === String(contrato.opportunity_id) &&
            m.tipo_membro === 'interno'
          )
        : []

      // helper: calcula valor de comissão conforme tipo de cálculo da combinação
      function calcValor(comb) {
        const tipo = comb.tipo_calculo || 'percentual_fixo'

        if (tipo === 'cadeia_repasse') {
          // valorBase × repasse_origem_pct × base_calculo_pct × percentual_comissao
          const repasse = Number(comb.repasse_origem_pct)  || 0
          const base    = Number(comb.base_calculo_pct)    || 0
          const pct     = Number(comb.percentual_comissao) || 0
          return valorBase * (repasse / 100) * (base / 100) * (pct / 100)
        }

        if (tipo === 'percentual_fixo') {
          // delega ao chamador (calcula por persona)
          return null
        }

        // escalonado / outros: não implementado ainda → 0
        return 0
      }

      // helper: filtra se a combinação se aplica ao produto/categoria do pagamento
      function combPassaFiltro(comb) {
        const tipo = comb.produto_filtro_tipo
        if (tipo === 'produto') {
          return (comb.produto_ids || []).map(String).includes(String(pag.produto_id))
        }
        if (tipo === 'categoria') {
          return (comb.produto_categorias || []).includes(catPag)
        }
        // null / '' = Todos — verifica se o produto tem categoria cadastrada para evitar
        // aplicar em produtos sem categoria quando a regra tem categorias definidas
        if (comb.produto_categorias?.length > 0) {
          return !catPag || comb.produto_categorias.includes(catPag)
        }
        return true
      }

      regrasAtivas.forEach(rule => {
        const combinacoes = rule.combinacoes?.length > 0 ? rule.combinacoes : [rule]

        combinacoes.forEach(comb => {
          if (!combPassaFiltro(comb)) return

          // exige_participacao_venda: usa nível combinação (sempre disponível agora)
          const exigeParticipacao = comb.exige_participacao_venda ?? rule.exige_participacao_venda ?? false
          if (exigeParticipacao && !contrato?.opportunity_id) return

          const tipo = comb.tipo_calculo || 'percentual_fixo'

          if (tipo === 'cadeia_repasse') {
            // Cadeia de repasse: um único repasse para a regra (sem persona individual)
            const valorComissao = calcValor(comb)
            if (!valorComissao || valorComissao <= 0) return

            saveCommissionPayment({
              rule_id:           rule.id,
              company_id:        pag.company_id  || null,
              contract_id:       pag.contract_id || null,
              beneficiario_id:   null,
              beneficiario_nome: rule.nome || 'Cadeia de Repasse',
              persona_slug:      '',
              periodo_mes,
              periodo_ano,
              valor_bruto:       valorBase,
              valor_comissao:    valorComissao,
              status:            'pendente',
              observacoes:       `Cadeia de Repasse — ${pag.contract_numero || ''} (${pag.company_nome || ''})`,
              custom_fields: {
                tipo_calculo:        'cadeia_repasse',
                repasse_origem_pct:  comb.repasse_origem_pct,
                base_calculo_pct:    comb.base_calculo_pct,
                percentual_comissao: comb.percentual_comissao,
                contract_numero:     pag.contract_numero || '',
                company_nome:        pag.company_nome    || '',
                produto_nome:        pag.produto_nome    || '',
                origem_pagamento_id: pag.id,
                fonte_repasse:       'cadeia_repasse',
                opportunity_id:      contrato?.opportunity_id || null,
              },
            })
            return
          }

          // percentual_fixo: um repasse por persona com percentual > 0
          const percs = comb.persona_percentuais || rule.persona_percentuais || []

          // coleta beneficiários desta combinação
          const beneficiarios = []

          // CASO 1: personas da regra (nível filial)
          percs.forEach(pp => {
            if (!pp.persona_id && !pp.persona_slug) return
            const pct = (Number(pp.cdu_pct) || 0) + (Number(pp.sms_pct) || 0) + (Number(pp.servicos_pct) || 0)
            if (pct <= 0) return

            const persona = (commissionPersonas || []).find(p =>
              String(p.id) === String(pp.persona_id) || p.slug === pp.persona_slug
            )
            if (persona?.usuario_id) {
              const usuario = (usuarios || []).find(u => String(u.id) === String(persona.usuario_id))
              beneficiarios.push({ personaId: persona.id, personaSlug: persona.slug || '', userId: persona.usuario_id, nome: usuario?.nome || usuario?.email || persona.label || '', pp, fonte: 'regra_filial' })
            } else {
              beneficiarios.push({ personaId: persona?.id || pp.persona_id, personaSlug: persona?.slug || pp.persona_slug || '', userId: null, nome: persona?.label || pp.persona_nome || pp.persona_slug || '', pp, fonte: 'regra_filial' })
            }
          })

          // CASO 2: time interno da oportunidade
          membrosTimeInterno.forEach(membro => {
            const personaDoUser = (commissionPersonas || []).find(p => String(p.usuario_id) === String(membro.user_id))
            const ppDoUser = personaDoUser
              ? percs.find(pp => String(pp.persona_id) === String(personaDoUser.id) || pp.persona_slug === personaDoUser.slug)
              : null
            if (!ppDoUser) return
            const pct = (Number(ppDoUser.cdu_pct) || 0) + (Number(ppDoUser.sms_pct) || 0) + (Number(ppDoUser.servicos_pct) || 0)
            if (pct <= 0) return
            const jaTem = beneficiarios.some(b => String(b.userId) === String(membro.user_id))
            if (jaTem) return
            const usuario = (usuarios || []).find(u => String(u.id) === String(membro.user_id))
            beneficiarios.push({ personaId: personaDoUser?.id || null, personaSlug: personaDoUser?.slug || '', userId: membro.user_id, nome: usuario?.nome || usuario?.email || `Usuário ${membro.user_id}`, pp: ppDoUser, fonte: 'time_interno', papel: membro.papel || 'vendedor' })
          })

          beneficiarios.forEach(b => {
            const pp = b.pp
            const cduPct      = Number(pp.cdu_pct)      || 0
            const smsPct      = Number(pp.sms_pct)      || 0
            const servicosPct = Number(pp.servicos_pct) || 0
            const temBuckets  = (pag.amount_cdu || 0) + (pag.amount_sms || 0) + (pag.amount_services || 0) > 0
            let cdu_val = 0, sms_val = 0, servicos_val = 0, valorComissao = 0
            if (temBuckets) {
              cdu_val      = (pag.amount_cdu      || 0) * cduPct      / 100
              sms_val      = (pag.amount_sms      || 0) * smsPct      / 100
              servicos_val = (pag.amount_services || 0) * servicosPct / 100
              valorComissao = cdu_val + sms_val + servicos_val
            }
            if (valorComissao <= 0 && valorBase > 0) {
              const pctTotal = cduPct + smsPct + servicosPct
              valorComissao  = valorBase * pctTotal / 100
              servicos_val   = valorComissao
            }
            if (valorComissao <= 0) return

            const origemDesc = b.fonte === 'time_interno'
              ? `Time interno (${b.papel || 'membro'}) — ${pag.contract_numero || ''} (${pag.company_nome || ''})`
              : `Repasse — ${pag.contract_numero || ''} (${pag.company_nome || ''})`

            saveCommissionPayment({
              rule_id:           rule.id,
              company_id:        pag.company_id  || null,
              contract_id:       pag.contract_id || null,
              beneficiario_id:   b.userId        || b.personaId || null,
              beneficiario_nome: b.nome,
              persona_slug:      b.personaSlug,
              periodo_mes,
              periodo_ano,
              valor_bruto:       valorBase,
              valor_comissao:    valorComissao,
              status:            'pendente',
              observacoes:       origemDesc,
              custom_fields: {
                tipo_calculo:        'percentual_fixo',
                base_cdu:            cdu_val,
                base_sms:            sms_val,
                base_servicos:       servicos_val,
                contract_numero:     pag.contract_numero || '',
                company_nome:        pag.company_nome    || '',
                produto_nome:        pag.produto_nome    || '',
                origem_pagamento_id: pag.id,
                fonte_repasse:       b.fonte,
                opportunity_id:      contrato?.opportunity_id || null,
              },
            })
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
    if (pag.status === 'pago' && anterior?.status !== 'pago') {
      // Executa imediatamente — sem depender de confirmação manual
      gerarRepasses(pag)
      gerarProvisaoProximoMes(pag)
      reconciliarProvisao(pag)
      marcarFaturaPaga(pag)
      // Mostra popup apenas como feedback visual (sem botão de confirmação necessário)
      setConfirmComissao(pag)
    }
  }

  function gerarProvisaoProximoMes(pag) {
    // Só gera se o produto estiver cadastrado com cobrança Mensal
    const produto = produtosNovo.find(p => String(p.id) === String(pag.produto_id))
    // também tenta pelo nome caso o id não bata
    const produtoFinal = produto || produtosNovo.find(p => p.nome === pag.produto_nome)
    if (!produtoFinal || produtoFinal.cobranca !== 'mensal') return

    // Base: data_baixa (data em que o pagamento foi recebido); fallback para reference_month/due_date
    const ref = pag.data_baixa || pag.reference_month || pag.due_date || ''
    const base = ref ? new Date(ref + 'T12:00:00') : new Date()
    const nextYear  = base.getMonth() === 11 ? base.getFullYear() + 1 : base.getFullYear()
    const nextMonth = base.getMonth() === 11 ? 1 : base.getMonth() + 2 // getMonth() é 0-based
    const nextMonthStr = String(nextMonth).padStart(2, '0')
    // último dia do próximo mês: dia 0 do mês seguinte = último dia do mês desejado
    const ultimoDia = new Date(nextYear, nextMonth, 0).getDate()
    const nextRefKey    = `${nextYear}-${nextMonthStr}-01`   // competência: sempre dia 01
    const nextDueDate   = `${nextYear}-${nextMonthStr}-${String(ultimoDia).padStart(2, '0')}`  // vencimento: último dia

    // Evita duplicata: mesmo produto + empresa + competência já existente em provisões (não cancelado)
    const jaExiste = (pag.produto_id && pag.company_id) && provisoes.some(p =>
      String(p.produto_id) === String(pag.produto_id) &&
      String(p.company_id) === String(pag.company_id) &&
      (p.reference_month || '').slice(0, 7) === `${nextYear}-${nextMonthStr}` &&
      p.status !== 'cancelado'
    )
    if (jaExiste) return

    const dataRecebimento = pag.data_baixa || pag.reference_month || ref
    const dataFmt = dataRecebimento
      ? new Date(dataRecebimento + 'T12:00:00').toLocaleDateString('pt-BR')
      : ''
    const nfRef = pag.num_documento || pag.contract_numero || ''
    const obsProvisao = [
      `Provisão gerada automaticamente por recebimento de cobrança mensal.`,
      `Pagamento de origem: ${nfRef ? `NF/Doc ${nfRef}` : 'sem número'}${dataFmt ? ` recebido em ${dataFmt}` : ''}.`,
    ].join(' ')

    // Incrementa parcela: "N/M" → "(N+1)/(M+1)"
    const parcelaAtual = pag.parcela || '1/1'
    const [numStr, denStr] = parcelaAtual.split('/')
    const nextNum = (parseInt(numStr, 10) || 1) + 1
    const nextDen = (parseInt(denStr, 10) || 1) + 1
    const nextParcela = `${nextNum}/${nextDen}`

    const provisao = {
      company_id:      pag.company_id,
      company_nome:    pag.company_nome,
      contract_id:     pag.contract_id,
      contract_numero: pag.contract_numero,
      produto_id:      pag.produto_id,
      produto_nome:    pag.produto_nome,
      amount_cdu:      pag.amount_cdu      || 0,
      amount_sms:      pag.amount_sms      || 0,
      amount_services: pag.amount_services || 0,
      amount_discount: pag.amount_discount || 0,
      status:          'pendente',
      processed:       false,
      inconsistencia:  false,
      inconsistencia_status: 'sem_inconsistencia',
      reference_month: nextRefKey,
      due_date:        nextDueDate,
      data_fechamento: null,
      data_baixa:      null,
      parcela:         nextParcela,
      notes:           obsProvisao,
      branch_id:       pag.branch_id || null,
      tenant_id:       pag.tenant_id  || null,
    }
    saveProvisao(provisao)
    return provisao
  }

  function detectarInconsistencias(ids) {
    const selecionados = pagamentos.filter(p => ids.includes(p.id) && p.status !== 'pago')
    const provisoes = pagamentos.filter(p => p.status === 'pendente' || p.status === 'provisao')
    const itens = []
    for (const pag of selecionados) {
      if (!pag.contract_numero) continue
      const mesRef = (pag.reference_month || '').slice(0, 7) // YYYY-MM
      const provisao = provisoes.find(p =>
        p.contract_numero === pag.contract_numero &&
        (p.reference_month || '').slice(0, 7) === mesRef &&
        p.id !== pag.id
      )
      const valorPago = parseFloat(pag.amount_total_net || 0)
      const valorProv = provisao ? parseFloat(provisao.amount_total_net || 0) : null
      if (provisao && valorProv !== null && Math.abs(valorPago - valorProv) > 0.01) {
        itens.push({
          pag,
          motivo: `Valor divergente da provisão: recebido ${fmtMoeda(valorPago)} vs provisionado ${fmtMoeda(valorProv)}`,
        })
      }
    }
    // provisões sem pagamento correspondente entre os selecionados
    for (const prov of provisoes) {
      if (!prov.contract_numero) continue
      const mesRef = (prov.reference_month || '').slice(0, 7)
      const temPagamento = selecionados.some(p =>
        p.contract_numero === prov.contract_numero &&
        (p.reference_month || '').slice(0, 7) === mesRef
      )
      if (!temPagamento && selecionados.some(p => p.contract_numero === prov.contract_numero)) {
        const jaFlagged = itens.some(i => i.pag.contract_numero === prov.contract_numero)
        if (!jaFlagged) {
          itens.push({
            pag: prov,
            motivo: `Provisão sem pagamento correspondente no período ${mesRef}`,
          })
        }
      }
    }
    return itens
  }

  async function executarBulkReceber(ids, inconsistencias = [], isFechamento = false) {
    const naoEramPagos = pagamentos.filter(p => ids.includes(p.id) && p.status !== 'pago')
    const inconsistenciaIds = new Set(inconsistencias.map(i => i.pag.id))
    const ops = [
      { id: 'receber',        label: 'Registrando recebimentos',      total: naoEramPagos.length, done: 0 },
      { id: 'inconsistencias',label: 'Verificando inconsistências',   total: naoEramPagos.length, done: 0 },
      { id: 'provisoes',      label: 'Gerando novas provisões',       total: naoEramPagos.length, done: 0 },
      { id: 'comissoes',      label: 'Gerando comissões e repasses',  total: naoEramPagos.length, done: 0 },
    ]
    setBatchProgress({ operations: ops })

    // Etapa 1 — salvar status pago
    const pagosList = []
    for (let i = 0; i < naoEramPagos.length; i++) {
      const raw = naoEramPagos[i]
      const temInconsistencia = inconsistenciaIds.has(raw.id)
      const motivoInc = temInconsistencia ? inconsistencias.find(x => x.pag.id === raw.id)?.motivo : null
      const hoje = new Date().toISOString().slice(0, 10)
      const pag = {
        ...raw, status: 'pago', inconsistencia: temInconsistencia,
        notes: motivoInc ? `${raw.notes ? raw.notes + '\n' : ''}[Inconsistência] ${motivoInc}` : raw.notes,
        data_fechamento: isFechamento ? hoje : (raw.data_fechamento || null),
      }
      await savePagamento(pag)
      pagosList.push(pag)
      setBatchProgress(prev => ({ operations: prev.operations.map(op => op.id==='receber' ? {...op,done:i+1} : op) }))
    }

    // Etapa 2 — concilia a provisão correspondente de cada pagamento (mesma
    // busca por contrato+mês do cadastro manual) — sem isso a tabela de
    // Provisões nunca sabia que esses pagamentos em lote já foram recebidos.
    for (let i = 0; i < pagosList.length; i++) {
      reconciliarProvisao(pagosList[i])
      marcarFaturaPaga(pagosList[i])
      setBatchProgress(prev => ({ operations: prev.operations.map(op => op.id==='inconsistencias' ? {...op,done:i+1} : op) }))
    }

    // Etapa 3 — gerar provisões
    const provisoesGeradas = []
    for (let i = 0; i < pagosList.length; i++) {
      const prov = gerarProvisaoProximoMes(pagosList[i])
      if (prov) provisoesGeradas.push(prov)
      setBatchProgress(prev => ({ operations: prev.operations.map(op => op.id==='provisoes' ? {...op,done:i+1} : op) }))
    }

    // Etapa 4 — comissões e repasses
    for (let i = 0; i < pagosList.length; i++) {
      gerarRepasses(pagosList[i])
      setBatchProgress(prev => ({ operations: prev.operations.map(op => op.id==='comissoes' ? {...op,done:i+1} : op) }))
    }

    // Relatório de fechamento — apenas quando o usuário marcou "Fechamento Mensal"
    if (isFechamento) {
      const usuario = session?.user?.email || 'desconhecido'
      const dataFechamento = new Date().toISOString().slice(0, 10)
      const valorLiberado = pagosList.filter(p=>!p.inconsistencia).reduce((s,p)=>s+(p.amount_total_net||0),0)
      const valorInconsistente = pagosList.filter(p=>p.inconsistencia).reduce((s,p)=>s+(p.amount_total_net||0),0)
      const fechamento = {
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        dataFechamento,
        usuario,
        totalProcessados: pagosList.length,
        totalProvisoes: provisoesGeradas.length,
        valorLiberado,
        valorInconsistente,
        inconsistentes: pagosList.filter(p=>p.inconsistencia).map(p=>({
          id:p.id, company_nome:p.company_nome, contract_numero:p.contract_numero,
          reference_month:p.reference_month, amount_total_net:p.amount_total_net, notes:p.notes,
        })),
      }
      setFechamentos(prev => { const next=[fechamento,...prev].slice(0,60); saveFechamentos(next); return next })
    }
  }

  function confirmarGerarComissao(pag) {
    // Ações já executadas em handleSave — apenas fecha o popup e mostra feedback
    setConfirmComissao(null)
    const contrato = contratos.find(c =>
      String(c.id) === String(pag.contract_id) || c.numero === pag.contract_numero
    )
    const temOportunidade = !!contrato?.opportunity_id
    const steps = [
      { id: 'recebimento', label: `Recebimento registrado — ${pag.company_nome || pag.contract_numero}` },
      { id: 'regras',      label: 'Verificando regras de comissão ativas' },
      { id: 'repasse',     label: temOportunidade
          ? 'Repasses gerados — Time interno + regras da filial'
          : 'Repasses gerados — Regras da filial' },
    ]
    setRecebidoFeedback({ pag, steps })
  }

  // Busca uma provisão correspondente (mesmo contrato + mês de referência) —
  // mesmo critério usado na conciliação em lote do importador de Pagamentos,
  // só que pra um único registro cadastrado a mão. Se achar e o pagamento já
  // nasce como "pago", concilia na hora: marca a provisão como recebida (ou
  // sinaliza divergência de valor, se o valor não bater).
  function reconciliarProvisao(pag) {
    if (!pag.contract_numero || !pag.reference_month) return
    const mesRef = (pag.reference_month || '').slice(0, 7)
    const provisao = provisoes.find(p =>
      (p.contract_numero || '').toLowerCase() === (pag.contract_numero || '').toLowerCase() &&
      (p.reference_month || '').slice(0, 7) === mesRef &&
      p.status !== 'cancelado'
    )
    if (!provisao) return
    const valorPago = parseFloat(pag.amount_total_net || 0)
    const valorProv = parseFloat(provisao.amount_total_net || 0)
    const divergente = Math.abs(valorPago - valorProv) > 0.01
    const hoje = new Date().toISOString().slice(0, 10)
    saveProvisao({
      ...provisao,
      status: 'pago',
      data_baixa: provisao.data_baixa || hoje,
      inconsistencia: divergente,
      inconsistencia_status: divergente ? 'inconsistencia_pendente' : 'sem_inconsistencia',
      notes: divergente
        ? `${provisao.notes ? provisao.notes + '\n' : ''}[Conciliação manual] Valor divergente: recebido ${fmtMoeda(valorPago)} vs provisionado ${fmtMoeda(valorProv)}`
        : provisao.notes,
    })
  }

  // Quando um pagamento vinculado a uma fatura é recebido, a fatura passa
  // pra 'paga' — é ela quem representa a cobrança enviada ao cliente final.
  function marcarFaturaPaga(pag) {
    if (!pag.fatura_id) return
    bulkSetFaturaStatus([pag.fatura_id], 'paga')
  }

  function handleNovoPagamento(pag) {
    const pagComOrigem = { ...pag, origin_type: pag.origin_type || 'manual' }
    savePagamento(pagComOrigem)
    if (pagComOrigem.status === 'pago') { reconciliarProvisao(pagComOrigem); marcarFaturaPaga(pagComOrigem) }
    log('criar', 'pagamento', pag.id, { descricao: `Pagamento criado: ${pag.company_nome || ''} — ${pag.reference_month || ''}` })
  }

  function handleImport(rows, log) {
    setPagamentos(prev => [...prev, ...rows])
    if (log) {
      setFechamentos(prev => { const next = [log, ...prev].slice(0, 60); saveFechamentos(next); return next })
    }
  }

  function gerarTodos() {
    setPagamentos(prev => prev.map(p => !p.processed ? { ...p, processed: true } : p))
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
      {/* ── Navbar fixa no topo ── */}
      <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', zIndex:200,
        display:'flex', gap:2, background:'var(--surface)', borderRadius:'0 0 10px 10px', padding:3,
        border:'1px solid var(--border)', borderTop:'none', boxShadow:'0 2px 12px rgba(0,0,0,0.12)' }}>
        {TABS_PAG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'7px 20px', borderRadius:8, border:'none', cursor:'pointer',
            fontSize:13, fontWeight:tab===t.id?700:500, fontFamily:'var(--font)',
            background:tab===t.id?'var(--accent)':'none',
            color:tab===t.id?'#fff':'var(--text-muted)',
            boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,0.18)':'none',
            transition:'all 0.15s', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'provisoes' && <TabProvisoes />}

      {tab === 'faturas' && <TabFaturas />}

      {tab === 'pagamentos' && <BrowseLayout
        modulo="pagamentos"
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
        extraFilters={
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
              letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:8 }}>
              Período
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'De', value: periododeDe, set: setPeriodoDe },
                { label:'Até', value: periodoAte, set: setPeriodoAte },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
                  <input type="date" value={value} onChange={e => set(e.target.value)}
                    style={{ width:'100%', boxSizing:'border-box', padding:'7px 9px',
                      borderRadius:7, border:'1px solid var(--border)',
                      background:'var(--surface2)', color:'var(--text)',
                      fontSize:12, fontFamily:'var(--mono)', outline:'none' }} />
                </div>
              ))}
            </div>
          </div>
        }
        onNew={() => setNovoPagForm({ ...EMPTY_PAG, reference_month: periododeDe || todayStr, due_date: periododeDe || todayStr })}
        newLabel="Novo Pagamento"
        bulkActions={[
          { label: '✓ Gerar faturas', onClick: ids => setPagamentos(prev => prev.map(p => ids.includes(p.id) ? { ...p, processed: true } : p)) },
          { label: 'Marcar como recebido', onClick: ids => setConfirmBulkModal({ ids }) },
          { label: 'Alterar Status ▾', type:'dropdown', options:
            Object.entries(STATUS_PAGAMENTO).map(([key, cfg]) => ({
              label: cfg.label,
              onClick: ids => {
                if (key === 'pago') { setConfirmBulkModal({ ids }); return }
                setPagamentos(prev => prev.map(p => ids.includes(p.id) ? {...p, status:key} : p))
              },
            }))
          },
          { label: 'Excluir', onClick: ids => {
            if (window.confirm(`Excluir ${ids.length} pagamento(s) permanentemente?`))
              setPagamentos(prev => prev.filter(p => !ids.includes(p.id)))
          }},
        ]}
        onRowClick={p => setDetalheModal(p)}
        bulkEditFields={[
          { key: 'status', label: 'Status', type: 'select',
            options: Object.entries(STATUS_PAGAMENTO).map(([k, v]) => ({ value: k, label: v.label })) },
          { key: 'due_date',        label: 'Vencimento',  type: 'date' },
          { key: 'reference_month', label: 'Competência', type: 'date' },
          { key: 'data_baixa',      label: 'Data da Baixa', type: 'date' },
          { key: 'notes',           label: 'Observações', type: 'textarea' },
        ]}
        onBulkEdit={(ids, changes) => {
          // Mudança para "pago" → intercepta para mostrar confirmação com steps
          if (changes.status === 'pago') {
            setPendingBulkEdit({ ids, changes })
            setConfirmBulkModal({ ids })
            return false // impede o painel de fechar
          }
          // Demais mudanças → aplica direto
          setPagamentos(prev => prev.map(p =>
            ids.includes(p.id) ? { ...p, ...changes } : p
          ))
          ids.forEach(id => {
            const pag = pagamentos.find(p => p.id === id)
            if (pag) savePagamento({ ...pag, ...changes })
          })
        }}
        bulkEditCloseRef={bulkEditCloseRef}
        onImport={() => setImportModal(true)}
        onExportCsv={handleExport}
        extraMenuItems={[
          { label: '📊 Relatório de Fechamento', dividerBefore: true, onClick: () => setFechamentoModal(true) },
        ]}
        emptyState={
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'var(--text-muted)' }}>
            <span style={{ fontSize:28, opacity:0.3 }}>💸</span>
            <span style={{ fontSize:13 }}>Nenhum faturamento encontrado para este período</span>
          </div>
        }
      />}

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
                <FormField label="Empresa" required>
                  <EmpresaSearch
                    value={form.company_id}
                    label={form.company_nome}
                    onChange={(id, nome) => setNovoPagForm(f => {
                      // Trocar de empresa invalida o contrato selecionado se ele
                      // não for dela — evita ficar com contrato de uma empresa e
                      // "empresa" preenchida com outra.
                      const contratoAtual = f.contract_id ? contratos.find(c => c.id === f.contract_id) : null
                      const mantemContrato = contratoAtual && String(contratoAtual.empresa_id) === String(id)
                      return {
                        ...f, company_id: id, company_nome: nome,
                        ...(mantemContrato ? {} : { contract_id: null, contract_numero: '', produto_id: null, produto_nome: '' }),
                      }
                    })}
                  />
                </FormField>
                <FormField label="Nº do contrato" required>
                  <SearchSelect
                    options={(form.company_id ? contratos.filter(c => String(c.empresa_id) === String(form.company_id)) : contratos)
                      .map(c => ({ id: c.id, label: c.numero, sublabel: c.empresa_nome || '' }))}
                    value={form.contract_id || null}
                    placeholder={form.company_id ? 'Buscar contrato desta empresa…' : 'Selecione a empresa primeiro (ou busque por qualquer contrato)…'}
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
                <FormField label="Produto">
                  {(() => {
                    const contratoSel = form.contract_id ? contratos.find(c => c.id === form.contract_id) : null
                    const idsDoContrato = contratoSel
                      ? [...(contratoSel.itens_adesao||[]), ...(contratoSel.itens_mrr||[]), ...(contratoSel.itens_servico||[])]
                          .map(i => String(i.produto_id)).filter(Boolean)
                      : []
                    const opcoesDisponiveis = idsDoContrato.length > 0
                      ? produtosAtivos.filter(p => idsDoContrato.includes(String(p.id)))
                      : produtosAtivos
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

      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onImport={handleImport}
          companies={companies}
          addCompany={addCompany}
          updateCompany={updateCompany}
          contratos={contratos}
          saveContrato={saveContrato}
          pagamentos={pagamentos}
          provisoes={provisoes}
          saveProvisao={saveProvisao}
          produtos={produtosReais}
        />
      )}

      {fechamentoModal && (
        <FechamentoModal fechamentos={fechamentos} onClose={() => setFechamentoModal(false)} />
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

      {/* ── Modal de inconsistências antes do lote ── */}
      {confirmBulkModal && createPortal(
        <ConfirmBulkModal
          ids={confirmBulkModal.ids}
          pagamentos={pagamentos}
          produtosNovo={produtosNovo}
          onCancel={() => {
            setConfirmBulkModal(null)
            setPendingBulkEdit(null)
            // painel fica aberto para o usuário revisar/corrigir
          }}
          onConfirm={(isFechamento) => {
            const { ids } = confirmBulkModal
            setConfirmBulkModal(null)
            setPendingBulkEdit(null)
            bulkEditCloseRef.current?.()
            const inconsistencias = detectarInconsistencias(ids)
            if (inconsistencias.length > 0) {
              setInconsistenciaModal({ itens: inconsistencias, ids, isFechamento })
            } else {
              executarBulkReceber(ids, [], isFechamento)
            }
          }}
        />,
        document.body
      )}

      {inconsistenciaModal && createPortal(
        <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.72)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:9999 }}>
          <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:500,
            boxShadow:'0 24px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}>
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'#FEF3C7', display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⚠</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>Inconsistências encontradas</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  {inconsistenciaModal.itens.length} pagamento(s) com não conformidade antes do lote.
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 24px', maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
              {inconsistenciaModal.itens.map((item, i) => (
                <div key={i} style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8,
                  padding:'9px 12px', fontSize:12, color:'#92400E' }}>
                  <div style={{ fontWeight:600 }}>{item.pag.company_nome || item.pag.contract_numero}</div>
                  <div style={{ marginTop:2, opacity:0.85 }}>{item.motivo}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setInconsistenciaModal(null)}
                style={{ padding:'8px 18px', border:'1px solid var(--border)', borderRadius:8,
                  background:'var(--surface2)', color:'var(--text)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
                Cancelar
              </button>
              <button onClick={() => { const { ids, itens, isFechamento } = inconsistenciaModal; setInconsistenciaModal(null); executarBulkReceber(ids, itens, isFechamento) }}
                style={{ padding:'8px 18px', border:'none', borderRadius:8,
                  background:'#D97706', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                Confirmar mesmo assim
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Progresso de lote ── */}
      {batchProgress && (
        <BatchProgress
          title="Processando pagamentos em lote"
          operations={batchProgress.operations}
          onClose={() => setBatchProgress(null)}
          autoClose={3000}
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
                    As seguintes ações foram executadas automaticamente:
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
                <button onClick={() => confirmarGerarComissao(pag)}
                  style={{ padding:'8px 20px', borderRadius:8, border:'none',
                    background:'#10B981', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  OK, entendido
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
