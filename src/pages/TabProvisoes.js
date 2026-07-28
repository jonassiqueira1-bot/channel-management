import { useState, useMemo, useRef } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useProvisoes } from '../hooks/useProvisoes'
import { useProducts } from '../hooks/useProducts'
import { useCompanies } from '../hooks/useCompanies'
import { useContracts } from '../hooks/useContracts'
import { STATUS_PAGAMENTO } from '../data/mockPagamentos'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import SearchSelect from '../components/SearchSelect'
import EmpresaSearch from '../components/EmpresaSearch'

// ─── Importador CSV ───────────────────────────────────────────────────────────
const IMPORT_BASE_KEYS = [
  'contract_numero','company_nome','company_cnpj','produto_nome','num_documento',
  'data_emissao','parcela','amount_cdu','amount_sms','amount_services','amount_discount',
  'reference_month','due_date','status','notes',
]

function parseCSVProv(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n')
  if (lines.length < 2) return { rows:[] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^﻿/,'').replace(/^"|"$/g,''))
  const rows = lines.slice(1).map(line => {
    const cells = []; let cur='', inQ=false
    for (const ch of line) {
      if (ch==='"') { inQ=!inQ }
      else if (ch===sep && !inQ) { cells.push(cur.trim()); cur='' }
      else cur+=ch
    }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h,i) => [h, cells[i]??'']))
  }).filter(r => Object.values(r).some(v => v))
  return { rows }
}

// `produtoMap` resolve por código ou nome exato (igual ao import de
// Contratos) — sem produto, a provisão fica sem lastro nenhum, por isso é
// obrigatório e precisa bater com um produto cadastrado.
function validateImportRowProv(row, produtoMap) {
  const errors = []
  if (!row.contract_numero?.trim()) errors.push('contract_numero obrigatório')
  if (!row.company_nome?.trim())    errors.push('company_nome obrigatório')
  if (!row.produto_nome?.trim())    errors.push('produto_nome obrigatório — provisão sem produto não é permitida')
  else if (!produtoMap.get(row.produto_nome.trim().toLowerCase()))
    errors.push(`Produto não encontrado: "${row.produto_nome}"`)
  if (!row.reference_month || !/^\d{4}-\d{2}(-\d{2})?$/.test(row.reference_month))
    errors.push('reference_month inválido (AAAA-MM ou AAAA-MM-DD)')
  if (row.status && !STATUS_PAGAMENTO[row.status])
    errors.push(`status inválido: ${row.status}`)
  return errors
}

function dupKey(row) {
  const periodo = (row.reference_month || '').slice(0, 7)
  return `${(row.contract_numero||'').toLowerCase()}|${periodo}|${(row.produto_nome||'').toLowerCase()}`
}

const OV = {
  wrap:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:500,
            display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  modal:  { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:640,
            boxShadow:'0 20px 60px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start',
            padding:'20px 24px 14px', borderBottom:'1px solid var(--border)' },
  footer: { padding:'14px 24px', borderTop:'1px solid var(--border)',
            display:'flex', justifyContent:'flex-end', gap:8 },
  xBtn:   { background:'none', border:'none', color:'var(--text-muted)', fontSize:16,
            cursor:'pointer', padding:'4px 6px', borderRadius:6 },
}

