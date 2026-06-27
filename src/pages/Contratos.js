import { useState, useMemo, useRef, useEffect } from 'react'
import { useContracts } from '../hooks/useContracts'
import { useAuditLog } from '../hooks/useAuditLog'
import { useProducts } from '../hooks/useProducts'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import EmpresaSearch from '../components/EmpresaSearch'
import { PAGAMENTOS_STORAGE_KEY, MOCK_PAGAMENTOS } from '../data/mockPagamentos'
import Button from '../components/Button'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { DeleteZone } from '../components/NotionDrawer'
import ActionFeedback from '../components/ActionFeedback'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONTRATO = [
  { value: 'rascunho',  label: 'Rascunho',  color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'ativo',     label: 'Ativo',      color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  { value: 'suspenso',  label: 'Suspenso',   color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'encerrado', label: 'Encerrado',  color: '#9A9590',       bg: 'var(--surface3)',  text: 'var(--text-muted)' },
  { value: 'cancelado', label: 'Cancelado',  color: 'var(--red)',    bg: 'var(--red-bg)',    text: 'var(--red-text)' },
]

const SLOTS = [
  {
    key: 'adesao',
    label: 'Adesão / CDU',
    hint: 'Licença de ativação ou implementação',
    icon: '①',
    color: '#0891B2', bg: '#ECFEFF', text: '#0E7490',
    filter: p => p.status === 'ativo' && p.tipo === 'licenca',
  },
  {
    key: 'mrr',
    label: 'MRR / SMS',
    hint: 'Produto SaaS recorrente',
    icon: '②',
    color: 'var(--blue)', bg: 'var(--blue-bg)', text: 'var(--blue-text)',
    filter: p => p.status === 'ativo' && p.tipo === 'saas',
  },
  {
    key: 'servico',
    label: 'Serviço',
    hint: 'Consultoria ou serviço contratado',
    icon: '③',
    color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)',
    filter: p => p.status === 'ativo' && p.tipo === 'consultoria',
  },
]

const EMPTY_FORM = {
  numero: '', empresa_id: null, empresa_nome: '',
  status: 'rascunho',
  primeira_compra: false,
  vigencia_inicio: '', vigencia_fim: '',
  itens_adesao: [], itens_mrr: [], itens_servico: [],
  responsavel: '', observacoes: '',
  origem: '',
  data_pag_cdu: '', data_pag_sms: '',
  opportunity_id: null, opportunity_titulo: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}
function gerarNumero(existentes) {
  const ano = new Date().getFullYear()
  const seq = String(existentes.filter(c => c.numero.includes(String(ano))).length + 1).padStart(3, '0')
  return `CTR-${ano}-${seq}`
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONTRATO.find(s => s.value === status) || STATUS_CONTRATO[0]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, background: cfg.bg, color: cfg.text, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function DescontoBadge({ pct, autorizado }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)', padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap',
      background: autorizado ? 'var(--green-bg)' : 'var(--red-bg)',
      color:      autorizado ? 'var(--green-text)' : 'var(--red-text)',
      border:     `1px solid ${autorizado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
    }}>
      -{pct}% {autorizado ? '✓' : '⚠'}
    </span>
  )
}

// ─── Slot multi-produto compacto ─────────────────────────────────────────────
function SlotProdutos({ slot, itens, onChange, produtos: produtosReal }) {
  const [addingQuery, setAddingQuery] = useState('')
  const [addingOpen,  setAddingOpen]  = useState(false)
  const [showAll,     setShowAll]     = useState(false)
  const addRef = useRef(null)

  const todosProdutos = (produtosReal && produtosReal.length > 0) ? produtosReal : MOCK_PRODUTOS
  const allActive  = todosProdutos.filter(p => p.status === 'ativo')
  const suggested  = allActive.filter(slot.filter)
  // se não há sugeridos, expande para todos automaticamente
  const effectiveShowAll = showAll || suggested.length === 0
  const pool       = effectiveShowAll ? allActive : suggested
  const jaAdded    = new Set((itens || []).map(i => i.produto_id))

  const opts = useMemo(() => {
    const q = addingQuery.toLowerCase()
    return pool
      .filter(p => !jaAdded.has(p.id) && (p.nome.toLowerCase().includes(q) || (p.codigo||'').toLowerCase().includes(q)))
      .slice(0, 12)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addingQuery, pool, itens])

  useEffect(() => {
    function h(e) { if (addRef.current && !addRef.current.contains(e.target)) setAddingOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function addItem(p) {
    onChange([...(itens||[]), { produto_id: p.id, nome: p.nome, valor: p.preco || 0, tabela: p.preco || null, desconto_pct: 0, desconto_autorizado: false }])
    setAddingQuery(''); setAddingOpen(false); setShowAll(false)
  }

  function updateItem(idx, patch) {
    const next = (itens||[]).map((it, i) => i === idx ? { ...it, ...patch } : it)
    onChange(next)
  }

  function removeItem(idx) {
    onChange((itens||[]).filter((_, i) => i !== idx))
  }

  function handleDescontoChange(idx, pct) {
    const p   = Math.min(Math.max(parseFloat(pct) || 0, 0), 100)
    const tab = parseFloat((itens||[])[idx]?.tabela) || 0
    updateItem(idx, { desconto_pct: p, valor: tab > 0 ? Math.round(tab * (1 - p / 100) * 100) / 100 : (itens||[])[idx]?.valor })
  }

  function handleValorChange(idx, v) {
    const tab = parseFloat((itens||[])[idx]?.tabela) || 0
    const pct = tab > 0 && parseFloat(v) >= 0 ? Math.round((1 - parseFloat(v) / tab) * 10000) / 100 : (itens||[])[idx]?.desconto_pct
    updateItem(idx, { valor: v, desconto_pct: Math.max(0, pct) })
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
      {/* cabeçalho do slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface2)', borderBottom: (itens||[]).length > 0 ? '1px solid var(--border)' : 'none' }}>
        <span style={{ width: 20, height: 20, borderRadius: 5, background: slot.bg, color: slot.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: `1px solid ${slot.color}33`, flexShrink: 0 }}>{slot.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{slot.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{slot.hint}</span>
        </div>
        {(itens||[]).length > 0 && (
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
            {fmtMoeda((itens||[]).reduce((s, i) => s + (parseFloat(i.valor)||0), 0))}
          </span>
        )}
      </div>

      {/* lista de itens */}
      {(itens||[]).map((item, idx) => {
        const prodObj     = todosProdutos.find(p => p.id === item.produto_id)
        const descontoMax = prodObj?.desconto_max ?? 100
        const desc        = parseFloat(item.desconto_pct) || 0
        const acima       = desc > descontoMax && descontoMax > 0
        const precisaAuth = desc > 0 && !item.desconto_autorizado
        return (
          <div key={idx} style={{ borderBottom: idx < (itens||[]).length - 1 ? '1px solid var(--border)' : 'none' }}>
            {/* linha principal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 90px 28px', gap: 6, alignItems: 'center', padding: '7px 12px', background: precisaAuth ? 'var(--red-bg)' : 'var(--surface)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                {item.tabela ? fmtMoeda(item.tabela) : '—'}
              </div>
              {/* desconto */}
              <div style={{ position: 'relative' }}>
                <input type="number" min="0" max="100" step="0.5"
                  style={{ width: '100%', padding: '4px 20px 4px 6px', borderRadius: 5, border: `1px solid ${acima ? 'var(--red)' : 'var(--border)'}`, fontSize: 11, fontFamily: 'var(--mono)', color: acima ? 'var(--red)' : 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', outline: 'none' }}
                  value={item.desconto_pct}
                  onChange={e => handleDescontoChange(idx, e.target.value)}
                  placeholder="0"
                />
                <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>%</span>
              </div>
              {/* valor contratado */}
              <input type="number" min="0" step="0.01"
                style={{ width: '100%', padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', outline: 'none' }}
                value={item.valor}
                onChange={e => handleValorChange(idx, e.target.value)}
                placeholder="0"
              />
              <button type="button" onClick={() => removeItem(idx)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* autorização de desconto */}
            {desc > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 6px', background: item.desconto_autorizado ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                <span style={{ fontSize: 11, flex: 1, color: item.desconto_autorizado ? 'var(--green-text)' : 'var(--red-text)' }}>
                  {item.desconto_autorizado ? `✓ Desconto de ${desc}% autorizado` : `⚠ ${desc}% aguarda autorização${acima ? ` (máx ${descontoMax}%)` : ''}`}
                </span>
                <div style={{ display: 'flex', gap: 1, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
                    <button key={l} type="button"
                      style={{ padding: '2px 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                        background: item.desconto_autorizado === v ? (v ? 'var(--green)' : 'var(--red)') : 'var(--surface)',
                        color: item.desconto_autorizado === v ? '#fff' : 'var(--text-muted)' }}
                      onClick={() => updateItem(idx, { desconto_autorizado: v })}>{l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* campo de busca para adicionar */}
      <div ref={addRef} style={{ position: 'relative', padding: '6px 10px', background: 'var(--surface2)', borderTop: (itens||[]).length > 0 ? '1px solid var(--border)' : 'none' }}>
        <input
          style={{ width: '100%', padding: '5px 10px', borderRadius: 6, border: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-muted)', background: 'transparent', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
          placeholder="+ Adicionar produto…"
          value={addingQuery}
          onChange={e => { setAddingQuery(e.target.value); setAddingOpen(true) }}
          onFocus={() => setAddingOpen(true)}
        />
        {addingOpen && (
          <div style={{ position: 'absolute', bottom: 'calc(100% - 6px)', left: 10, right: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6 }}>
              {[{ label: `Sugeridos (${suggested.length})`, val: false }, { label: 'Todos', val: true }].map(({ label, val }) => (
                <button key={label} type="button"
                  style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 7px', borderRadius: 4, border: '1px solid', cursor: 'pointer',
                    background: showAll === val ? (val ? 'var(--accent-glow)' : slot.bg) : 'none',
                    color: showAll === val ? (val ? 'var(--accent)' : slot.text) : 'var(--text-muted)',
                    borderColor: showAll === val ? (val ? 'rgba(30,58,95,0.2)' : slot.color + '44') : 'var(--border)' }}
                  onMouseDown={e => { e.preventDefault(); setShowAll(val) }}>{label}</button>
              ))}
            </div>
            {opts.length === 0
              ? <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>Nenhum produto disponível</div>
              : opts.map(p => (
                <button type="button" key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseDown={() => addItem(p)}>
                  <span style={{ width: 24, height: 24, borderRadius: 5, background: slot.bg, color: slot.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0 }}>{p.nome.slice(0,2).toUpperCase()}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {p.codigo} · {fmtMoeda(p.preco)}/{p.cobranca}
                      {p.desconto_max > 0 && <span style={{ color: 'var(--green-text)' }}> · desc. máx {p.desconto_max}%</span>}
                    </div>
                  </span>
                </button>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}


// ─── Geração de provisões de pagamento ────────────────────────────────────────
function gerarProvisoesPagamento(contrato) {
  const stored = localStorage.getItem(PAGAMENTOS_STORAGE_KEY)
  const pagamentos = stored ? JSON.parse(stored) : MOCK_PAGAMENTOS
  const novas = []
  const toRefMonth = date => date.slice(0, 7) + '-01'
  const cduRef = contrato.data_pag_cdu ? toRefMonth(contrato.data_pag_cdu) : null
  const smsRef = contrato.data_pag_sms ? toRefMonth(contrato.data_pag_sms) : null
  const valorCdu = (contrato.itens_adesao||[]).reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
  const valorSms = (contrato.itens_mrr||[]).reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
  const prodCdu  = contrato.itens_adesao?.[0] ? { id: contrato.itens_adesao[0].produto_id, nome: contrato.itens_adesao[0].nome } : { id: null, nome: '' }
  const prodSms  = contrato.itens_mrr?.[0]    ? { id: contrato.itens_mrr[0].produto_id,    nome: contrato.itens_mrr[0].nome    } : { id: null, nome: '' }
  const base = {
    contract_id: contrato.id, contract_numero: contrato.numero,
    company_id: contrato.empresa_id, company_nome: contrato.empresa_nome,
    num_documento: null, data_emissao: null, parcela: '1/1',
    amount_services: 0, amount_discount: 0,
    valor_recebido: null, data_baixa: null,
    status: 'pendente', processed: false,
    tenant_id: 't1', criado: new Date().toISOString().slice(0, 10),
  }
  const jaExiste = (ref, campo) =>
    pagamentos.some(p => p.contract_numero === contrato.numero && p.reference_month === ref && p[campo] > 0)

  if (cduRef && valorCdu > 0 && !jaExiste(cduRef, 'amount_cdu')) {
    if (cduRef === smsRef && valorSms > 0) {
      novas.push({ ...base, id: 'prov_' + Date.now() + '_cdu_sms', produto_id: prodCdu.id, produto_nome: prodCdu.nome, amount_cdu: valorCdu, amount_sms: valorSms, amount_total_net: valorCdu + valorSms, reference_month: cduRef, due_date: contrato.data_pag_cdu, notes: 'Provisão CDU+SMS gerada automaticamente ao criar contrato.' })
    } else {
      novas.push({ ...base, id: 'prov_' + Date.now() + '_cdu', produto_id: prodCdu.id, produto_nome: prodCdu.nome, amount_cdu: valorCdu, amount_sms: 0, amount_total_net: valorCdu, reference_month: cduRef, due_date: contrato.data_pag_cdu, notes: 'Provisão CDU gerada automaticamente ao criar contrato.' })
    }
  }
  if (smsRef && valorSms > 0 && cduRef !== smsRef && !jaExiste(smsRef, 'amount_sms')) {
    novas.push({ ...base, id: 'prov_' + Date.now() + '_sms', produto_id: prodSms.id, produto_nome: prodSms.nome, amount_cdu: 0, amount_sms: valorSms, amount_total_net: valorSms, reference_month: smsRef, due_date: contrato.data_pag_sms, notes: 'Provisão SMS gerada automaticamente ao criar contrato.' })
  }
  // Fallback: se nenhuma data específica foi configurada mas o contrato tem valor, gera uma provisão geral
  if (novas.length === 0) {
    const totalGeral = [
      ...(contrato.itens_adesao  || []),
      ...(contrato.itens_mrr     || []),
      ...(contrato.itens_servico || []),
    ].reduce((s, i) => s + (parseFloat(i.valor) || 0), 0)
    const dueDate = contrato.vigencia_inicio || new Date().toISOString().slice(0, 10)
    const ref     = dueDate.slice(0, 7) + '-01'
    const jaExisteGeral = pagamentos.some(
      p => p.contract_numero === contrato.numero && p.reference_month === ref
    )
    if (totalGeral > 0 && !jaExisteGeral) {
      novas.push({
        ...base,
        id: 'prov_' + Date.now() + '_geral',
        produto_id: null, produto_nome: '',
        amount_cdu: totalGeral, amount_sms: 0,
        amount_total_net: totalGeral,
        reference_month: ref,
        due_date: dueDate,
        notes: 'Provisão gerada automaticamente ao criar contrato.',
      })
    }
  }

  if (novas.length > 0) localStorage.setItem(PAGAMENTOS_STORAGE_KEY, JSON.stringify([...novas, ...pagamentos]))
  return novas.length
}

// ─── Formulário (SlideOver) ───────────────────────────────────────────────────
function ContratoForm({ form, setForm, onSave, onDelete, onClose, isNew, contratos, produtos, onShowFeedback }) {
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})
  const [confirmData, setConfirmData] = useState(null)
  const [gerarProvisao, setGerarProvisao] = useState(true)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); if (errs[field]) setErrs(p => ({ ...p, [field]: '' })) }

  const totalRec = [...(form.itens_mrr||[]), ...(form.itens_servico||[])].reduce((s,i) => s + (parseFloat(i.valor)||0), 0)

  async function handleSave() {
    const e = {}
    if (!form.empresa_id) e.empresa_id = 'Selecione uma empresa'
    if (!form.numero?.trim()) e.numero = 'Número é obrigatório'
    else {
      const num = form.numero.trim().toUpperCase()
      const dup = contratos.find(c => c.id !== form.id && c.numero?.toUpperCase() === num)
      if (dup) e.numero = `Número já existe: ${dup.numero} (${dup.empresa_nome})`
    }
    if (Object.keys(e).length) { setErrs(e); return }
    if (isNew) {
      // mostra confirm de integração antes de criar
      setConfirmData({ ...form, id: Date.now(), criado: new Date().toISOString().slice(0, 10) })
      return
    }
    setSaving(true)
    try { onSave(form); onClose() } finally { setSaving(false) }
  }

  async function executarSave() {
    setSaving(true)
    try {
      onSave(confirmData)
      let qtd = 0
      if (gerarProvisao) qtd = gerarProvisoesPagamento(confirmData)
      onShowFeedback([
        { id: 'contrato', label: `Contrato ${confirmData.numero} criado`, sublabel: confirmData.empresa_nome },
        gerarProvisao
          ? { id: 'provisao', label: `${qtd || 1} provisão(ões) gerada(s) em Pagamentos`, sublabel: 'Status: Pendente' }
          : { id: 'provisao', label: 'Provisão de pagamento ignorada', skip: true },
      ])
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // ─── Confirm modal de integração ───────────────────────────────────────────
  const chkRow = (on) => ({
    display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:10, cursor:'pointer',
    border:`1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    background: on ? 'var(--accent-glow)' : 'var(--surface2)', transition:'all 0.15s',
  })

  return (
    <>
    {/* ─── Confirm modal integração ──────────────────────────────────────── */}
    {confirmData && (
      <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.7)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:2200 }}>
        <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:460,
          boxShadow:'0 24px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:42, height:42, borderRadius:12, background:'var(--accent-glow)', display:'flex',
              alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📄</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Criar contrato</div>
              <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:3 }}>
                Ao criar <strong style={{ color:'var(--text)' }}>{confirmData.numero}</strong>, as seguintes ações serão executadas automaticamente:
              </div>
            </div>
          </div>
          {/* Consequences */}
          <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
            {/* Contrato — sempre */}
            <div style={chkRow(true)}>
              <div style={{ width:18, height:18, borderRadius:4, background:'var(--accent)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Salvar contrato</div>
                <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{confirmData.numero} · {confirmData.empresa_nome}</div>
              </div>
            </div>
            {/* Provisão — opcional */}
            <div style={chkRow(gerarProvisao)} onClick={() => setGerarProvisao(g => !g)}>
              <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                border:`2px solid ${gerarProvisao ? 'var(--accent)' : 'var(--border)'}`,
                background: gerarProvisao ? 'var(--accent)' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                {gerarProvisao && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Gerar provisão de pagamento</div>
                <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>Registro pendente criado em Pagamentos (D+0 da vigência)</div>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)',
            display:'flex', justifyContent:'flex-end', gap:10 }}>
            <Button variant="ghost" onClick={() => setConfirmData(null)}>Voltar</Button>
            <Button onClick={executarSave} disabled={saving}>{saving ? 'Criando…' : 'Criar contrato'}</Button>
          </div>
        </div>
      </div>
    )}

    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Resumo financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        {[
          { label: 'Adesão',     val: (form.itens_adesao||[]).reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '' },
          { label: 'MRR',        val: (form.itens_mrr||[]).reduce((s,i)=>s+(parseFloat(i.valor)||0),0),    suffix: '/mês' },
          { label: 'Serviço',    val: (form.itens_servico||[]).reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '' },
          { label: 'Recorrente', val: totalRec, suffix: '/mês', bold: true },
        ].map(({ label, val, suffix, bold }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: bold ? 700 : 600, fontFamily: 'var(--mono)', color: val ? 'var(--text)' : 'var(--text-muted)' }}>
              {val ? fmtMoeda(val) : '—'}{val && suffix ? <span style={{ fontSize: 10, fontWeight: 400 }}>{suffix}</span> : null}
            </div>
          </div>
        ))}
      </div>

      <FormSection label="Identificação">
        <FormGrid cols={2}>
          <FormField label="Número do contrato" required error={errs.numero}>
            <input className="so-field" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="CTR-2025-001"
              style={{ borderColor: errs.numero ? '#DC2626' : '' }} />
          </FormField>
          <FormField label="Status">
            <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_CONTRATO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>
        </FormGrid>
        <FormGrid cols={1}>
          <FormField label="Empresa" required error={errs.empresa_id}>
            <EmpresaSearch
              value={form.empresa_id}
              label={form.empresa_nome}
              onChange={(id, nome) => {
                setForm(f => ({ ...f, empresa_id: id, empresa_nome: nome }))
                if (errs.empresa_id) setErrs(p => ({ ...p, empresa_id: '' }))
              }}
              style={{ borderColor: errs.empresa_id ? '#DC2626' : '' }}
            />
          </FormField>
          {form.opportunity_id && (
            <FormField label="Oportunidade de origem">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {form.opportunity_titulo || '—'}
                </span>
                <span title={form.opportunity_id} style={{
                  fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 5, padding: '2px 7px', letterSpacing: '0.04em',
                  flexShrink: 0, userSelect: 'all',
                }}>
                  {String(form.opportunity_id).slice(0, 8)}…
                </span>
              </div>
            </FormField>
          )}
        </FormGrid>
        <FormGrid cols={2}>
          <FormField label="Responsável">
            <input className="so-field" value={form.responsavel || ''} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" />
          </FormField>
          <FormField label="Origem">
            <select className="so-field" value={form.origem || ''} onChange={e => set('origem', e.target.value)}>
              <option value="">— Não definida —</option>
              <option value="direta">Direta</option>
              <option value="indireta">Indireta</option>
              <option value="incentivada">Incentivada</option>
            </select>
          </FormField>
          <FormField label="Primeira compra">
            <select className="so-field" value={form.primeira_compra ? 'sim' : 'nao'} onChange={e => set('primeira_compra', e.target.value === 'sim')}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label="Vigência">
        <FormGrid cols={2}>
          <FormField label="Data de aquisição">
            <input type="date" className="so-field" value={form.vigencia_inicio || ''} onChange={e => set('vigencia_inicio', e.target.value)} />
          </FormField>
          <FormField label="Data de cancelamento">
            <input type="date" className="so-field" value={form.vigencia_fim || ''} onChange={e => set('vigencia_fim', e.target.value)} />
          </FormField>
          <FormField label="Início pagamento CDU">
            <input type="date" className="so-field" value={form.data_pag_cdu || ''} onChange={e => set('data_pag_cdu', e.target.value)} />
          </FormField>
          <FormField label="Início pagamento SMS">
            <input type="date" className="so-field" value={form.data_pag_sms || ''} onChange={e => set('data_pag_sms', e.target.value)} />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection label="Produtos contratados">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* cabeçalho das colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 90px 28px', gap: 6, padding: '0 12px 4px', marginTop: 2 }}>
            {['Produto', 'Tabela', 'Desc.', 'Contratado', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {SLOTS.map(slot => (
            <SlotProdutos key={slot.key} slot={slot} produtos={produtos}
              itens={form[`itens_${slot.key}`] || []}
              onChange={itens => set(`itens_${slot.key}`, itens)}
            />
          ))}
        </div>
      </FormSection>

      <FormSection label="Observações">
        <textarea className="so-field" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} placeholder="Condições especiais, anotações comerciais…" style={{ minHeight: 80, resize: 'vertical' }} />
      </FormSection>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : isNew ? 'Criar contrato' : 'Salvar alterações'}</Button>
      </div>

      {!isNew && (
        <DeleteZone label="Excluir contrato" onDelete={() => { onDelete(form.id); onClose() }} />
      )}
    </div>
    </>
  )
}