function ImportProvisaoModal({ onClose, provisoes, save, companies, addCompany, updateCompany, contratos, saveContrato, produtos }) {
  const [step, setStep]         = useState('upload')
  const [parsed, setParsed]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState({ current:0, total:0, empresasCriadas:0, contratosCriados:0, empresasPromovidas:0, label:'' })
  const fileRef = useRef(null)

  const produtoMap = useMemo(() => {
    const m = new Map()
    ;(produtos||[]).forEach(p => {
      if (p.codigo) m.set(String(p.codigo).toLowerCase(), p)
      if (p.nome) m.set(String(p.nome).toLowerCase(), p)
    })
    return m
  }, [produtos])

  // Índice de duplicatas existentes no banco
  const existingKeys = useMemo(() => {
    const s = new Set()
    ;(provisoes||[]).forEach(p => {
      const periodo = (p.reference_month||'').slice(0,7)
      s.add(`${(p.contract_numero||'').toLowerCase()}|${periodo}|${(p.produto_nome||'').toLowerCase()}`)
    })
    return s
  }, [provisoes])

  function handleDownloadTemplate() {
    const example = ['CTR-2026-001','Nexus Tech','12.345.678/0001-99','Produto SaaS','NF100200','2026-07-01','1/1','0','890','0','0','2026-07-01','2026-07-31','pendente','']
    const csv = ['﻿'+IMPORT_BASE_KEYS.join(';'), example.join(';')].join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='template_provisoes.csv'; a.click()
  }

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows } = parseCSVProv(e.target.result)
      // Detecta duplicatas dentro do próprio arquivo
      const seenInFile = new Set()
      const rowResults = rows.map((row, i) => {
        const errors = validateImportRowProv(row, produtoMap)
        const key = dupKey(row)
        const dupInFile = seenInFile.has(key)
        const dupInDB   = existingKeys.has(key)
        if (!dupInFile && !dupInFile) seenInFile.add(key)
        const isDup = dupInFile || dupInDB
        return { row, errors, ok: errors.length===0 && !isDup, line:i+2,
                 dupInFile, dupInDB, isDup }
      })
      setParsed({ fileName:file.name, rowResults })
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleConfirmImport() {
    const okRows = parsed.rowResults.filter(r=>r.ok)
    const total  = okRows.length
    setProgress({ current:0, total, empresasCriadas:0, contratosCriados:0, label:'Preparando…' })
    setStep('importing')

    const compByName = {}; const compByCnpj = {}
    ;(companies||[]).forEach(c => {
      const n=(c.fantasia||c.razao||'').toLowerCase(); if(n) compByName[n]=c
      if(c.cnpj) compByCnpj[c.cnpj.replace(/\D/g,'')]=c
    })
    const ctrByNum = {}
    ;(contratos||[]).forEach(c => { if(c.numero) ctrByNum[c.numero.toLowerCase()]=c })
    const createdComp={}, createdCtr={}
    let empresasCriadas=0, contratosCriados=0

    async function resolveEmpresa(nome, cnpj) {
      const key = nome.toLowerCase()
      const cnpjClean = (cnpj||'').replace(/\D/g,'')
      if(cnpjClean && compByCnpj[cnpjClean]) return compByCnpj[cnpjClean].id
      if(compByName[key]) return compByName[key].id
      if(createdComp[key]) return createdComp[key]
      const result = await addCompany({ razao:nome, fantasia:nome, cnpj:cnpj||'', tipo:'rascunho' })
      if(result?.ok && result?.data?.id) { createdComp[key]=result.data.id; empresasCriadas++; return result.data.id }
      return null
    }

    // Slot do produto — mesmo mapeamento de Contratos.js (CATEGORIA_POR_TIPO):
    // saas → mrr; licença/hardware → adesão; serviço/consultoria → serviço.
    function slotDoProduto(produto) {
      const t = (produto?.tipo || '').toLowerCase()
      if (t === 'saas') return 'mrr'
      if (t === 'servico' || t === 'consultoria') return 'servico'
      return 'adesao'
    }

    // Contrato criado pela importação de Provisões nunca pode ficar sem
    // produto — usa o próprio produto/valor da linha de provisão como item
    // único do contrato (no slot correspondente ao tipo do produto).
    function buildItemDoContrato(row) {
      const produto = produtoMap.get((row.produto_nome||'').trim().toLowerCase())
      const valor = (parseFloat(row.amount_cdu)||0) + (parseFloat(row.amount_sms)||0) + (parseFloat(row.amount_services)||0)
      const item = {
        produto_id: produto?.id || null, nome: produto?.nome || row.produto_nome,
        tipo_produto: produto?.tipo || null, quantidade: 1,
        valor: valor || produto?.preco || 0, tabela: produto?.preco || null,
        desconto_pct: 0, desconto_autorizado: false, status_item: 'ativo',
        vencimento_primeiro_pagamento: '',
      }
      const slot = slotDoProduto(produto)
      return { item, slot }
    }

    async function resolveContrato(numero, companyId, companyNome, row) {
      const key = numero.toLowerCase()
      if(ctrByNum[key]) return ctrByNum[key].id
      if(createdCtr[key]) return createdCtr[key]
      const { item, slot } = buildItemDoContrato(row)
      const itensPorSlot = { adesao: [], mrr: [], servico: [] }
      itensPorSlot[slot] = [item]
      const result = await saveContrato({
        numero, empresa_id:companyId, empresa_nome:companyNome,
        status:'ativo', vigencia_inicio:'', vigencia_fim:'',
        itens:[item], itens_adesao:itensPorSlot.adesao, itens_mrr:itensPorSlot.mrr, itens_servico:itensPorSlot.servico,
        responsavel:'', observacoes:'', origem:'', opportunity_id:null, opportunity_titulo:'', inconsistencia_status:'sem_inconsistencia',
      })
      if(result?.ok) {
        const id = result?.data?.id || key
        createdCtr[key]=id; contratosCriados++; return id
      }
      return null
    }

    let imported = 0
    const empresasTocadas = new Set()
    for (let i=0; i<okRows.length; i++) {
      const { row } = okRows[i]
      setProgress({ current:i+1, total, empresasCriadas, contratosCriados, label:`${row.company_nome} — ${row.contract_numero}` })
      const company_id  = await resolveEmpresa(row.company_nome, row.company_cnpj)
      const contract_id = await resolveContrato(row.contract_numero, company_id, row.company_nome, row)
      if (company_id) empresasTocadas.add(company_id)
      const periodo = row.reference_month.length === 7 ? row.reference_month + '-01' : row.reference_month
      const cdu = parseFloat(row.amount_cdu)||0
      const sms = parseFloat(row.amount_sms)||0
      const srv = parseFloat(row.amount_services)||0
      const dsc = parseFloat(row.amount_discount)||0
      // Mesmo item que vai pro contrato (buildItemDoContrato) — a provisão
      // em si também precisa guardar `itens`, não só o contrato que ela
      // ajudou a criar, senão a cadeia Contrato/Provisão/Pagamento fica
      // com formatos diferentes de produto.
      const { item: itemProvisao } = buildItemDoContrato(row)
      const res = await save({
        company_id, company_nome:row.company_nome,
        contract_id, contract_numero:row.contract_numero,
        produto_id: itemProvisao.produto_id, produto_nome: row.produto_nome||'',
        itens: [itemProvisao],
        num_documento:row.num_documento||'', data_emissao:row.data_emissao||'',
        parcela:row.parcela||'1/1',
        amount_cdu:cdu, amount_sms:sms, amount_services:srv, amount_discount:dsc,
        amount_total_net:cdu+sms+srv-dsc,
        reference_month:periodo, due_date:row.due_date||periodo,
        status:STATUS_PAGAMENTO[row.status]?row.status:'pendente',
        notes:row.notes||'', processed:false,
        inconsistencia_status:'sem_inconsistencia',
      })
      if (res?.ok) imported++
    }

    // Toda empresa tocada aqui ganhou (ou já tinha) um contrato ativo — vira
    // Cliente Final, igual ao import de Contratos.
    let empresasPromovidas = 0
    for (const id of empresasTocadas) {
      const emp = companies.find(c => c.id === id)
      if (emp && emp.tipo === 'cliente_final') continue
      const r = await updateCompany(id, { tipo: 'cliente_final' })
      if (r?.ok !== false) empresasPromovidas++
    }

    setProgress(p=>({...p, current:imported, empresasCriadas, contratosCriados, empresasPromovidas, label:'Concluído!'}))
    setStep('done')
  }

  const okCount  = parsed?.rowResults.filter(r=>r.ok).length??0
  const errCount = parsed?.rowResults.filter(r=>!r.ok && !r.isDup).length??0
  const dupCount = parsed?.rowResults.filter(r=>r.isDup).length??0
  const impBox   = { border:'2px dashed var(--border)', borderRadius:12, padding:32,
    textAlign:'center', cursor:'pointer', transition:'border-color 0.2s, background 0.2s',
    background:dragging?'var(--accent-glow)':'var(--surface2)',
    borderColor:dragging?'var(--accent)':'var(--border)' }

  return (
    <div style={OV.wrap} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={OV.modal}>
        <div style={OV.header}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Importar Provisões</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {step==='upload'    && 'CSV com separador ponto-e-vírgula (;) — UTF-8'}
              {step==='preview'   && `${parsed?.fileName} — ${okCount} válidos${dupCount>0?`, ${dupCount} duplicados`:''}${errCount>0?`, ${errCount} com erro`:''}`}
              {step==='importing' && `Processando ${progress.current} de ${progress.total}…`}
              {step==='done'      && 'Importação concluída'}
            </div>
          </div>
          <button style={OV.xBtn} onClick={onClose}>✕</button>
        </div>

        {step==='upload' && (
          <div style={{ padding:24 }}>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Template CSV</span>
                <button onClick={handleDownloadTemplate}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                    background:'var(--accent)', color:'#fff', border:'none', borderRadius:7,
                    fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                  ⬇ Baixar template
                </button>
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', overflowX:'auto', whiteSpace:'nowrap' }}>
                {IMPORT_BASE_KEYS.join(' · ')}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, lineHeight:1.6 }}>
                <b>produto_nome é obrigatório</b> e precisa bater com um produto cadastrado (código ou nome exato)
                — provisão sem produto não é permitida. Empresa resolvida por CNPJ/nome (cria automaticamente se não existir)
                e contrato resolvido por <code>contract_numero</code> (cria automaticamente, sempre ativo, com o próprio produto
                da linha como item). Empresa nova ou já cadastrada com contrato ativo vira tipo <b>Cliente Final</b>.
              </div>
            </div>
            <div style={impBox}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);processFile(e.dataTransfer.files[0])}}>
              <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Arraste o arquivo CSV aqui</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>ou clique para selecionar</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
                onChange={e=>processFile(e.target.files[0])} />
            </div>
          </div>
        )}

        {step==='preview' && parsed && (
          <div style={{ padding:'0 0 4px' }}>
            <div style={{ maxHeight:380, overflowY:'auto' }}>
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
                        {r.row.produto_nome && <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>{r.row.produto_nome}</span>}
                      </div>
                      {r.isDup && (
                        <div style={{ fontSize:11, color:'#F59E0B', marginTop:2 }}>
                          {r.dupInDB ? 'Duplicado — já existe em Provisões' : 'Duplicado — repetido no próprio arquivo'}
                        </div>
                      )}
                      {!r.ok && !r.isDup && <div style={{ fontSize:11, color:'#EF4444', marginTop:2 }}>{r.errors.join(' · ')}</div>}
                    </div>
                    {r.ok && (
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', flexShrink:0 }}>
                        {(() => { const t=(parseFloat(r.row.amount_cdu||0)+parseFloat(r.row.amount_sms||0)+parseFloat(r.row.amount_services||0)-parseFloat(r.row.amount_discount||0)); return t>0?`R$ ${t.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'' })()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {step==='importing' && (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚙️</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{progress.label}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>{progress.current} / {progress.total} registros</div>
            <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
              <div style={{ height:'100%', background:'var(--accent)', borderRadius:3,
                width:`${progress.total>0?Math.round(progress.current/progress.total*100):0}%`,
                transition:'width 0.3s ease' }} />
            </div>
            {(progress.empresasCriadas>0||progress.contratosCriados>0) && (
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>
                {progress.empresasCriadas>0 && `${progress.empresasCriadas} empresa(s) criada(s)`}
                {progress.empresasCriadas>0 && progress.contratosCriados>0 && ' · '}
                {progress.contratosCriados>0 && `${progress.contratosCriados} contrato(s) criado(s)`}
              </div>
            )}
          </div>
        )}

        {step==='done' && (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
              {progress.current} provisão{progress.current!==1?'ões':''} importada{progress.current!==1?'s':''}
            </div>
            {(progress.empresasCriadas>0||progress.contratosCriados>0||progress.empresasPromovidas>0) && (
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                {progress.empresasCriadas>0 && `${progress.empresasCriadas} empresa(s) criada(s)`}
                {progress.empresasCriadas>0 && progress.contratosCriados>0 && ' · '}
                {progress.contratosCriados>0 && `${progress.contratosCriados} contrato(s) criado(s)`}
                {(progress.empresasCriadas>0||progress.contratosCriados>0) && progress.empresasPromovidas>0 && ' · '}
                {progress.empresasPromovidas>0 && `${progress.empresasPromovidas} empresa(s) promovida(s) a Cliente Final`}
              </div>
            )}
          </div>
        )}

        <div style={OV.footer}>
          {step==='upload'    && <button onClick={onClose} style={{ padding:'8px 18px', background:'var(--surface2)', color:'var(--text-soft)', border:'1px solid var(--border)', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>Cancelar</button>}
          {step==='preview'   && <>
            <button onClick={()=>setStep('upload')} style={{ padding:'8px 18px', background:'var(--surface2)', color:'var(--text-soft)', border:'1px solid var(--border)', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>← Voltar</button>
            <button disabled={okCount===0} onClick={handleConfirmImport}
              style={{ padding:'8px 20px', background:okCount===0?'var(--border)':'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:okCount===0?'not-allowed':'pointer', fontFamily:'var(--font)', opacity:okCount===0?0.5:1 }}>
              Importar {okCount} provisão{okCount!==1?'ões':''}
            </button>
          </>}
          {step==='importing' && <span style={{ fontSize:12, color:'var(--text-muted)' }}>Aguarde…</span>}
          {step==='done'      && <button onClick={onClose} style={{ padding:'8px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>Fechar</button>}
        </div>
      </div>
    </div>
  )
}

const ACCENT = 'var(--accent)'
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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
  if (!dateStr) return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
  const [y, m] = dateStr.split('-')
  return { year: Number(y), month: Number(m) }
}
function periodoLabel({ month, year }) {
  return `${MESES[month - 1]}/${year}`
}

function valorPorTipo(prod) {
  if (!prod || !prod.preco) return {}
  const v = parseFloat(prod.preco) || 0
  const t = (prod.tipo || '').toLowerCase()
  if (t === 'saas')    return { amount_sms: v, amount_cdu: 0, amount_services: 0 }
  if (t === 'licenca') return { amount_cdu: v, amount_sms: 0, amount_services: 0 }
  return { amount_services: v, amount_cdu: 0, amount_sms: 0 }
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_PAGAMENTO[status] || STATUS_PAGAMENTO.pendente
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:cfg.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

const EMPTY_PROV = {
  contract_numero: '', company_nome: '', company_id: null,
  reference_month: new Date().toISOString().slice(0, 7) + '-01',
  amount_cdu: 0, amount_sms: 0, amount_services: 0, amount_discount: 0,
  due_date: '', status: 'pendente', notes: '',
  produto_id: null, produto_nome: '',
  num_documento: '', data_emissao: '', parcela: '',
  inconsistencia_status: 'sem_inconsistencia',
  // Mais de um produto por provisão — mesma estrutura de itens usada em
  // Contratos/Pagamentos (ver TabFaturas.js / usePayments.js).
  itens: [],
}

function tipoLabelCurto(tipo) {
  if (tipo === 'saas')    return 'MENSAL'
  if (tipo === 'licenca') return 'LICENÇA'
  return 'SERVIÇO'
}

const INCONSISTENCIA_OPTS = [
  { value: 'sem_inconsistencia', label: 'Sem inconsistência',       color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  { value: 'pendente',           label: 'Inconsistência pendente',  color: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
  { value: 'em_analise',         label: 'Inconsistência em análise',color: '#3B82F6', bg: '#DBEAFE', text: '#1E40AF' },
  { value: 'fechada',            label: 'Inconsistência fechada',   color: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
]

function InconsistenciaBadge({ value }) {
  const opt = INCONSISTENCIA_OPTS.find(o => o.value === value) || INCONSISTENCIA_OPTS[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:opt.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:opt.color, flexShrink:0 }} />
      {opt.label}
    </span>
  )
}

const FILTERS_DEF = [
  { key: 'status', label: 'Status', options: Object.entries(STATUS_PAGAMENTO).map(([k,v]) => ({ value:k, label:v.label })) },
  { key: 'inconsistencia_status', label: 'Inconsistência', options: INCONSISTENCIA_OPTS.map(o => ({ value:o.value, label:o.label })) },
]

// ─── Formulário de detalhe / edição ──────────────────────────────────────────
function ProvisaoDetail({ provisao, onSave, saveRef }) {
  const { produtos: produtosRaw } = useProducts()
  const prodList = produtosRaw.filter(p => p.status === 'ativo')

  const [form, setForm] = useState({
    amount_cdu:            provisao.amount_cdu            || 0,
    amount_sms:            provisao.amount_sms            || 0,
    amount_services:       provisao.amount_services       || 0,
    amount_discount:       provisao.amount_discount       || 0,
    status:                provisao.status                || 'pendente',
    due_date:              provisao.due_date              || '',
    data_emissao:          provisao.data_emissao          || '',
    data_baixa:            provisao.data_baixa            || '',
    num_documento:         provisao.num_documento         || '',
    valor_recebido:        provisao.valor_recebido        ?? '',
    parcela:               provisao.parcela               || '',
    produto_id:            provisao.produto_id            || '',
    produto_nome:          provisao.produto_nome          || '',
    notes:                 provisao.notes                 || '',
    inconsistencia_status: provisao.inconsistencia_status || 'sem_inconsistencia',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function numVal(k) {
    return {
      type: 'text', inputMode: 'numeric',
      value: form[k] !== '' && form[k] !== null
        ? Number(form[k]).toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '',
      placeholder: '0,00',
      onChange: e => {
        const r = e.target.value.replace(/\./g,'').replace(',','.')
        set(k, isNaN(parseFloat(r)) ? '' : parseFloat(r))
      },
    }
  }

  function handleSave() {
    const built = {
      ...provisao,
      ...form,
      amount_total_net: Math.max(0,
        (Number(form.amount_cdu)||0) + (Number(form.amount_sms)||0) +
        (Number(form.amount_services)||0) - (Number(form.amount_discount)||0)
      ),
      valor_recebido: form.valor_recebido !== '' ? Number(form.valor_recebido)||0 : null,
      produto_id: form.produto_id || null,
    }
    onSave(built)
  }

  if (saveRef) saveRef.current = handleSave

  const bruto   = (Number(form.amount_cdu)||0) + (Number(form.amount_sms)||0) + (Number(form.amount_services)||0)
  const liquido = Math.max(0, bruto - (Number(form.amount_discount)||0))
  const rInp    = { paddingLeft: 28, fontFamily:'var(--mono)', fontWeight:600 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <FormSection label="Identificação" />
      <FormGrid cols={2}>
        <FormField label="Status">
          <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_PAGAMENTO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </FormField>
        <FormField label="Inconsistência">
          <select className="so-field" value={form.inconsistencia_status}
            onChange={e => set('inconsistencia_status', e.target.value)}>
            {INCONSISTENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Produto">
          <SearchSelect
            options={prodList.map(p => ({ id: String(p.id), label: p.nome, sublabel: p.codigo || '' }))}
            value={form.produto_id ? String(form.produto_id) : ''}
            placeholder="Pesquisar produto…"
            onChange={id => {
              const prod = prodList.find(p => String(p.id) === id)
              setForm(f => ({ ...f, produto_id: id || '', produto_nome: prod?.nome || '', ...valorPorTipo(prod) }))
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
            { k:'amount_cdu',      label:'Licença',     color:'var(--accent)' },
            { k:'amount_sms',      label:'Mensalidade', color:'#3B82F6' },
            { k:'amount_services', label:'Serviços',    color:'#10B981' },
          ].map(({ k, label }) => (
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
            textTransform:'uppercase', letterSpacing:'0.06em' }}>Total previsto</span>
          <span style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)',
            color: liquido > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
            {fmtMoeda(liquido)}
          </span>
        </div>
      </div>

      <FormSection label="Datas" />
      <FormGrid cols={2}>
        <FormField label="Competência">
          <input className="so-field" value={provisao.reference_month ? periodoLabel(parsePeriodo(provisao.reference_month)) : '—'} readOnly disabled style={{ fontFamily:'var(--mono)' }} />
        </FormField>
        <FormField label="Vencimento previsto">
          <input type="date" className="so-field" value={form.due_date}
            onChange={e => set('due_date', e.target.value)} />
        </FormField>
      </FormGrid>

      <FormSection label="Origem" />
      <FormGrid cols={2}>
        <FormField label="Empresa">
          <input className="so-field" value={provisao.company_nome || ''} readOnly disabled />
        </FormField>
        <FormField label="Contrato">
          <input className="so-field" value={provisao.contract_numero || '—'} readOnly disabled style={{ fontFamily:'var(--mono)' }} />
        </FormField>
      </FormGrid>

      <FormSection label="Observações" />
      <div style={{ padding:'0 24px 16px' }}>
        <textarea className="so-field" rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Anotações sobre esta provisão…" style={{ resize:'vertical', minHeight:70 }} />
      </div>
    </div>
  )
}

// ─── Formulário novo ──────────────────────────────────────────────────────────
function NovaProvisaoForm({ form, onChange }) {
  const { produtos: produtosRaw } = useProducts()
  const { companies } = useCompanies()
  const { contratos } = useContracts()
  const prodList = produtosRaw.filter(p => p.status === 'ativo')
  function set(k, v) { onChange({ ...form, [k]: v }) }

  const [itemQuery, setItemQuery] = useState('')
  const [itemOpen,  setItemOpen]  = useState(false)

  const contratosDisponiveis = contratos.filter(c =>
    c.status === 'ativo' &&
    (!form.company_id || String(c.empresa_id) === String(form.company_id))
  )

  const contratoSelecionado = form.contract_id
    ? contratos.find(c => String(c.id) === String(form.contract_id))
    : null

  // Produtos ativos do contrato selecionado (cruzando itens com catálogo)
  const produtosDoContrato = contratoSelecionado
    ? (contratoSelecionado.itens || [])
        .map(item => prodList.find(p => String(p.id) === String(item.produto_id)))
        .filter(Boolean)
    : []

  const itens = form.itens || []
  const idsJaAdicionados = itens.map(i => String(i.produto_id))
  // Lista de produtos disponíveis pra adicionar: do contrato se houver, senão todos ativos
  const opcoesDisponiveis = (produtosDoContrato.length > 0 ? produtosDoContrato : prodList)
    .filter(p => !idsJaAdicionados.includes(String(p.id)))

  const cdu      = itens.filter(i => i.tipo_produto === 'licenca').reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
  const sms      = itens.filter(i => i.tipo_produto === 'saas').reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
  const services = itens.filter(i => !['licenca','saas'].includes(i.tipo_produto)).reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
  const discount = parseFloat(form.amount_discount) || 0
  const liquido  = Math.max(0, cdu + sms + services - discount)

  function addItemProv(prod) {
    const itemContrato = (contratoSelecionado?.itens || []).find(i => String(i.produto_id) === String(prod.id))
    onChange({
      ...form,
      itens: [...itens, {
        produto_id: prod.id, nome: prod.nome, tipo_produto: prod.tipo || null,
        quantidade: 1, valor: itemContrato ? parseFloat(itemContrato.valor)||0 : parseFloat(prod.preco)||0,
        desconto_pct: 0,
      }],
    })
    setItemQuery(''); setItemOpen(false)
  }
  function removeItemProv(idx) {
    onChange({ ...form, itens: itens.filter((_, i) => i !== idx) })
  }
  function updateItemValorProv(idx, valor) {
    onChange({ ...form, itens: itens.map((it, i) => i === idx ? { ...it, valor } : it) })
  }

  function numVal(k) {
    return {
      type:'text', inputMode:'numeric',
      value: form[k] ? Number(form[k]).toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '',
      placeholder:'0,00',
      onChange: e => {
        const r = e.target.value.replace(/\./g,'').replace(',','.')
        set(k, isNaN(parseFloat(r)) ? 0 : parseFloat(r))
      },
    }
  }

  const rInp = { paddingLeft: 28, fontFamily:'var(--mono)', fontWeight:600 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <FormSection label="Empresa / Contrato" />
      <FormGrid cols={2}>
        <FormField label="Empresa" span={2}>
          <EmpresaSearch
            companies={companies}
            value={form.company_id}
            displayValue={form.company_nome}
            onChange={(id, nome) => onChange({ ...form, company_id: id, company_nome: nome })}
            placeholder="Pesquisar empresa…"
          />
        </FormField>
        <FormField label="Contrato">
          <SearchSelect
            options={contratosDisponiveis.map(c => ({
              id: String(c.id),
              label: c.numero || `Contrato #${c.id}`,
              sublabel: c.empresa_nome || '',
            }))}
            value={form.contract_id ? String(form.contract_id) : ''}
            placeholder={form.company_id ? 'Selecionar contrato…' : 'Selecione a empresa primeiro'}
            onChange={id => {
              const ctr = contratosDisponiveis.find(c => String(c.id) === id)
              onChange({
                ...form,
                contract_id:     id || null,
                contract_numero: ctr?.numero || '',
                // Contrato mudou — a lista de itens anterior pode não pertencer a ele.
                itens: [],
              })
            }}
          />
        </FormField>
      </FormGrid>

      <FormSection label="Produtos" />
      <div style={{ margin:'0 24px 4px', border:'1px solid var(--border)', borderRadius:9, overflow:'hidden' }}>
        {itens.map((item, idx) => (
          <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 90px 28px', gap:6, alignItems:'center',
            padding:'8px 12px', borderBottom: idx < itens.length - 1 ? '1px solid var(--border)' : 'none', background:'var(--surface)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, overflow:'hidden' }}>
              <span style={{ fontSize:9, fontWeight:700, fontFamily:'var(--mono)', padding:'2px 6px', borderRadius:4,
                whiteSpace:'nowrap', flexShrink:0, background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                {tipoLabelCurto(item.tipo_produto)}
              </span>
              <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.nome}</span>
            </div>
            <input type="number" min="0" step="0.01"
              style={{ width:'100%', padding:'4px 6px', borderRadius:5, border:'1px solid var(--border)', fontSize:11,
                fontFamily:'var(--mono)', fontWeight:600, color:'var(--text)', background:'var(--surface2)', boxSizing:'border-box', outline:'none' }}
              value={item.valor} onChange={e => updateItemValorProv(idx, e.target.value)} placeholder="0" />
            <button type="button" onClick={() => removeItemProv(idx)}
              style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>✕</button>
          </div>
        ))}
        <div style={{ position:'relative', padding:'6px 10px', background:'var(--surface2)',
          borderTop: itens.length > 0 ? '1px solid var(--border)' : 'none' }}>
          <input
            style={{ width:'100%', padding:'5px 10px', borderRadius:6, border:'1px dashed var(--border)', fontSize:12,
              color:'var(--text-muted)', background:'transparent', outline:'none', boxSizing:'border-box', fontFamily:'var(--font)' }}
            placeholder={produtosDoContrato.length > 0 ? '+ Adicionar produto do contrato…' : '+ Adicionar produto…'}
            value={itemQuery}
            onChange={e => { setItemQuery(e.target.value); setItemOpen(true) }}
            onFocus={() => setItemOpen(true)}
          />
          {itemOpen && opcoesDisponiveis.length > 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 2px)', left:10, right:10, background:'var(--surface)',
              border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:200, overflow:'hidden', maxHeight:240, overflowY:'auto' }}>
              {opcoesDisponiveis
                .filter(p => !itemQuery || p.nome.toLowerCase().includes(itemQuery.toLowerCase()))
                .map(p => (
                  <button type="button" key={p.id}
                    style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'7px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
                    onMouseDown={() => addItemProv(p)}>
                    <span style={{ fontSize:9, fontWeight:700, fontFamily:'var(--mono)', padding:'2px 6px', borderRadius:4,
                      whiteSpace:'nowrap', flexShrink:0, background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                      {tipoLabelCurto(p.tipo)}
                    </span>
                    <span style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{p.nome}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{p.codigo} · {fmtMoeda(p.preco)}</div>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <FormSection label="Valores" />
      <div style={{ padding:'0 24px 16px', display:'flex', flexDirection:'column', gap:12 }}>
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
            textTransform:'uppercase', letterSpacing:'0.06em' }}>Total previsto</span>
          <span style={{ fontSize:22, fontWeight:800, fontFamily:'var(--mono)',
            color: liquido > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
            {fmtMoeda(liquido)}
          </span>
        </div>
      </div>

      <FormSection label="Datas" />
      <FormGrid cols={2}>
        <FormField label="Competência">
          <input type="month" className="so-field"
            value={form.reference_month ? form.reference_month.slice(0,7) : ''}
            onChange={e => set('reference_month', e.target.value ? e.target.value + '-01' : '')} />
        </FormField>
        <FormField label="Vencimento previsto">
          <input type="date" className="so-field" value={form.due_date}
            onChange={e => set('due_date', e.target.value)} />
        </FormField>
      </FormGrid>

      <FormSection label="Controle" />
      <FormGrid cols={2}>
        <FormField label="Status">
          <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_PAGAMENTO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </FormField>
        <FormField label="Inconsistência">
          <select className="so-field" value={form.inconsistencia_status}
            onChange={e => set('inconsistencia_status', e.target.value)}>
            {INCONSISTENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </FormGrid>

      <FormSection label="Observações" />
      <div style={{ padding:'0 24px 16px' }}>
        <textarea className="so-field" rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Anotações sobre esta provisão…" style={{ resize:'vertical', minHeight:70 }} />
      </div>
    </div>
  )
}

// ─── TabProvisoes ─────────────────────────────────────────────────────────────
export default function TabProvisoes() {
  const { provisoes, save, removeMany, bulkSetStatus } = useProvisoes()
  const { companies, add: addCompany, update: updateCompany } = useCompanies()
  const { contratos, save: saveContrato } = useContracts()
  const { produtos } = useProducts()

  const [search,                  setSearch]                  = useLocalState('provisoes:search', '')
  const [filtroStatus,            setFiltroStatus]            = useLocalState('provisoes:filtroStatus', '')
  const [filtroInconsistencia,    setFiltroInconsistencia]    = useLocalState('provisoes:filtroInconsistencia', '')
  const [periododeDe,   setPeriodoDe]     = useLocalState('provisoes:filtroDe', '')
  const [periodoAte,    setPeriodoAte]    = useLocalState('provisoes:filtroAte', '')

  const [detalhe,      setDetalhe]      = useState(null)
  const [novaForm,     setNovaForm]     = useState(null)
  const [savingNova,   setSavingNova]   = useState(false)
  const [importModal,  setImportModal]  = useState(false)
  const saveRef = useRef(null)

  const now          = new Date()
  const todayStr     = now.toISOString().slice(0, 10)

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return provisoes.filter(p => {
      if (filtroStatus && p.status !== filtroStatus) return false
      if (filtroInconsistencia && p.inconsistencia_status !== filtroInconsistencia) return false
      const ref = (p.reference_month || p.due_date || '').slice(0, 10)
      if (periododeDe && ref < periododeDe) return false
      if (periodoAte  && ref > periodoAte)  return false
      if (q && !p.company_nome.toLowerCase().includes(q) &&
               !(p.contract_numero||'').toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
  }, [provisoes, search, filtroStatus, periododeDe, periodoAte])

  const activeFilters = {
    status:                filtroStatus         ? [filtroStatus]         : [],
    inconsistencia_status: filtroInconsistencia ? [filtroInconsistencia] : [],
  }
  function handleFilterChange(f) {
    setFiltroStatus(f.status?.[0] || '')
    setFiltroInconsistencia(f.inconsistencia_status?.[0] || '')
  }

  async function handleSaveDetalhe(updated) {
    await save(updated)
    setDetalhe(null)
  }

  async function handleSaveNova() {
    const form = novaForm
    if (!form) return
    if (!form.company_nome?.trim()) return alert('Empresa é obrigatória')
    if (!(form.itens||[]).length) return alert('Adicione ao menos um produto')
    setSavingNova(true)
    const itens = form.itens
    const primeiroItem = itens[0]
    // Soma os itens nos 3 baldes por tipo — mesma distribuição de Pagamentos/Contratos.
    const amount_cdu      = itens.filter(i => i.tipo_produto === 'licenca').reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
    const amount_sms      = itens.filter(i => i.tipo_produto === 'saas').reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
    const amount_services = itens.filter(i => !['licenca','saas'].includes(i.tipo_produto)).reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
    const amount_discount = Number(form.amount_discount) || 0
    const novo = {
      ...form,
      produto_id:   primeiroItem.produto_id || null,
      produto_nome: primeiroItem.nome || '',
      amount_cdu, amount_sms, amount_services, amount_discount,
      amount_total_net: Math.max(0, amount_cdu + amount_sms + amount_services - amount_discount),
    }
    const res = await save(novo)
    setSavingNova(false)
    if (res.ok) setNovaForm(null)
    else alert('Erro ao salvar: ' + res.message)
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpisNode = (data) => {
    const total    = data.length
    const previsto = data.reduce((s,p) => s + (p.amount_total_net||0), 0)
    const emAberto = data.filter(p => p.status === 'pendente' || p.status === 'vencido')
                         .reduce((s,p) => s + (p.amount_total_net||0), 0)
    const recebido = data.filter(p => p.status === 'pago').length
    // "Virou o mês e ninguém olhou pra isso ainda" — vencida (due_date no
    // passado) E ainda sem nenhuma inconsistência registrada, ou seja, nem
    // foi conciliada (pagamento bateu) nem foi flagada manualmente. É o
    // indicador que a pergunta original pedia: provisões que passaram batido.
    const vencidasSemConciliar = data.filter(p =>
      p.status !== 'pago' && p.due_date && p.due_date < todayStr && p.inconsistencia_status === 'sem_inconsistencia'
    ).length
    return (
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', padding:'8px 0' }}>
        {[
          { label:'Provisões',       value:total,              color:'var(--text)' },
          { label:'Recebidas',       value:recebido,           color:'#10B981' },
          { label:'Total previsto',  value:fmtMoeda(previsto), color:ACCENT,     mono:true },
          { label:'Em aberto',       value:fmtMoeda(emAberto), color:'#EF4444',  mono:true },
          { label:'Vencidas sem conciliação', value:vencidasSemConciliar, color: vencidasSemConciliar > 0 ? '#EF4444' : 'var(--text-muted)' },
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

  // ── Colunas ────────────────────────────────────────────────────────────────
  const hoje = todayStr
  const columns = [
    {
      key: 'company_nome', label: 'Empresa / Contrato',
      render: (val, row) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:`${ACCENT}18`,
            color:ACCENT, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:10, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
            border:`1px solid ${ACCENT}30` }}>
            {(val||'?').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{val || '—'}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
              {row.contract_numero}
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
    { key:'amount_cdu',       label:'Licença',      render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'var(--accent)' }}>{fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_sms',       label:'Mensalidade',  render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'#3B82F6' }}>{fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_services',  label:'Serviços',     render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'#10B981' }}>{fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_discount',  label:'Desconto',     render: v => v>0 ? <span style={{ fontFamily:'var(--mono)', fontWeight:600, fontSize:12, color:'#EF4444' }}>↓ {fmtMoeda(v)}</span> : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span> },
    { key:'amount_total_net', label:'Total previsto', render: v => <span style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:14, color:'var(--text)' }}>{fmtMoeda(v)}</span> },
    {
      key:'due_date', label:'Vencimento',
      render: (v, row) => {
        const atras = row.status !== 'pago' && v && v < hoje
        return <span style={{ fontFamily:'var(--mono)', fontSize:12, whiteSpace:'nowrap',
          color: atras ? '#EF4444' : 'var(--text-soft)' }}>{atras ? '⚠ ' : ''}{fmtData(v)}</span>
      },
    },
    { key:'reference_month', label:'Competência', render: v => <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-soft)' }}>{v ? periodoLabel(parsePeriodo(v)) : '—'}</span> },
    { key:'status', label:'Status', render: (v, row) => (
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <StatusBadge status={v} />
        {row.percentual_baixa != null && row.percentual_baixa < 99.5 && row.percentual_baixa > 0 && (
          <span style={{ fontSize:9, fontWeight:700, fontFamily:'var(--mono)', color:'#D97706' }}>
            {row.percentual_baixa}% baixado
          </span>
        )}
      </div>
    )},
    { key:'inconsistencia_status', label:'Inconsistência', render: v => <InconsistenciaBadge value={v} /> },
  ]

  return (
    <>
      <BrowseLayout
        modulo="pagamentos"
        data={lista}
        columns={columns}
        keyField="id"
        storageKey="provisoes_browse"
        kpis={kpisNode}
        kpisLabel="Indicadores"
        search={search}
        onSearchChange={setSearch}
        filters={FILTERS_DEF}
        activeFilters={activeFilters}
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
              ].map(({ label, value, set: setVal }) => (
                <div key={label}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
                  <input type="date" value={value} onChange={e => setVal(e.target.value)}
                    style={{ width:'100%', boxSizing:'border-box', padding:'7px 9px',
                      borderRadius:7, border:'1px solid var(--border)',
                      background:'var(--surface2)', color:'var(--text)',
                      fontSize:12, fontFamily:'var(--mono)', outline:'none' }} />
                </div>
              ))}
            </div>
          </div>
        }
        onNew={() => setNovaForm({ ...EMPTY_PROV })}
        newLabel="Nova Provisão"
        onImport={() => setImportModal(true)}
        bulkActions={[
          { label: 'Alterar Status ▾', type:'dropdown', options:
            Object.entries(STATUS_PAGAMENTO).map(([key, cfg]) => ({
              label: cfg.label,
              onClick: ids => bulkSetStatus(ids, key),
            }))
          },
          { label: 'Excluir', onClick: ids => {
            if (window.confirm(`Excluir ${ids.length} provisão(ões)?`))
              removeMany(ids)
          }},
        ]}
        bulkEditFields={[
          { key: 'status', label: 'Status', type: 'select',
            options: Object.entries(STATUS_PAGAMENTO).map(([k, v]) => ({ value:k, label:v.label })) },
          { key: 'due_date',        label: 'Vencimento',  type: 'date' },
          { key: 'reference_month', label: 'Competência', type: 'date' },
          { key: 'notes',           label: 'Observações', type: 'textarea' },
        ]}
        onBulkEdit={(ids, changes) => {
          provisoes
            .filter(p => ids.includes(p.id))
            .forEach(p => save({ ...p, ...changes }))
        }}
        onRowClick={p => setDetalhe(p)}
        emptyState={
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'var(--text-muted)' }}>
            <span style={{ fontSize:28, opacity:0.3 }}>📋</span>
            <span style={{ fontSize:13 }}>Nenhuma provisão encontrada para este período</span>
          </div>
        }
      />

      {/* Detalhe */}
      <SlideOver
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title={detalhe ? (detalhe.company_nome || 'Provisão') : ''}
        subtitle={detalhe?.reference_month ? periodoLabel(parsePeriodo(detalhe.reference_month)) : 'Provisão'}
        defaultWidth={720}
        onSave={() => saveRef.current?.()}
        saveLabel="Salvar alterações"
        onDelete={detalhe?.id ? async () => { await removeMany([detalhe.id]); setDetalhe(null) } : undefined}
        deleteLabel="Excluir provisão"
      >
        {detalhe && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <ProvisaoDetail provisao={detalhe} onSave={handleSaveDetalhe} saveRef={saveRef} />
          </div>
        )}
      </SlideOver>

      {importModal && (
        <ImportProvisaoModal
          onClose={() => setImportModal(false)}
          provisoes={provisoes}
          save={save}
          companies={companies}
          addCompany={addCompany}
          updateCompany={updateCompany}
          contratos={contratos}
          saveContrato={saveContrato}
          produtos={produtos}
        />
      )}

      {/* Nova */}
      <SlideOver
        open={!!novaForm}
        onClose={() => setNovaForm(null)}
        title="Nova Provisão"
        subtitle="Lançamento de receita prevista"
        onSave={handleSaveNova}
        saveLabel="+ Adicionar provisão"
        saving={savingNova}
        defaultWidth={720}
      >
        {novaForm && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
            <NovaProvisaoForm form={novaForm} onChange={setNovaForm} />
          </div>
        )}
      </SlideOver>
    </>
  )
}