// ─── Colunas ─────────────────────────────────────────────────────────────────
function buildColumns(inadimplentesIds) { return [
  {
    key: 'numero',
    label: 'Contrato',
    render: (val, row) => (
      <div>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{val}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtData(row.criado)}</span>
          {row.primeira_compra && (
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)', padding: '1px 5px', borderRadius: 3, background: '#ECFEFF', color: '#0E7490', border: '1px solid #BAE6FD' }}>1ª COMPRA</span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'empresa_nome',
    label: 'Empresa',
    render: (val, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0, border: '1px solid rgba(30,58,95,0.12)' }}>
          {(val || '?').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{val}</div>
          {row.responsavel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.responsavel}</div>}
        </div>
      </div>
    ),
  },
  {
    key: 'itens_adesao',
    label: '① Adesão',
    render: (val) => (val||[]).length > 0
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(val||[]).map((it,i) => (
            <div key={i}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0E7490' }}>{it.nome}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(it.valor)}</span>
                {it.desconto_pct > 0 && <DescontoBadge pct={it.desconto_pct} autorizado={it.desconto_autorizado} />}
              </div>
            </div>
          ))}
        </div>
      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'itens_mrr',
    label: '② MRR',
    render: (val) => (val||[]).length > 0
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(val||[]).map((it,i) => (
            <div key={i}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-text)' }}>{it.nome}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(it.valor)}<span style={{ fontSize: 10 }}>/mês</span></span>
                {it.desconto_pct > 0 && <DescontoBadge pct={it.desconto_pct} autorizado={it.desconto_autorizado} />}
              </div>
            </div>
          ))}
        </div>
      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'itens_servico',
    label: '③ Serviço',
    render: (val) => (val||[]).length > 0
      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(val||[]).map((it,i) => (
            <div key={i}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-text)' }}>{it.nome}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(it.valor)}</span>
                {it.desconto_pct > 0 && <DescontoBadge pct={it.desconto_pct} autorizado={it.desconto_autorizado} />}
              </div>
            </div>
          ))}
        </div>
      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'vigencia_inicio',
    label: 'Vigência',
    render: (val, row) => val
      ? <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-soft)' }}>
          <div>{fmtData(val)}</div>
          <div style={{ color: 'var(--text-muted)' }}>até {fmtData(row.vigencia_fim)}</div>
        </div>
      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>,
  },
  { key: 'status', label: 'Status', render: (val, row) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <StatusBadge status={val} />
      {inadimplentesIds.has(String(row.id)) && (
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', padding: '1px 6px', borderRadius: 4, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', letterSpacing: '0.02em' }}>
          INADIMPLENTE
        </span>
      )}
    </div>
  )},
] }

const FILTERS = [
  { key: 'status', label: 'Status', options: STATUS_CONTRATO.map(s => ({ value: s.value, label: s.label })) },
]

// ─── Inadimplência D+1 ───────────────────────────────────────────────────────
function getInadimplentesIds() {
  try {
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
    const ontemStr = ontem.toISOString().slice(0, 10)
    const raw = localStorage.getItem(PAGAMENTOS_STORAGE_KEY)
    const pags = raw ? JSON.parse(raw) : MOCK_PAGAMENTOS
    const ids = new Set()
    pags.forEach(p => {
      if ((p.status === 'pendente' || p.status === 'vencido') && p.due_date && p.due_date < ontemStr && p.contract_id) {
        ids.add(String(p.contract_id))
      }
    })
    return ids
  } catch { return new Set() }
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Contratos() {
  const { contratos, setContratos, save: saveContrato, remove: removeContrato } = useContracts()
  const { registrar: log } = useAuditLog()
  const { produtos } = useProducts()
  const [search, setSearch]           = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [editando, setEditando]       = useState(null)
  const [feedbackSteps, setFeedbackSteps] = useState(null)

  const inadimplentesIds = useMemo(() => getInadimplentesIds(), [contratos])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const statusFilter = activeFilters.status || []
    return contratos.filter(c => {
      if (statusFilter.length && !statusFilter.includes(c.status)) return false
      if (q) {
        const nomes = [...(c.itens_adesao||[]), ...(c.itens_mrr||[]), ...(c.itens_servico||[])].map(i => i.nome?.toLowerCase() || '')
        if (!(c.numero?.toLowerCase().includes(q) || c.empresa_nome?.toLowerCase().includes(q) || nomes.some(n => n.includes(q)))) return false
      }
      return true
    })
  }, [contratos, search, activeFilters])

  // KPIs
  const ativos           = contratos.filter(c => c.status === 'ativo').length
  const totalMRR         = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + [...(c.itens_mrr||[]), ...(c.itens_servico||[])].reduce((a,i) => a + (parseFloat(i.valor)||0), 0), 0)
  const totalAdesao      = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.itens_adesao||[]).reduce((a,i) => a + (parseFloat(i.valor)||0), 0), 0)
  const qtdInadimplentes = inadimplentesIds.size

  const kpisNode = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
      {[
        { label: 'Total de contratos', value: contratos.length,       mono: false },
        { label: 'Contratos ativos',   value: ativos,                 color: 'var(--green-text)' },
        { label: 'MRR recorrente',     value: fmtMoeda(totalMRR),     mono: true },
        { label: 'Receita de adesão',  value: fmtMoeda(totalAdesao),  mono: true },
        { label: 'Inadimplentes',      value: qtdInadimplentes,       color: qtdInadimplentes > 0 ? '#991B1B' : 'var(--text)', border: qtdInadimplentes > 0 ? '#EF4444' : undefined },
      ].map(k => (
        <div key={k.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', borderTop: `3px solid ${k.border || 'var(--border)'}` }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: k.color || 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1, fontFamily: k.mono ? 'var(--mono)' : 'inherit' }}>{k.value}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</span>
        </div>
      ))}
    </div>
  )

  async function handleSave(data) {
    const isNew = !contratos.find(c => c.id === data.id)
    await saveContrato(data)
    log(isNew ? 'criar' : 'editar', 'contrato', data.id, { descricao: `Contrato ${isNew ? 'criado' : 'editado'}: ${data.numero || ''} — ${data.empresa_nome || ''}` })
  }

  async function handleDelete(id) {
    const c = contratos.find(x => x.id === id)
    await removeContrato(id)
    log('excluir', 'contrato', id, { descricao: `Contrato excluído: ${c?.numero || id}` })
    setEditando(null)
  }

  function handleExport() {
    const cols = ['numero','empresa_nome','status','vigencia_inicio','vigencia_fim','responsavel']
    const bom  = '﻿'
    const toRow = r => {
      const base = cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`)
      const prods = ['adesao','mrr','servico'].map(s =>
        `"${(r[`itens_${s}`]||[]).map(i=>`${i.nome}: ${fmtMoeda(i.valor)}`).join(' | ')}"`)
      return [...base, ...prods].join(';')
    }
    const header = [...cols, 'itens_adesao','itens_mrr','itens_servico'].join(';')
    const csv  = bom + [header, ...filtered.map(toRow)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `contratos_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}.csv`
    a.click()
  }

  const isNew = editando && !editando.id

  return (
    <>
      <BrowseLayout
        data={filtered}
        columns={buildColumns(inadimplentesIds)}
        filters={FILTERS}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        search={search}
        onSearchChange={setSearch}
        keyField="id"
        storageKey="contratos_browse"
        onRowClick={c => setEditando(c)}
        onNew={() => setEditando({ ...EMPTY_FORM, numero: gerarNumero(contratos) })}
        newLabel="+ Novo contrato"
        onExportCsv={handleExport}
        kpis={kpisNode}
        bulkActions={[
          { label: 'Ativar',     onClick: ids => setContratos(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: 'ativo' }     : c)) },
          { label: 'Suspender',  onClick: ids => setContratos(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: 'suspenso' }  : c)) },
          { label: 'Encerrar',   onClick: ids => setContratos(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: 'encerrado' } : c)) },
          { label: 'Excluir',    onClick: ids => { if (window.confirm(`Excluir ${ids.length} contrato(s)?`)) setContratos(prev => prev.filter(c => !ids.includes(c.id))) } },
        ]}
        bulkEditFields={[
          { key: 'responsavel',  label: 'Responsável',   type: 'text' },
          { key: 'vigencia_fim', label: 'Fim de vigência', type: 'date' },
          { key: 'observacoes',  label: 'Observações',   type: 'textarea' },
        ]}
        onBulkEdit={(ids, changes) => setContratos(prev => prev.map(c => ids.includes(c.id) ? { ...c, ...changes } : c))}
        renderCard={row => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0 }}>
                {(row.empresa_nome || '?').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{row.numero}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.empresa_nome}</div>
              </div>
            </div>
            <StatusBadge status={row.status} />
            {(row.itens_mrr||[]).map((it,i) => <div key={i} style={{ fontSize: 12, color: 'var(--blue-text)', fontWeight: 600 }}>{it.nome} · {fmtMoeda(it.valor)}<span style={{ fontWeight: 400, fontSize: 10 }}>/mês</span></div>)}
            {(row.itens_adesao||[]).map((it,i) => <div key={i} style={{ fontSize: 11, color: '#0E7490' }}>{it.nome} · {fmtMoeda(it.valor)}</div>)}
            {row.vigencia_inicio && <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtData(row.vigencia_inicio)} → {fmtData(row.vigencia_fim)}</div>}
          </div>
        )}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>📄</span>
            <span style={{ fontSize: 13 }}>Nenhum contrato encontrado</span>
          </div>
        }
      />

      <SlideOver
        open={!!editando}
        onClose={() => setEditando(null)}
        title={isNew ? 'Novo contrato' : (editando?.numero || 'Contrato')}
        subtitle={editando?.empresa_nome || 'Dados contratuais'}
        defaultWidth={720}
        showFooter={false}
      >
        {editando && (
          <ContratoForm
            form={editando}
            setForm={setEditando}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setEditando(null)}
            isNew={isNew}
            contratos={contratos}
            produtos={produtos}
            onShowFeedback={steps => { setEditando(null); setFeedbackSteps(steps) }}
          />
        )}
      </SlideOver>

      {feedbackSteps && (
        <ActionFeedback
          title="Contrato criado com sucesso!"
          steps={feedbackSteps}
          onClose={() => setFeedbackSteps(null)}
          stepDelay={700}
          autoClose={0}
        />
      )}
    </>
  )
}
