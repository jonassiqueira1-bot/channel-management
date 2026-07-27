import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useContracts } from '../hooks/useContracts'
import { useAuditLog } from '../hooks/useAuditLog'
import { useProducts } from '../hooks/useProducts'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import { useGoals } from '../hooks/useGoals'
import EmpresaSearch from '../components/EmpresaSearch'
import { PAGAMENTOS_STORAGE_KEY, MOCK_PAGAMENTOS } from '../data/mockPagamentos'
import { PROVISOES_LS_KEY } from '../hooks/usePayments'
import Button from '../components/Button'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import { useEntityCustomFields, getEntityCustomFieldKeys } from '../hooks/useEntityCustomFields'
import BrowseLayout from '../components/BrowseLayout'
import { DeleteZone } from '../components/NotionDrawer'
import ActionFeedback from '../components/ActionFeedback'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useBranchContext } from '../contexts/BranchContext'
import { usePlaybooks } from '../hooks/usePlaybooks'
import SearchSelect from '../components/SearchSelect'
import { useCompanies } from '../hooks/useCompanies'
import { startImportJob, updateImportJob, finishImportJob } from '../hooks/useImportJobs'

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
    label: 'Adesão',
    hint: 'Licença ou hardware',
    icon: '①',
    color: '#0891B2', bg: '#ECFEFF', text: '#0E7490',
    filter: p => p.status === 'ativo' && ['licenca','hardware'].includes(p.tipo),
  },
  {
    key: 'mrr',
    label: 'MRR',
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
    filter: p => p.status === 'ativo' && ['servico','consultoria'].includes(p.tipo),
  },
]

const EMPTY_FORM = {
  numero: '', empresa_id: null, empresa_nome: '',
  status: 'rascunho',
  vendedor: '',
  tipo_venda: '',
  vigencia_inicio: '', vigencia_fim: '',
  itens: [],
  itens_adesao: [], itens_mrr: [], itens_servico: [],
  responsavel: '', observacoes: '',
  origem: '',
  opportunity_id: null, opportunity_titulo: '',
  inconsistencia_status: 'sem_inconsistencia',
}

const INCONSISTENCIA_OPTS = [
  { value: 'sem_inconsistencia',      label: 'Sem inconsistência' },
  { value: 'inconsistencia_pendente', label: 'Inconsistência pendente' },
  { value: 'inconsistencia_analise',  label: 'Inconsistência em análise' },
  { value: 'inconsistencia_fechada',  label: 'Inconsistência fechada' },
]

// Mapeamento tipo de produto → label e cor de categoria
const CATEGORIA_POR_TIPO = {
  saas:        { label: 'MRR',     color: 'var(--blue)',   bg: 'var(--blue-bg)',   text: 'var(--blue-text)' },
  licenca:     { label: 'Adesão',  color: '#0891B2',       bg: '#ECFEFF',          text: '#0E7490' },
  hardware:    { label: 'Adesão',  color: '#0891B2',       bg: '#ECFEFF',          text: '#0E7490' },
  servico:     { label: 'Serviço', color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
  consultoria: { label: 'Serviço', color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)' },
}
function categoriaDoProduto(tipo) {
  return CATEGORIA_POR_TIPO[tipo] || { label: tipo || '—', color: 'var(--border)', bg: 'var(--surface2)', text: 'var(--text-muted)' }
}

const TIPO_VENDA_KEY = 'contratos:tipo_venda_opts'
const TIPO_VENDA_DEFAULT = ['Nova venda', 'Renovação', 'Expansão', 'Upsell', 'Cross-sell']

function TipoVendaField({ value, onChange }) {
  const [opts, setOpts] = useLocalState(TIPO_VENDA_KEY, TIPO_VENDA_DEFAULT)
  const [editing, setEditing] = useState(false)
  const [newOpt, setNewOpt] = useState('')

  function addOpt() {
    const v = newOpt.trim()
    if (!v || opts.includes(v)) return
    setOpts([...opts, v])
    setNewOpt('')
  }

  function removeOpt(o) {
    setOpts(opts.filter(x => x !== o))
    if (value === o) onChange('')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select className="so-field" value={value || ''} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
          <option value="">— Selecionar —</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button type="button" onClick={() => setEditing(e => !e)}
          title="Editar opções"
          style={{ padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)', background: editing ? 'var(--accent-glow)' : 'var(--surface)', color: editing ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
          ⚙
        </button>
      </div>
      {editing && (
        <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', background: 'var(--surface3)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opts.map(o => (
            <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{o}</span>
              <button type="button" onClick={() => removeOpt(o)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px', lineHeight: 1 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={newOpt} onChange={e => setNewOpt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOpt()}
              placeholder="Nova opção…"
              style={{ flex: 1, padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', fontSize: 12, background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }} />
            <button type="button" onClick={addOpt}
              style={{ padding: '4px 12px', borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font)' }}>+</button>
          </div>
        </div>
      )}
    </div>
  )
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
function fmtCNPJ(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
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

// ─── Lista unificada de produtos contratados ──────────────────────────────────
const STATUS_ITEM_OPTS = [
  { value: 'ativo',      label: 'Ativo' },
  { value: 'pendente',   label: 'Pendente' },
  { value: 'suspenso',   label: 'Suspenso' },
  { value: 'cancelado',  label: 'Cancelado' },
]

function ProdutosList({ itens, onChange, produtos: produtosReal, empresaId, contratos }) {
  const [addingQuery, setAddingQuery] = useState('')
  const [addingOpen,  setAddingOpen]  = useState(false)
  const addRef = useRef(null)

  const todosProdutos = (produtosReal?.length > 0) ? produtosReal : MOCK_PRODUTOS
  const allActive = todosProdutos.filter(p => p.status === 'ativo')
  const jaAdded   = new Set((itens||[]).map(i => i.produto_id))

  const opts = useMemo(() => {
    const q = addingQuery.toLowerCase()
    return allActive
      .filter(p => !jaAdded.has(p.id) && (!q || p.nome.toLowerCase().includes(q) || (p.codigo||'').toLowerCase().includes(q)))
      .slice(0, 15)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addingQuery, allActive, itens])

  useEffect(() => {
    function h(e) { if (addRef.current && !addRef.current.contains(e.target)) setAddingOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Verifica se a empresa já tem contrato ativo com o produto
  function primeiraCompraDefault(produtoId) {
    if (!empresaId || !contratos) return ''
    const temContrato = contratos.some(c =>
      c.status === 'ativo' &&
      String(c.empresa_id) === String(empresaId) &&
      [...(c.itens||[]), ...(c.itens_adesao||[]), ...(c.itens_mrr||[]), ...(c.itens_servico||[])].some(i => String(i.produto_id) === String(produtoId))
    )
    return temContrato ? 'nao' : ''
  }

  function addItem(p) {
    const cat = categoriaDoProduto(p.tipo)
    onChange([...(itens||[]), {
      produto_id: p.id, nome: p.nome, tipo_produto: p.tipo,
      quantidade: 1, valor: p.preco || 0, tabela: p.preco || null,
      desconto_pct: 0, desconto_autorizado: false, status_item: 'ativo',
      vencimento_primeiro_pagamento: '',
      primeira_compra: primeiraCompraDefault(p.id),
      _cat_label: cat.label,
    }])
    setAddingQuery(''); setAddingOpen(false)
  }

  function updateItem(idx, patch) {
    onChange((itens||[]).map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  function removeItem(idx) {
    onChange((itens||[]).filter((_, i) => i !== idx))
  }

  function handleQtdChange(idx, q) {
    const qtd = Math.max(0.001, parseFloat(q) || 1)
    const item = (itens||[])[idx] || {}
    const tab  = parseFloat(item.tabela) || 0
    const pct  = parseFloat(item.desconto_pct) || 0
    const unitLiq = tab > 0 ? tab * (1 - pct / 100) : parseFloat(item.valor) || 0
    updateItem(idx, { quantidade: qtd, valor: Math.round(unitLiq * qtd * 100) / 100 })
  }

  function handleDescontoChange(idx, pct) {
    const p = Math.min(Math.max(parseFloat(pct) || 0, 0), 100)
    const item = (itens||[])[idx] || {}
    const tab  = parseFloat(item.tabela) || 0
    const qtd  = parseFloat(item.quantidade) || 1
    updateItem(idx, { desconto_pct: p, valor: tab > 0 ? Math.round(tab * (1 - p / 100) * qtd * 100) / 100 : item.valor })
  }

  function handleValorChange(idx, v) {
    const item   = (itens||[])[idx] || {}
    const tab    = parseFloat(item.tabela) || 0
    const qtd    = parseFloat(item.quantidade) || 1
    const unitTab = tab > 0 ? tab * qtd : 0
    const pct    = unitTab > 0 && parseFloat(v) >= 0 ? Math.round((1 - parseFloat(v) / unitTab) * 10000) / 100 : item.desconto_pct
    updateItem(idx, { valor: v, desconto_pct: Math.max(0, pct) })
  }

  const total = (itens||[]).reduce((s, i) => s + (parseFloat(i.valor)||0), 0)

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'visible' }}>
      {/* cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--surface2)', borderBottom: (itens||[]).length > 0 ? '1px solid var(--border)' : 'none',
        borderRadius: (itens||[]).length === 0 ? 9 : '9px 9px 0 0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Produtos Contratados</span>
        {total > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(total)}</span>}
      </div>

      {/* itens */}
      {(itens||[]).map((item, idx) => {
        const prodObj = todosProdutos.find(p => String(p.id) === String(item.produto_id))
        const cat     = categoriaDoProduto(item.tipo_produto || prodObj?.tipo || item._slot)
        const descontoMax = prodObj?.desconto_max ?? 100
        const desc    = parseFloat(item.desconto_pct) || 0
        const acima   = desc > descontoMax && descontoMax > 0
        const precisaAuth = desc > 0 && !item.desconto_autorizado
        return (
          <div key={idx} style={{ borderBottom: idx < (itens||[]).length - 1 ? '1px solid var(--border)' : 'none' }}>
            {/* linha principal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 90px 80px 90px 28px', gap: 6, alignItems: 'center', padding: '7px 12px', background: precisaAuth ? 'var(--red-bg)' : 'var(--surface)' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* badge de categoria */}
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
                    background: cat.bg, color: cat.text, border: `1px solid ${cat.color}33` }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</span>
                </div>
              </div>
              <input type="number" min="0.001" step="1"
                style={{ width: '100%', padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', outline: 'none', textAlign: 'center' }}
                value={item.quantidade ?? 1} onChange={e => handleQtdChange(idx, e.target.value)} title="Quantidade" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                {item.tabela ? fmtMoeda(item.tabela) : '—'}
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" min="0" max="100" step="0.5"
                  style={{ width: '100%', padding: '4px 20px 4px 6px', borderRadius: 5, border: `1px solid ${acima ? 'var(--red)' : 'var(--border)'}`, fontSize: 11, fontFamily: 'var(--mono)', color: acima ? 'var(--red)' : 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', outline: 'none' }}
                  value={item.desconto_pct} onChange={e => handleDescontoChange(idx, e.target.value)} placeholder="0" />
                <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>%</span>
              </div>
              <input type="number" min="0" step="0.01"
                style={{ width: '100%', padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', outline: 'none' }}
                value={item.valor} onChange={e => handleValorChange(idx, e.target.value)} placeholder="0" />
              <button type="button" onClick={() => removeItem(idx)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* status + vencimento + 1ª compra */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 6px', flexWrap: 'wrap' }}>
              <select value={item.status_item || 'ativo'} onChange={e => updateItem(idx, { status_item: e.target.value })}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}>
                {STATUS_ITEM_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>1º pagamento:</label>
              <input type="date" value={item.vencimento_primeiro_pagamento || ''} onChange={e => updateItem(idx, { vencimento_primeiro_pagamento: e.target.value })}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', outline: 'none' }} />
              <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>1ª venda:</label>
              <select value={item.primeira_compra || ''} onChange={e => updateItem(idx, { primeira_compra: e.target.value })}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}>
                <option value="">— Selecionar —</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
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
      <div ref={addRef} style={{ position: 'relative', padding: '6px 10px', background: 'var(--surface2)', borderTop: (itens||[]).length > 0 ? '1px solid var(--border)' : 'none', borderRadius: (itens||[]).length === 0 ? '0 0 9px 9px' : undefined }}>
        <input
          style={{ width: '100%', padding: '5px 10px', borderRadius: 6, border: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-muted)', background: 'transparent', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
          placeholder="+ Adicionar produto…"
          value={addingQuery}
          onChange={e => { setAddingQuery(e.target.value); setAddingOpen(true) }}
          onFocus={() => setAddingOpen(true)}
        />
        {addingOpen && opts.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 200, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
            {opts.map(p => {
              const cat = categoriaDoProduto(p.tipo)
              return (
                <button type="button" key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseDown={() => addItem(p)}>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
                    background: cat.bg, color: cat.text, border: `1px solid ${cat.color}33` }}>{cat.label}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.nome}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {p.codigo} · {fmtMoeda(p.preco)}/{p.cobranca}
                      {p.desconto_max > 0 && <span style={{ color: 'var(--green-text)' }}> · desc. máx {p.desconto_max}%</span>}
                    </div>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


// ─── Provisões de pagamento ───────────────────────────────────────────────────
async function gerarProvisoesPagamento(contrato, tenantId, branchId) {
  const tid = tenantId || 't1'

  // Uma provisão por produto ativo com data de 1º pagamento preenchida
  const allItens = contrato.itens?.length > 0
    ? contrato.itens
    : [
        ...(contrato.itens_adesao  || []).map(i => ({ ...i, tipo_produto: 'licenca' })),
        ...(contrato.itens_mrr     || []).map(i => ({ ...i, tipo_produto: 'saas' })),
        ...(contrato.itens_servico || []).map(i => ({ ...i, tipo_produto: 'servico' })),
      ]
  const slots = allItens.map(i => ({
    ...i,
    tipo_item: i.tipo_produto === 'saas' ? 'mrr' : ['servico','consultoria'].includes(i.tipo_produto) ? 'servico' : 'adesao',
  }))

  const candidatos = slots.filter(
    i => i.status_item !== 'inativo' && i.vencimento_primeiro_pagamento && (parseFloat(i.valor) || 0) > 0
  )

  if (!candidatos.length) return 0

  // Tenta inserir via Supabase
  let qtd = 0
  try {
    // Checa duplicatas já no banco (filtra por company_id; contract_id fica em custom_fields)
    const { data: existentes } = await supabase
      .from('provisoes')
      .select('id, custom_fields')
      .eq('company_id', String(contrato.empresa_id))

    const jaExiste = (produtoId, vencimento) =>
      (existentes || []).some(p =>
        String(p.custom_fields?.produto_id) === String(produtoId) &&
        p.custom_fields?.vencimento_primeiro_pagamento === vencimento
      )

    const base = {
      tenant_id:   tid,
      branch_id:   branchId || null,
      company_id:  contrato.empresa_id || null,
      status:      'pendente',
      notes:       `Provisão automática — contrato ${contrato.numero}`,
      descricao:   `Provisão automática — contrato ${contrato.numero}`,
    }

    const inserir = candidatos
      .filter(i => !jaExiste(i.produto_id, i.vencimento_primeiro_pagamento))
      .map(i => ({
        ...base,
        reference_month: i.vencimento_primeiro_pagamento.slice(0, 7) + '-01',
        due_date:        i.vencimento_primeiro_pagamento,
        amount_cdu:      i.tipo_item === 'adesao'  ? parseFloat(i.valor) || 0 : 0,
        amount_sms:      i.tipo_item === 'mrr'     ? parseFloat(i.valor) || 0 : 0,
        amount_services: i.tipo_item === 'servico' ? parseFloat(i.valor) || 0 : 0,
        amount_discount: 0,
        custom_fields: {
          contract_id:                   contrato.id,
          contract_numero:               contrato.numero,
          company_nome:                  contrato.empresa_nome,
          produto_id:                    i.produto_id || null,
          produto_nome:                  i.nome || '',
          tipo_item:                     i.tipo_item,
          primeira_compra:               i.primeira_compra || false,
          vencimento_primeiro_pagamento: i.vencimento_primeiro_pagamento,
        },
      }))

    if (inserir.length) {
      const { error } = await supabase.from('provisoes').insert(inserir)
      if (error) throw new Error(error.message)
      qtd = inserir.length
    }
  } catch (err) {
    console.error('[gerarProvisoesPagamento]', err.message)
    return -1
  }

  // Fallback localStorage — chave dedicada, separada de dados mock
  try {
    const raw = localStorage.getItem(PROVISOES_LS_KEY)
    const existentesLS = raw ? JSON.parse(raw) : []
    const novos = candidatos
      .filter(i => !existentesLS.some(p =>
        p.contract_id === contrato.id &&
        p.produto_id  === i.produto_id &&
        p.due_date    === i.vencimento_primeiro_pagamento
      ))
      .map(i => ({
        id:              `prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        contract_id:     contrato.id,
        contract_numero: contrato.numero,
        company_id:      contrato.empresa_id || null,
        company_nome:    contrato.empresa_nome || '',
        produto_id:      i.produto_id || null,
        produto_nome:    i.nome || '',
        amount_cdu:      i.tipo_item === 'adesao' ? parseFloat(i.valor) || 0 : 0,
        amount_sms:      i.tipo_item === 'mrr'    ? parseFloat(i.valor) || 0 : 0,
        amount_services: i.tipo_item === 'servico' ? parseFloat(i.valor) || 0 : 0,
        amount_discount: 0,
        amount_total_net: parseFloat(i.valor) || 0,
        reference_month: i.vencimento_primeiro_pagamento.slice(0, 7) + '-01',
        due_date:        i.vencimento_primeiro_pagamento,
        status:          'pendente',
        processed:       false,
        notes:           `Provisão automática — contrato ${contrato.numero}`,
        tenant_id:       tid,
      }))
    if (novos.length) {
      localStorage.setItem(PROVISOES_LS_KEY, JSON.stringify([...existentesLS, ...novos]))
      if (!qtd) qtd = novos.length
    }
  } catch (err) {
    console.error('[gerarProvisoesPagamento] localStorage:', err.message)
  }

  return qtd
}

// ─── Provisões de comissão (Supabase) ────────────────────────────────────────
async function gerarProvisoesComissao(contrato, tenantId, branchId) {
  // Busca oportunidade relacionada para pegar equipe interna
  let oppResponsavel = contrato.responsavel || null
  let oppId = contrato.opportunity_id || null
  if (oppId) {
    const { data: opp } = await supabase
      .from('oportunidades')
      .select('responsavel, custom_fields')
      .eq('id', oppId)
      .maybeSingle()
    if (opp) oppResponsavel = opp.responsavel || opp.custom_fields?.responsavel || oppResponsavel
  }

  // Busca regras de comissão ativas do tenant
  const { data: regras } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativa')

  if (!regras?.length) return 0

  // Busca personas configuradas
  const { data: personas } = await supabase
    .from('commission_personas')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)

  const totalAdesao = (contrato.itens_adesao||[]).reduce((s,i) => s + (parseFloat(i.valor)||0), 0)
  const totalMrr    = (contrato.itens_mrr||[]).reduce((s,i)    => s + (parseFloat(i.valor)||0), 0)
  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()

  const provisoes = []

  for (const regra of regras) {
    const cfg = regra.config || {}
    const percentual = Number(cfg.percentual_comissao || 0) / 100
    const baseCalcPct = Number(cfg.base_calculo_pct || 100) / 100
    const repassePct  = Number(cfg.repasse_origem_pct || 100) / 100

    // Base de cálculo: adesão + MRR ponderados
    const baseValor = (totalAdesao + totalMrr) * baseCalcPct * repassePct
    if (!baseValor || !percentual) continue

    const valorComissao = baseValor * percentual

    // Gera uma provisão por persona configurada na regra, ou uma geral
    const personaPercs = cfg.persona_percentuais || []
    if (personaPercs.length && personas?.length) {
      for (const pp of personaPercs) {
        const persona = personas.find(p => p.id === pp.persona_id)
        if (!persona) continue
        const pct = Number(pp.cdu_pct || pp.sms_pct || pp.servicos_pct || 0) / 100
        if (!pct) continue
        provisoes.push({
          tenant_id:         tenantId,
          branch_id:         branchId || null,
          rule_id:           regra.id,
          contract_id:       contrato.id,
          company_id:        contrato.empresa_id || null,
          persona_slug:      persona.slug,
          periodo_mes:       mesAtual,
          periodo_ano:       anoAtual,
          valor_bruto:       baseValor,
          valor_comissao:    baseValor * pct,
          status:            'pendente',
          observacoes:       `Provisão automática — contrato ${contrato.numero} — ${regra.nome}`,
          custom_fields:     { opportunity_id: oppId, responsavel: oppResponsavel, persona_label: persona.label },
        })
      }
    } else {
      // Uma provisão geral pela regra sem breakdown por persona
      provisoes.push({
        tenant_id:         tenantId,
        branch_id:         branchId || null,
        rule_id:           regra.id,
        contract_id:       contrato.id,
        company_id:        contrato.empresa_id || null,
        persona_slug:      null,
        beneficiario_nome: oppResponsavel,
        periodo_mes:       mesAtual,
        periodo_ano:       anoAtual,
        valor_bruto:       baseValor,
        valor_comissao:    valorComissao,
        status:            'pendente',
        observacoes:       `Provisão automática — contrato ${contrato.numero} — ${regra.nome}`,
        custom_fields:     { opportunity_id: oppId, responsavel: oppResponsavel },
      })
    }
  }

  if (!provisoes.length) return 0
  const { error } = await supabase.from('commission_payments').insert(provisoes)
  if (error) console.error('[gerarProvisoesComissao]', error.message)
  return provisoes.length
}

// ─── Formulário (SlideOver) ───────────────────────────────────────────────────
function ContratoForm({ form, setForm, onSave, onDelete, onClose, isNew, contratos, produtos, activeTab, onTabChange, onShowFeedback, saveRef }) {
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})
  const [confirmData, setConfirmData] = useState(null)
  const [ativarData, setAtivarData] = useState(null)
  const [gerarProvisao, setGerarProvisao] = useState(true)
  const [somarMetas, setSomarMetas] = useState(true)
  const [playbookOpen, setPlaybookOpen] = useState(false)

  const { goals, save: saveGoals } = useGoals()
  const customFieldsDef = useEntityCustomFields('contracts').filter(f => !f.is_system)

  // Determina mês/ano da venda a partir de vigencia_inicio do contrato (data da venda, não pagamento)
  function periodoVenda(contratoData) {
    const ref = contratoData.vigencia_inicio || new Date().toISOString().slice(0, 10)
    const d = new Date(ref + 'T00:00:00')
    return { mes: d.getMonth() + 1, ano: d.getFullYear() }
  }

  function calcMetasMatch(contratoData) {
    const { mes, ano } = periodoVenda(contratoData)
    const todosItens = [
      ...(contratoData.itens_adesao  || []),
      ...(contratoData.itens_mrr     || []),
      ...(contratoData.itens_servico || []),
    ].filter(i => i.status_item !== 'inativo')

    const goalsAtivos = goals.filter(g =>
      g.status === 'ativa' &&
      g.periodo_mes === mes &&
      g.periodo_ano === ano &&
      g.tipo_meta === 'valor'
    )

    const matched = [] // { goal, item, valor }
    for (const item of todosItens) {
      const valor = parseFloat(item.valor) || 0
      if (!valor) continue
      const prod = produtos.find(p => String(p.id) === String(item.produto_id))

      // por produto específico
      const gProd = goalsAtivos.find(g =>
        g.tipo_alvo === 'produto' && String(g.product_id) === String(item.produto_id)
      )
      if (gProd) { matched.push({ goal: gProd, item, valor, mes, ano }); continue }

      // por categoria do produto (campo `categoria` é string como 'CRM', igual ao category_id da goal)
      if (prod?.categoria) {
        const gCat = goalsAtivos.find(g =>
          g.tipo_alvo === 'categoria' && g.category_id === prod.categoria
        )
        if (gCat) { matched.push({ goal: gCat, item, valor, mes, ano }); continue }
      }
    }
    return matched
  }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); if (errs[field]) setErrs(p => ({ ...p, [field]: '' })) }


  async function handleSave() {
    const e = {}
    if (!form.empresa_id) e.empresa_id = 'Selecione uma empresa'
    if (!form.numero?.trim()) e.numero = 'Número é obrigatório'
    else {
      const num = form.numero.trim().toUpperCase()
      const dup = contratos.find(c => c.id !== form.id && c.numero?.toUpperCase() === num)
      if (dup) e.numero = `Número já existe: ${dup.numero} (${dup.empresa_nome})`
    }
    // Bloqueio: Rascunho → Ativo requer data de 1º pagamento em todos os itens
    const ativando = !isNew
      ? (contratos.find(c => c.id === form.id)?.status === 'rascunho' && form.status === 'ativo')
      : form.status === 'ativo'
    if (ativando) {
      const todosItens = form.itens?.length > 0 ? form.itens : [...(form.itens_adesao||[]), ...(form.itens_mrr||[]), ...(form.itens_servico||[])]
      const semData = todosItens.filter(i => !i.vencimento_primeiro_pagamento)
      if (semData.length > 0) {
        e.vencimento_itens = `Preencha a data de 1º pagamento em todos os produtos (${semData.length} sem data)`
      }
    }
    customFieldsDef.filter(f => f.is_required).forEach(f => {
      const v = form.custom_fields?.[f.field_key]
      if (v === undefined || v === null || String(v).trim() === '') e[`cf_${f.field_key}`] = `${f.label} é obrigatório`
    })
    if (Object.keys(e).length) { setErrs(e); return }
    if (isNew) {
      // mostra confirm de integração antes de criar
      setConfirmData({ ...form, id: Date.now(), criado: new Date().toISOString().slice(0, 10) })
      return
    }
    if (ativando) {
      // mostra confirm antes de ativar contrato existente
      setAtivarData(form)
      return
    }
    setSaving(true)
    try {
      const steps = [{ id: 'contrato', label: `Contrato ${form.numero} atualizado`, sublabel: form.empresa_nome }]
      await onSave(form, {
        gerarProvisao: true,
        onFeedback: (provisaoSteps) => { steps.push(...provisaoSteps) },
      })
      onShowFeedback(steps)
      onClose()
    } finally { setSaving(false) }
  }

  if (saveRef) saveRef.current = handleSave

  async function aplicarMetas(contratoData, steps) {
    const metasMatch = calcMetasMatch(contratoData)
    if (!somarMetas) {
      steps.push({ id: 'metas', label: 'Registro em Metas ignorado', skip: true })
      return
    }
    if (metasMatch.length === 0) {
      steps.push({ id: 'metas', label: 'Sem meta definida para os produtos deste contrato', skip: true })
      return
    }
    // Agrupa por goal, soma valores e acumula lançamentos de origem
    const byGoal = {}
    for (const { goal, item, valor, mes, ano } of metasMatch) {
      if (!byGoal[goal.id]) byGoal[goal.id] = { goal, soma: 0, lancamentos: [] }
      byGoal[goal.id].soma += valor
      byGoal[goal.id].lancamentos.push({
        contrato_numero: contratoData.numero,
        empresa_nome:    contratoData.empresa_nome,
        produto_nome:    item.nome || '',
        valor,
        data:  contratoData.vigencia_inicio || new Date().toISOString().slice(0, 10),
        mes,
        ano,
      })
    }
    const updates = Object.values(byGoal).map(({ goal, soma, lancamentos }) => {
      const existentes = goal.custom_fields?.lancamentos || []
      return {
        ...goal,
        valor_atual: (goal.valor_atual || 0) + soma,
        custom_fields: {
          ...(goal.custom_fields || {}),
          lancamentos: [...existentes, ...lancamentos],
        },
      }
    })
    await saveGoals(updates)
    const totalSomado = Object.values(byGoal).reduce((s, { soma }) => s + soma, 0)
    const { mes, ano } = periodoVenda(contratoData)
    steps.push({
      id: 'metas',
      label: `Realizado somado em ${updates.length} meta(s)`,
      sublabel: `+${totalSomado.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })} · ${mes.toString().padStart(2,'0')}/${ano}`,
    })
  }

  async function executarAtivacao() {
    setSaving(true)
    try {
      const todosItens = ativarData.itens?.length > 0 ? ativarData.itens : [...(ativarData.itens_adesao||[]), ...(ativarData.itens_mrr||[]), ...(ativarData.itens_servico||[])]
        .filter(i => i.status_item !== 'inativo' && i.vencimento_primeiro_pagamento)
      const steps = [{ id: 'contrato', label: `Contrato ${ativarData.numero} ativado`, sublabel: ativarData.empresa_nome }]
      await onSave(ativarData, {
        gerarProvisao,
        onFeedback: (provisaoSteps) => { steps.push(...provisaoSteps) },
      })
      if (!gerarProvisao) {
        steps.push({ id: 'provisao', label: 'Provisão de pagamento ignorada', skip: true })
      } else if (todosItens.length === 0) {
        steps.push({ id: 'provisao', label: 'Nenhum produto com data de pagamento', skip: true })
      }
      await aplicarMetas(ativarData, steps)
      onShowFeedback(steps)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function executarSave() {
    setSaving(true)
    try {
      const steps = [{ id: 'contrato', label: `Contrato ${confirmData.numero} criado`, sublabel: confirmData.empresa_nome }]
      await onSave(confirmData, {
        gerarProvisao,
        onFeedback: (provisaoSteps) => { steps.push(...provisaoSteps) },
      })
      if (!gerarProvisao) steps.push({ id: 'provisao', label: 'Provisão de pagamento ignorada', skip: true })
      await aplicarMetas(confirmData, steps)
      onShowFeedback(steps)
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
                <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>Registro pendente criado em Provisões (D+0 da vigência)</div>
              </div>
            </div>
            {/* Metas — opcional */}
            {(() => {
              const mm = calcMetasMatch(confirmData)
              const { mes, ano } = periodoVenda(confirmData)
              return (
                <div style={chkRow(somarMetas)} onClick={() => setSomarMetas(g => !g)}>
                  <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                    border:`2px solid ${somarMetas ? 'var(--accent)' : 'var(--border)'}`,
                    background: somarMetas ? 'var(--accent)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                    {somarMetas && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Somar realizado em Metas</div>
                    {mm.length > 0
                      ? <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>
                          {mm.length} produto(s) com meta · período {mes.toString().padStart(2,'0')}/{ano} (data da venda)
                        </div>
                      : <div style={{ fontSize:11.5, color:'#F59E0B', marginTop:2 }}>
                          Nenhuma meta definida para os produtos deste contrato — será ignorado
                        </div>
                    }
                  </div>
                </div>
              )
            })()}
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

    {/* ─── Confirm popup: Rascunho → Ativo ─────────────────────────────── */}
    {ativarData && (
      <div style={{ position:'fixed', inset:0, background:'rgba(10,15,30,0.7)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:2200 }}>
        <div style={{ background:'var(--surface)', borderRadius:16, width:'100%', maxWidth:460,
          boxShadow:'0 24px 60px rgba(0,0,0,0.28)', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:42, height:42, borderRadius:12, background:'#D1FAE5', display:'flex',
              alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>✓</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Ativar contrato</div>
              <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:3 }}>
                Ao ativar <strong style={{ color:'var(--text)' }}>{ativarData.numero}</strong>, as seguintes ações serão executadas:
              </div>
            </div>
          </div>
          {/* Itens que gerarão provisão */}
          <div style={{ padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
            {/* Contrato — sempre */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:10,
              border:'1.5px solid var(--accent)', background:'var(--accent-glow)' }}>
              <div style={{ width:18, height:18, borderRadius:4, background:'var(--accent)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Status alterado para Ativo</div>
                <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{ativarData.numero} · {ativarData.empresa_nome}</div>
              </div>
            </div>
            {/* Provisões por produto */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:10, cursor:'pointer',
              border:`1.5px solid ${gerarProvisao ? 'var(--accent)' : 'var(--border)'}`,
              background: gerarProvisao ? 'var(--accent-glow)' : 'var(--surface2)', transition:'all 0.15s' }}
              onClick={() => setGerarProvisao(g => !g)}>
              <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                border:`2px solid ${gerarProvisao ? 'var(--accent)' : 'var(--border)'}`,
                background: gerarProvisao ? 'var(--accent)' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                {gerarProvisao && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Gerar provisões de pagamento</div>
                {(() => {
                  const itens = (ativarData.itens?.length > 0 ? ativarData.itens : [...(ativarData.itens_adesao||[]), ...(ativarData.itens_mrr||[]), ...(ativarData.itens_servico||[])])
                    .filter(i => i.status_item !== 'inativo' && i.vencimento_primeiro_pagamento)
                  return (
                    <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>
                      {itens.length} produto(s) com data de 1º pagamento · uma provisão por produto em Provisões
                    </div>
                  )
                })()}
              </div>
            </div>
            {/* Metas — opcional */}
            {(() => {
              const mm = calcMetasMatch(ativarData)
              const { mes, ano } = periodoVenda(ativarData)
              return (
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:10, cursor:'pointer',
                  border:`1.5px solid ${somarMetas ? 'var(--accent)' : 'var(--border)'}`,
                  background: somarMetas ? 'var(--accent-glow)' : 'var(--surface2)', transition:'all 0.15s' }}
                  onClick={() => setSomarMetas(g => !g)}>
                  <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                    border:`2px solid ${somarMetas ? 'var(--accent)' : 'var(--border)'}`,
                    background: somarMetas ? 'var(--accent)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                    {somarMetas && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Somar realizado em Metas</div>
                    {mm.length > 0
                      ? <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>
                          {mm.length} produto(s) com meta · período {mes.toString().padStart(2,'0')}/{ano} (data da venda)
                        </div>
                      : <div style={{ fontSize:11.5, color:'#F59E0B', marginTop:2 }}>
                          Nenhuma meta definida para os produtos deste contrato — será ignorado
                        </div>
                    }
                  </div>
                </div>
              )
            })()}
          </div>
          {/* Actions */}
          <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)',
            display:'flex', justifyContent:'flex-end', gap:10 }}>
            <Button variant="ghost" onClick={() => setAtivarData(null)}>Voltar</Button>
            <Button onClick={executarAtivacao} disabled={saving}>{saving ? 'Ativando…' : 'Ativar contrato'}</Button>
          </div>
        </div>
      </div>
    )}

    {/* ── Playbook hint (flag recolhida) ── */}
    <ContratoPlaybookHint form={form} open={playbookOpen} onToggle={() => setPlaybookOpen(o => !o)} onGoTab={() => { setPlaybookOpen(false); onTabChange('playbook') }} />

    {activeTab === 'playbook' && (
      <ContratoPlaybookPanel form={form} setForm={setForm} />
    )}

    <div style={{ display: activeTab === 'dados' ? 'flex' : 'none', flexDirection: 'column', gap: 24 }}>
      {/* Resumo financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        {[
          { label: 'Adesão',  val: (form.itens||[]).filter(i => ['licenca','hardware'].includes(i.tipo_produto)).reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '' },
          { label: 'MRR',     val: (form.itens||[]).filter(i => i.tipo_produto === 'saas').reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '/mês' },
          { label: 'Serviço', val: (form.itens||[]).filter(i => ['servico','consultoria'].includes(i.tipo_produto)).reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '' },
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
          <FormField label="Vendedor">
            <input className="so-field" value={form.vendedor || ''} onChange={e => set('vendedor', e.target.value)} placeholder="Nome do vendedor" />
          </FormField>
          <FormField label="Origem">
            <select className="so-field" value={form.origem || ''} onChange={e => set('origem', e.target.value)}>
              <option value="">— Não definida —</option>
              <option value="direta">Direta</option>
              <option value="indireta">Indireta</option>
              <option value="incentivada">Incentivada</option>
            </select>
          </FormField>
          <FormField label="Tipo de venda">
            <TipoVendaField value={form.tipo_venda || ''} onChange={v => set('tipo_venda', v)} />
          </FormField>
          <FormField label="Inconsistência" span={2}>
            <select className="so-field" value={form.inconsistencia_status || 'sem_inconsistencia'} onChange={e => set('inconsistencia_status', e.target.value)}>
              {INCONSISTENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        </FormGrid>
      </FormSection>

      {errs.vencimento_itens && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8,
          background:'#FEF2F2', border:'1px solid #EF4444', fontSize:12, color:'#991B1B', lineHeight:1.5 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠</span>
          <span><strong>Ativação bloqueada:</strong> {errs.vencimento_itens}</span>
        </div>
      )}

      <FormSection label="Produtos contratados">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* cabeçalho das colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 90px 80px 90px 28px', gap: 6, padding: '0 12px 4px', marginTop: 2 }}>
            {['Produto', 'Qtd', 'Tabela', 'Desc.', 'Contratado', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          <ProdutosList
            itens={form.itens || []}
            onChange={itens => set('itens', itens)}
            produtos={produtos}
            empresaId={form.empresa_id}
            contratos={contratos}
          />
        </div>
      </FormSection>

      <FormSection label="Observações">
        <textarea className="so-field" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} placeholder="Condições especiais, anotações comerciais…" style={{ minHeight: 80, resize: 'vertical' }} />
      </FormSection>

      {customFieldsDef.length > 0 && (
        <FormSection label="Campos personalizados">
          <FormGrid cols={2}>
            {customFieldsDef.map(f => (
              <FormField key={f.id} label={f.label + (f.is_required ? ' *' : '')} error={errs[`cf_${f.field_key}`]}>
                {f.field_type === 'select' ? (
                  <select className="so-field" value={form.custom_fields?.[f.field_key] || ''}
                    onChange={e => set('custom_fields', { ...form.custom_fields, [f.field_key]: e.target.value })}>
                    <option value="">—</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.field_type === 'boolean' ? (
                  <input type="checkbox" checked={!!form.custom_fields?.[f.field_key]}
                    onChange={e => set('custom_fields', { ...form.custom_fields, [f.field_key]: e.target.checked })} />
                ) : f.field_type === 'textarea' ? (
                  <textarea className="so-field" value={form.custom_fields?.[f.field_key] || ''}
                    onChange={e => set('custom_fields', { ...form.custom_fields, [f.field_key]: e.target.value })}
                    style={{ minHeight: 60, resize: 'vertical' }} />
                ) : (
                  <input className="so-field" type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                    value={form.custom_fields?.[f.field_key] || ''}
                    onChange={e => set('custom_fields', { ...form.custom_fields, [f.field_key]: e.target.value })} />
                )}
              </FormField>
            ))}
          </FormGrid>
        </FormSection>
      )}

    </div>

    </>
  )
}

// ─── Playbook hint (flag recolhida no topo do form) ──────────────────────────
function ContratoPlaybookHint({ form, open, onToggle, onGoTab }) {
  const { playbooks } = usePlaybooks()
  const adminPlaybooks = useMemo(
    () => playbooks.filter(p => p.tipo === 'administrativo' || p.segment === 'administrativo' || (p.segment||'').toLowerCase().includes('admin')),
    [playbooks]
  )
  const pb = useMemo(() => adminPlaybooks.find(p => p.id === form.playbook_id) || null, [adminPlaybooks, form.playbook_id])
  const steps = useMemo(() => {
    if (!pb) return []
    return (pb.steps || []).filter(s => s.status_contrato === form.status || !s.status_contrato)
  }, [pb, form.status])
  if (!pb || steps.length === 0) return null
  const stCfg = STATUS_CONTRATO.find(s => s.value === form.status)
  return (
    <div style={{ marginBottom:8, border:'1px solid var(--border2)', borderRadius:10, overflow:'hidden' }}>
      <button onClick={onToggle} style={{
        width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
        background:'var(--surface2)', border:'none', cursor:'pointer', fontFamily:'var(--font)',
        borderBottom: open ? '1px solid var(--border2)' : 'none',
      }}>
        <span style={{ width:3, height:14, borderRadius:2, background:'var(--accent)', flexShrink:0 }} />
        <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', flex:1, textAlign:'left' }}>
          Playbook · {pb.title}
        </span>
        {stCfg && <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:10,
          background: stCfg.bg, color: stCfg.text }}>{stCfg.label}</span>}
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{steps.length} atividade{steps.length !== 1 ? 's' : ''}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          {steps.slice(0, 4).map((s, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ width:18, height:18, borderRadius:5, background:'var(--accent-glow)',
                color:'var(--accent)', fontSize:10, fontWeight:700, display:'flex', alignItems:'center',
                justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{s.title || s.titulo}</div>
                {s.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{s.description}</div>}
              </div>
            </div>
          ))}
          <button onClick={onGoTab} style={{ alignSelf:'flex-start', fontSize:11, color:'var(--accent)',
            background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, padding:0, marginTop:4 }}>
            Ver playbook completo →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Playbook panel (aba dedicada) ────────────────────────────────────────────
function ContratoPlaybookPanel({ form, setForm }) {
  const { playbooks } = usePlaybooks()
  const adminPlaybooks = useMemo(
    () => playbooks.filter(p => p.tipo === 'administrativo' || p.segment === 'administrativo' || (p.segment||'').toLowerCase().includes('admin')),
    [playbooks]
  )
  const pb      = useMemo(() => adminPlaybooks.find(p => p.id === form.playbook_id) || null, [adminPlaybooks, form.playbook_id])
  const stCfg   = STATUS_CONTRATO.find(s => s.value === form.status)
  const steps   = useMemo(() => {
    if (!pb) return []
    return (pb.steps || []).filter(s => !s.status_contrato || s.status_contrato === form.status || s.status_contrato === 'todos')
  }, [pb, form.status])
  const allSteps    = useMemo(() => pb ? (pb.steps || []) : [], [pb])
  const resources   = useMemo(() => pb ? (pb.resources || []) : [], [pb])
  const refs        = useMemo(() => pb ? (pb.refs || []) : [], [pb])

  const S = {
    root:      { padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 },
    sLabel:    { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
                 color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 },
    line:      { flex:1, height:1, background:'var(--border2)' },
    stepCard:  { background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:'14px 16px' },
    stepTitle: { fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:8 },
    badge:     { display:'inline-flex', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700 },
    mdP:       { fontSize:13, color:'var(--text-soft)', lineHeight:1.7, margin:'0 0 6px' },
    mdH2:      { fontSize:13, fontWeight:700, color:'var(--text)', margin:'12px 0 4px', borderBottom:'1px solid var(--border2)', paddingBottom:4 },
    mdH3:      { fontSize:12, fontWeight:700, color:'var(--text)', margin:'10px 0 4px' },
    mdLi:      { fontSize:13, color:'var(--text-soft)', lineHeight:1.65, marginBottom:3 },
    resGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:8 },
    resCard:   { border:'1px solid var(--border2)', borderRadius:9, padding:'10px 12px',
                 background:'var(--surface)', display:'flex', flexDirection:'column', gap:6 },
    resTitle:  { fontSize:12, fontWeight:600, color:'var(--text)', lineHeight:1.35 },
    resLink:   { fontSize:11, color:'var(--accent)', textDecoration:'none', fontWeight:600, marginTop:'auto' },
    refCard:   { border:'1px solid var(--border2)', borderRadius:9, padding:'12px 14px',
                 background:'var(--surface)', display:'flex', alignItems:'flex-start', gap:10 },
    refLogo:   { width:32, height:32, borderRadius:7, display:'flex', alignItems:'center',
                 justifyContent:'center', fontWeight:800, fontSize:11, flexShrink:0 },
    empty:     { padding:'16px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 },
  }

  function MiniMd({ content }) {
    if (!content) return null
    return (
      <div>
        {(content || '').split('\n').map((line, i) => {
          if (line.startsWith('## '))  return <div key={i} style={S.mdH2}>{line.slice(3)}</div>
          if (line.startsWith('### ')) return <div key={i} style={S.mdH3}>{line.slice(4)}</div>
          if (line.startsWith('- ') || line.startsWith('* '))
            return <div key={i} style={{ display:'flex', gap:6, marginBottom:3 }}>
              <span style={{ color:'var(--accent)', flexShrink:0 }}>•</span>
              <span style={S.mdLi}>{line.slice(2)}</span>
            </div>
          if (line.startsWith('> '))
            return <div key={i} style={{ borderLeft:'3px solid var(--accent)', paddingLeft:10,
              margin:'6px 0', background:'var(--accent-glow)', borderRadius:'0 6px 6px 0', padding:'6px 10px' }}>
              <span style={{ fontSize:13, color:'var(--text-soft)', fontStyle:'italic' }}>{line.slice(2)}</span>
            </div>
          if (line.trim() === '') return null
          return <p key={i} style={S.mdP}>{line}</p>
        })}
      </div>
    )
  }

  function SectionHeading({ icon, label, badge }) {
    return (
      <div style={{ ...S.sLabel, marginBottom:8 }}>
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        {badge}
        <span style={S.line} />
      </div>
    )
  }

  return (
    <div style={S.root}>
      {/* Seletor */}
      <div>
        <SectionHeading label="Playbook administrativo" />
        <SearchSelect
          options={adminPlaybooks.map(p => ({ id: p.id, label: p.title||p.titulo, sublabel: p.description||p.segment||'', color:'var(--accent)' }))}
          value={form.playbook_id || null}
          onChange={id => setForm(f => ({ ...f, playbook_id: id || null }))}
          placeholder="Pesquisar playbook administrativo…"
          noResults="Nenhum playbook do tipo Administrativo encontrado"
        />
        {adminPlaybooks.length === 0 && (
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:8, padding:'8px 12px',
            background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border2)' }}>
            Nenhum playbook do tipo <strong>Administrativo</strong> cadastrado. Crie um em Playbooks.
          </div>
        )}
      </div>

      {pb && (
        <>
          {/* Header do playbook */}
          <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:16, borderBottom:'1px solid var(--border2)' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', letterSpacing:'-0.2px' }}>{pb.title}</div>
              {pb.description && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{pb.description}</div>}
            </div>
            {stCfg && <span style={{ ...S.badge, background:stCfg.bg, color:stCfg.text }}>{stCfg.label}</span>}
          </div>

          {/* Atividades para este status */}
          <div>
            <SectionHeading icon="🎯" label="Atividades para este status"
              badge={stCfg && <span style={{ ...S.badge, background:stCfg.bg, color:stCfg.text }}>{stCfg.label}</span>} />
            {steps.length === 0 ? (
              <div style={S.empty}>
                Nenhuma atividade configurada para o status <strong>{stCfg?.label || form.status}</strong> neste playbook.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {steps.map((s, i) => (
                  <div key={s.id || i} style={S.stepCard}>
                    <div style={S.stepTitle}>{s.icone && <span style={{ marginRight:6 }}>{s.icone}</span>}{s.title || s.titulo}</div>
                    <MiniMd content={s.content} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Todas as atividades */}
          {allSteps.length > 0 && (
            <div>
              <SectionHeading icon="📋" label="Todas as atividades do playbook" />
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {allSteps.map((s, i) => {
                  const sc = s.status_contrato ? STATUS_CONTRATO.find(x => x.value === s.status_contrato) : null
                  const isActive = !s.status_contrato || s.status_contrato === form.status || s.status_contrato === 'todos'
                  return (
                    <div key={s.id || i} style={{ ...S.stepCard, opacity: isActive ? 1 : 0.45 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom: s.content ? 6 : 0 }}>
                            {s.icone && <span style={{ marginRight:6 }}>{s.icone}</span>}{s.title||s.titulo}
                          </div>
                          {isActive && <MiniMd content={s.content} />}
                        </div>
                        {sc && <span style={{ ...S.badge, background:sc.bg, color:sc.text, flexShrink:0 }}>{sc.label}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Materiais de apoio */}
          {resources.length > 0 && (
            <div>
              <SectionHeading icon="📂" label="Materiais de Apoio" />
              <div style={S.resGrid}>
                {resources.map((res, i) => (
                  <div key={res.id || i} style={S.resCard}>
                    <div style={S.resTitle}>{res.title}</div>
                    {res.url && <a href={res.url} target="_blank" rel="noreferrer" style={S.resLink}>↗ Abrir</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clientes de referência */}
          {refs.length > 0 && (
            <div>
              <SectionHeading icon="🏆" label="Clientes de Referência" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {refs.map((ref, i) => (
                  <div key={ref.id || i} style={S.refCard}>
                    <div style={{ ...S.refLogo, background:(ref.logo_color||'var(--accent)')+'22', color:ref.logo_color||'var(--accent)', border:`1px solid ${ref.logo_color||'var(--accent)'}44` }}>
                      {ref.logo_initials || (ref.company_name||'').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{ref.company_name}</div>
                      {ref.summary && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{ref.summary}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
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

// ─── Importação (padrão igual ao de Empresas.js) ──────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const cells = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === sep && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  })
  return { headers, rows }
}

// Colunas fixas — cobrem todos os campos editáveis do cadastro de contrato
// (aba Dados) exceto "Oportunidade de origem", que não é um campo de
// formulário: só aparece já vinculado quando o contrato nasce do Pipeline.
// Um produto por slot (Adesão/MRR/Serviço), cada um em 4 colunas próprias —
// mais claro numa planilha do que um código compacto numa célula só. Reflete
// o mesmo modelo de slots já usado no restante do módulo (const SLOTS acima).
const ITEM_SLOTS = ['adesao', 'mrr', 'servico']
const ITEM_SLOT_COLS = ITEM_SLOTS.flatMap(s => [`${s}_produto`, `${s}_qtd`, `${s}_valor`, `${s}_desconto`])

const IMPORT_COLS_BASE = [
  'numero', 'empresa_cnpj', 'status', 'vigencia_inicio', 'vigencia_fim',
  'responsavel', 'vendedor', 'origem', 'tipo_venda', 'inconsistencia_status',
  'observacoes', ...ITEM_SLOT_COLS,
]
const STATUS_CONTRATO_VALUES = STATUS_CONTRATO.map(s => s.value)
const ORIGEM_CONTRATO_VALUES = ['direta', 'indireta', 'incentivada']
const INCONSISTENCIA_VALUES = INCONSISTENCIA_OPTS.map(o => o.value)
const PREVIEW_ROW_LIMIT = 500

// Lê os 3 grupos de colunas (adesao_*/mrr_*/servico_*) e monta o array
// `itens` do contrato — cada slot é opcional; só vira item se `<slot>_produto`
// vier preenchido. Resolve o produto pelo `codigo` cadastrado em Produtos
// (ou pelo nome exato, como alternativa).
function buildItensFromRow(row, productMap) {
  const itens = [], errors = []
  ITEM_SLOTS.forEach(slot => {
    const codigoOuNome = row[`${slot}_produto`]?.trim()
    if (!codigoOuNome) return
    const produto = productMap.get(codigoOuNome.toLowerCase())
    if (!produto) { errors.push(`Produto não encontrado (${slot}): "${codigoOuNome}"`); return }
    const qtdStr = row[`${slot}_qtd`]?.trim()
    const valorStr = row[`${slot}_valor`]?.trim()
    const descStr = row[`${slot}_desconto`]?.trim()
    itens.push({
      produto_id: produto.id, nome: produto.nome, tipo_produto: produto.tipo,
      quantidade: qtdStr ? Number(qtdStr) || 1 : 1,
      valor: valorStr ? Number(valorStr) || 0 : (produto.preco || 0),
      tabela: produto.preco || null,
      desconto_pct: descStr ? Number(descStr) || 0 : 0,
      desconto_autorizado: false, status_item: 'ativo',
      vencimento_primeiro_pagamento: '',
    })
  })
  return { itens, errors }
}

// Aceita tanto o formato brasileiro (DD/MM/AAAA, o que qualquer planilha
// exportada no Brasil usa) quanto o ISO (AAAA-MM-DD) — sempre devolve ISO,
// que é o que o banco espera. `null` = vazio (ok), `undefined` = inválido.
function parseDataFlexivel(v) {
  if (!v?.trim()) return null
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return v
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return undefined
}

// companyCnpjMap/productMap: pré-computados uma única vez pro arquivo
// inteiro; seenNumero: Set<numero> das linhas já processadas do próprio
// arquivo — mesmo raciocínio O(1)-por-linha do import de Empresas.
// Não checa mais se a empresa já existe: se o CNPJ não bater com nenhuma
// cadastrada, a importação cria a empresa automaticamente (tipo "rascunho")
// — só o formato do CNPJ precisa ser válido aqui.
function validateImportRow(row, productMap, existingNumeros, seenNumero) {
  const errors = []
  const cnpjRaw = (row.empresa_cnpj || '').replace(/\D/g, '')
  if (!cnpjRaw) errors.push('CNPJ da empresa é obrigatório')
  else if (cnpjRaw.length !== 14) errors.push('CNPJ inválido (precisa de 14 dígitos)')

  if (row.numero?.trim()) {
    if (existingNumeros.has(row.numero.trim())) errors.push(`Número de contrato já existe: ${row.numero}`)
    if (seenNumero.has(row.numero.trim())) errors.push('Número de contrato duplicado no arquivo')
  }
  if (row.status && !STATUS_CONTRATO_VALUES.includes(row.status))
    errors.push(`Status inválido: "${row.status}". Use: ${STATUS_CONTRATO_VALUES.join(', ')}`)
  if (row.origem && !ORIGEM_CONTRATO_VALUES.includes(row.origem))
    errors.push(`Origem inválida: "${row.origem}". Use: ${ORIGEM_CONTRATO_VALUES.join(', ')}`)
  if (row.inconsistencia_status && !INCONSISTENCIA_VALUES.includes(row.inconsistencia_status))
    errors.push(`Inconsistência inválida: "${row.inconsistencia_status}". Use: ${INCONSISTENCIA_VALUES.join(', ')}`)
  if (row.vigencia_inicio && parseDataFlexivel(row.vigencia_inicio) === undefined)
    errors.push('Data de início inválida (use DD/MM/AAAA ou AAAA-MM-DD)')
  if (row.vigencia_fim && parseDataFlexivel(row.vigencia_fim) === undefined)
    errors.push('Data de fim inválida (use DD/MM/AAAA ou AAAA-MM-DD)')
  errors.push(...buildItensFromRow(row, productMap).errors)
  return errors
}

function ImportContratosModal({ onClose, onDownloadTemplate, onDownloadErrors, companies, produtos, customFieldKeys, contratosExistentes, onCreateMissingCompanies, onImport }) {
  const existingNumeros = useMemo(() => new Set(contratosExistentes.map(c => c.numero)), [contratosExistentes])
  const importCols = useMemo(() => [...IMPORT_COLS_BASE, ...customFieldKeys], [customFieldKeys])
  const [step, setStep]           = useState('upload') // 'upload' | 'preview'
  const [parsed, setParsed]       = useState(null)
  const [dragging, setDragging]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const fileRef = useRef(null)

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows } = parseCSV(e.target.result)
      const companyCnpjMap = new Map(companies.map(c => [c.cnpj.replace(/\D/g, ''), c]))
      const productMap = new Map()
      produtos.forEach(p => {
        if (p.codigo) productMap.set(String(p.codigo).toLowerCase(), p)
        productMap.set(String(p.nome).toLowerCase(), p)
      })
      const seenNumero = new Set()
      const rowResults = rows.map((row, i) => {
        const errors = validateImportRow(row, productMap, existingNumeros, seenNumero)
        const ok = errors.length === 0
        if (ok && row.numero?.trim()) seenNumero.add(row.numero.trim())
        return { row, errors, ok, line: i + 2 }
      })
      setParsed({ fileName: file.name, rowResults, companyCnpjMap, productMap })
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  async function handleConfirmImport() {
    // gerarNumero olha só pra `contratosExistentes` — se várias linhas do
    // arquivo vierem sem número, precisa ir "crescendo" a lista conforme gera
    // cada uma, senão todas ganhariam o mesmo número auto.
    const geradosAteAgora = [...contratosExistentes]
    const okResults = parsed.rowResults.filter(r => r.ok)

    // Empresa não cadastrada pra esse CNPJ → cria automaticamente (tipo
    // "rascunho", pra ser validada/completada depois via Receita Federal em
    // Empresas). Uma vez por CNPJ distinto, mesmo que várias linhas do
    // arquivo apontem pro mesmo CNPJ novo — o próprio progresso dessa etapa
    // aparece no widget flutuante (mesmo padrão do import em si).
    setImporting(true)
    const cnpjsFaltantes = [...new Set(
      okResults.map(r => (r.row.empresa_cnpj || '').replace(/\D/g, '')).filter(c => !parsed.companyCnpjMap.has(c))
    )]
    const criadasPorCnpj = await onCreateMissingCompanies(cnpjsFaltantes)

    const okRows = okResults.map(r => {
      const cnpjRaw = (r.row.empresa_cnpj || '').replace(/\D/g, '')
      const empresa = parsed.companyCnpjMap.get(cnpjRaw) || criadasPorCnpj.get(cnpjRaw)
      let numero = r.row.numero?.trim()
      if (!numero) { numero = gerarNumero(geradosAteAgora); geradosAteAgora.push({ numero }) }
      const { itens } = buildItensFromRow(r.row, parsed.productMap)
      const custom_fields = Object.fromEntries(
        customFieldKeys.filter(k => r.row[k]?.trim()).map(k => [k, r.row[k]])
      )
      return {
        ...EMPTY_FORM,
        numero,
        empresa_id:            empresa?.id || null,
        empresa_nome:          empresa?.fantasia || empresa?.razao || '',
        status:                r.row.status || 'ativo',
        vigencia_inicio:       parseDataFlexivel(r.row.vigencia_inicio) || '',
        vigencia_fim:          parseDataFlexivel(r.row.vigencia_fim) || '',
        responsavel:           r.row.responsavel || '',
        vendedor:              r.row.vendedor || '',
        origem:                r.row.origem || '',
        tipo_venda:            r.row.tipo_venda || '',
        inconsistencia_status: r.row.inconsistencia_status || 'sem_inconsistencia',
        observacoes:           r.row.observacoes || '',
        itens,
        custom_fields,
      }
    })
    const log = {
      id: Date.now(),
      fileName: parsed.fileName,
      date: new Date().toLocaleString('pt-BR'),
      total: parsed.rowResults.length,
      imported: okRows.length,
      errors: parsed.rowResults.filter(r => !r.ok).length,
      empresasCriadas: criadasPorCnpj.size,
      rows: parsed.rowResults,
    }
    setImportError(null)
    const result = await onImport(okRows, log)
    setImporting(false)
    if (result?.ok === false) setImportError(result.message || 'Erro desconhecido ao importar.')
    else onClose()
  }

  const okCount  = parsed?.rowResults.filter(r => r.ok).length ?? 0
  const errCount = parsed?.rowResults.filter(r => !r.ok).length ?? 0

  return (
    <div style={impM.overlay} onClick={e => { if (e.target === e.currentTarget && !importing) onClose() }}>
      <div style={{ ...impM.modal, maxWidth: 700 }}>
        <div style={impM.header}>
          <div>
            <div style={impM.title}>Importar contratos</div>
            <div style={impM.subtitle}>
              {importing ? 'Importando — acompanhe o progresso no canto da tela…' : 'Arquivo CSV com separador ponto-e-vírgula (;) — UTF-8'}
            </div>
          </div>
          <button style={{ ...impM.closeBtn, opacity: importing ? 0.4 : 1, cursor: importing ? 'not-allowed' : 'pointer' }}
            onClick={() => !importing && onClose()} disabled={importing}>✕</button>
        </div>

        {step === 'upload' && (
          <div style={{ padding: 24 }}>
            <div style={imp.templateBox}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Template CSV</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {importCols.length} colunas — inclui linha de exemplo
                </div>
              </div>
              <Button size="sm" onClick={onDownloadTemplate}>↓ Baixar template</Button>
            </div>

            <div
              style={{ ...imp.dropzone, ...(dragging ? imp.dropzoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <span style={{ fontSize: 28 }}>📂</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Arraste o arquivo aqui ou clique para selecionar
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Apenas arquivos .csv</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => processFile(e.target.files[0])} />
            </div>

            <div style={imp.colsBox}>
              <div style={imp.colsLabel}>Colunas esperadas</div>
              <div style={imp.colsList}>
                {importCols.map(c => <span key={c} style={imp.colTag}>{c}</span>)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                A empresa é resolvida pelo CNPJ. Se não existir nenhuma cadastrada com esse CNPJ, ela é
                criada automaticamente (tipo <b>Rascunho</b>) — depois é só validar/completar os dados em
                Empresas usando a edição em lote com consulta à Receita Federal.<br/>
                Produtos: um por slot, em colunas separadas — <code>adesao_produto</code>/<code>adesao_qtd</code>/<code>adesao_valor</code>/<code>adesao_desconto</code>,
                o mesmo padrão para <code>mrr_*</code> e <code>servico_*</code>. Só <code>*_produto</code> é obrigatório
                pra contar (resolvido pelo código ou nome exato cadastrado em Produtos); os demais assumem quantidade 1,
                preço de tabela e 0% de desconto quando vazios. Deixe o slot todo em branco se o contrato não tiver esse tipo de produto.
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={imp.summary}>
              <div style={imp.summaryItem}>
                <span style={imp.summaryVal}>{parsed.rowResults.length}</span>
                <span style={imp.summaryLbl}>linhas</span>
              </div>
              <div style={imp.summaryItem}>
                <span style={{ ...imp.summaryVal, color: 'var(--green)' }}>{okCount}</span>
                <span style={imp.summaryLbl}>prontas</span>
              </div>
              <div style={imp.summaryItem}>
                <span style={{ ...imp.summaryVal, color: errCount > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{errCount}</span>
                <span style={imp.summaryLbl}>com erro</span>
              </div>
              {errCount > 0 && (
                <button type="button" onClick={() => onDownloadErrors(parsed.rowResults, parsed.fileName)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px',
                    fontSize: 11.5, fontWeight: 600, color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  ↓ Baixar erros (CSV)
                </button>
              )}
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                {parsed.fileName}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px' }}>
              {parsed.rowResults.length > PREVIEW_ROW_LIMIT && (
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', padding: '8px 0' }}>
                  Mostrando as primeiras {PREVIEW_ROW_LIMIT} de {parsed.rowResults.length} linhas — a importação processa o arquivo inteiro.
                </div>
              )}
              <table style={impTable.table}>
                <thead>
                  <tr>
                    <th style={impTable.th}>Linha</th>
                    <th style={impTable.th}>Número</th>
                    <th style={impTable.th}>CNPJ</th>
                    <th style={impTable.th}>Status</th>
                    <th style={impTable.th}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rowResults.slice(0, PREVIEW_ROW_LIMIT).map(({ row, errors, ok, line }) => (
                    <tr key={line} style={{ ...impTable.tr, background: ok ? undefined : 'rgba(220,38,38,0.03)' }}>
                      <td style={{ ...impTable.td, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', width: 50 }}>{line}</td>
                      <td style={{ ...impTable.td, fontSize: 12 }}>{row.numero || <span style={{ color: 'var(--text-muted)' }}>auto</span>}</td>
                      <td style={{ ...impTable.td, fontFamily: 'var(--mono)', fontSize: 11 }}>{row.empresa_cnpj || '—'}</td>
                      <td style={{ ...impTable.td, fontSize: 11 }}>{row.status || 'ativo'}</td>
                      <td style={impTable.td}>
                        {ok
                          ? <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>✓ OK</span>
                          : <div>{errors.map((e, i) => <div key={i} style={{ color: 'var(--red)', fontSize: 11 }}>✕ {e}</div>)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importError && (
              <div style={{ margin: '0 24px 12px', padding: '10px 14px', borderRadius: 8,
                background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
                color: 'var(--red)', fontSize: 12.5 }}>
                ✕ A importação falhou: {importError} — nenhum contrato a mais foi criado além do que já aparecer na lista. Tente novamente ou reduza o arquivo.
              </div>
            )}
            <div style={{ ...impM.footer, padding: '14px 24px', borderTop: '1px solid var(--border2)' }}>
              <Button variant="secondary" disabled={importing} onClick={() => setStep('upload')}>← Voltar</Button>
              <div style={{ flex: 1 }} />
              {errCount > 0 && okCount === 0 && (
                <span style={{ fontSize: 12, color: 'var(--red)' }}>Nenhuma linha válida para importar</span>
              )}
              {errCount > 0 && okCount > 0 && (
                <span style={{ fontSize: 12, color: 'var(--yellow-text)' }}>{errCount} linha{errCount > 1 ? 's' : ''} serão ignoradas</span>
              )}
              <Button disabled={okCount === 0 || importing} onClick={handleConfirmImport}>
                {importing ? 'Importando…' : `Importar ${okCount} contrato${okCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ImportContratosLogModal({ logs, onClose, onDownloadErrors }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div style={impM.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...impM.modal, maxWidth: 720 }}>
        <div style={impM.header}>
          <div>
            <div style={impM.title}>Log de importações</div>
            <div style={impM.subtitle}>{logs.length} operação{logs.length !== 1 ? 'ões' : ''} registrada{logs.length !== 1 ? 's' : ''}</div>
          </div>
          <button style={impM.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.map(log => (
            <div key={log.id} style={imp.logEntry}>
              <div style={imp.logHeader} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <span style={{ fontSize: 14 }}>📄</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{log.fileName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{log.date}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={imp.logPill}>{log.total} total</span>
                  <span style={{ ...imp.logPill, background: 'var(--green-bg)', color: 'var(--green-text)' }}>✓ {log.imported}</span>
                  {log.errors > 0 && <span style={{ ...imp.logPill, background: 'var(--red-bg)', color: 'var(--red-text)' }}>✕ {log.errors}</span>}
                  {log.errors > 0 && (
                    <button type="button" onClick={e => { e.stopPropagation(); onDownloadErrors(log.rows, log.fileName) }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
                        fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      ↓ CSV
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{expanded === log.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === log.id && (
                <div style={{ borderTop: '1px solid var(--border2)', overflowX: 'auto' }}>
                  <table style={{ ...impTable.table, fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={impTable.th}>Linha</th>
                        <th style={impTable.th}>Número</th>
                        <th style={impTable.th}>CNPJ</th>
                        <th style={impTable.th}>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.rows.map(({ row, errors, ok, line }) => (
                        <tr key={line} style={impTable.tr}>
                          <td style={{ ...impTable.td, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{line}</td>
                          <td style={{ ...impTable.td, fontSize: 11 }}>{row.numero || 'auto'}</td>
                          <td style={{ ...impTable.td, fontFamily: 'var(--mono)', fontSize: 10 }}>{row.empresa_cnpj || '—'}</td>
                          <td style={impTable.td}>
                            {ok
                              ? <span style={{ color: 'var(--green)', fontSize: 10, fontWeight: 600 }}>✓ Importado</span>
                              : <div>{errors.map((e, i) => <div key={i} style={{ color: 'var(--red)', fontSize: 10 }}>✕ {e}</div>)}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border2)' }}>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}

const imp = {
  templateBox:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 },
  dropzone:       { border: '2px dashed var(--border)', borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16, transition: 'all 0.15s', background: 'var(--surface2)' },
  dropzoneActive: { borderColor: 'var(--accent)', background: 'var(--accent-glow)' },
  colsBox:        { background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' },
  colsLabel:      { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 },
  colsList:       { display: 'flex', flexWrap: 'wrap', gap: 5 },
  colTag:         { padding: '2px 8px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-soft)' },
  summary:        { display: 'flex', alignItems: 'center', gap: 20, padding: '12px 24px', borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' },
  summaryItem:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  summaryVal:     { fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', lineHeight: 1 },
  summaryLbl:     { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' },
  logEntry:       { border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden' },
  logHeader:      { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', background: 'var(--surface2)' },
  logPill:        { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', background: 'var(--surface3)', color: 'var(--text-muted)' },
}

const impTable = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' },
  tr:    { borderBottom: '1px solid var(--border2)' },
  td:    { padding: '9px 12px', fontSize: 12.5, verticalAlign: 'middle' },
}

const impM = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:    { background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
  header:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border2)' },
  title:    { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginTop: 3 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 4, lineHeight: 1 },
  footer:   { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border2)', flexShrink: 0 },
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Contratos() {
  const { contratos, setContratos, save: saveContrato, remove: removeContrato, importMany } = useContracts()
  const { registrar: log } = useAuditLog()
  const { produtos } = useProducts()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()
  const { companies, add: addCompany } = useCompanies()
  const [search, setSearch]           = useLocalState('browse:contratos_browse:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:contratos_browse:filters', {})
  const [editando, setEditando]       = useState(null)
  const [contratoTab, setContratoTab] = useState('dados')
  const contratoSaveRef = useRef(null)
  const [feedbackSteps, setFeedbackSteps] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importLogs, setImportLogs]   = useState([])
  const [showImportLog, setShowImportLog] = useState(false)

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

  const kpisNode = (data) => {
    const ativos           = data.filter(c => c.status === 'ativo').length
    const totalMRR         = data.filter(c => c.status === 'ativo').reduce((s, c) => s + [...(c.itens_mrr||[]), ...(c.itens_servico||[])].reduce((a,i) => a + (parseFloat(i.valor)||0), 0), 0)
    const totalAdesao      = data.filter(c => c.status === 'ativo').reduce((s, c) => s + (c.itens_adesao||[]).reduce((a,i) => a + (parseFloat(i.valor)||0), 0), 0)
    const qtdInadimplentes = data.filter(c => inadimplentesIds.has(String(c.id))).length
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {[
          { label: 'Total de contratos', value: data.length,            mono: false },
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
  }

  async function handleSave(data, opts = {}) {
    const anterior = contratos.find(c => c.id === data.id)
    const isNew = !anterior
    const ativando = !isNew && anterior?.status === 'rascunho' && data.status === 'ativo'

    const result = await saveContrato(data)
    const contratoFinal = { ...data, id: result?.data?.id || data.id }

    log(isNew ? 'criar' : 'editar', 'contrato', contratoFinal.id, {
      descricao: `Contrato ${isNew ? 'criado' : 'editado'}: ${data.numero || ''} — ${data.empresa_nome || ''}`,
    })

    // Dispara provisões ao ativar, criar ativo, ou editar contrato já ativo
    const tenantId = profile?.tenant_id || null
    const branchId = activeBranchId || profile?.branch_id || null
    const jaAtivoEditado = !isNew && !ativando && anterior?.status === 'ativo' && data.status === 'ativo'
    if ((ativando || (isNew && data.status === 'ativo') || jaAtivoEditado) && opts.gerarProvisao !== false) {
      const steps = []
      const [qtdPag, qtdCom] = await Promise.all([
        gerarProvisoesPagamento(contratoFinal, tenantId, branchId),
        gerarProvisoesComissao(contratoFinal, tenantId, branchId),
      ])
      if (qtdPag > 0)  steps.push({ id: 'pag', label: `${qtdPag} provisão(ões) de pagamento gerada(s)`, sublabel: 'Status: Pendente — visível em Pagamentos' })
      if (qtdPag < 0)  steps.push({ id: 'pag_err', label: '⚠ Erro ao gerar provisão de pagamento', sublabel: 'Veja o console do navegador (F12) para o detalhe' })
      if (qtdCom > 0)  steps.push({ id: 'com', label: `${qtdCom} provisão(ões) de repasse gerada(s)`, sublabel: 'Status: Pendente — visível em Comissões' })
      if (steps.length && opts.onFeedback) opts.onFeedback(steps)
    }
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

  function handleDownloadTemplate() {
    const customKeys = getEntityCustomFieldKeys('contracts')
    const headers = [...IMPORT_COLS_BASE, ...customKeys]
    const example = [
      'CTR-2026-001', '11.222.333/0001-44', 'ativo', '2026-01-01', '2026-12-31',
      'João Silva', 'Maria Souza', 'direta', 'Nova venda', 'sem_inconsistencia',
      'Observação opcional',
      'LIC001', '1', '500', '10',   // adesão
      'SAAS002', '2', '300', '0',   // mrr
      '', '', '', '',               // serviço (vazio — sem esse produto)
    ]
    const csv  = [headers.join(';'), example.join(';')].join('\n')
    const bom  = '﻿'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'template_contratos.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  // Cria as empresas que faltam (uma por CNPJ distinto) com progresso visível
  // no widget flutuante — mesmo padrão do import de contratos em si. O
  // dedup por CNPJ é garantido em dois níveis: `cnpjsFaltantes` já chega sem
  // repetição (Set, montado no modal) e aqui checamos de novo contra um
  // `Set` local conforme vamos criando, pra nunca criar duas empresas com o
  // mesmo CNPJ mesmo se a lista de entrada tiver alguma repetição.
  async function criarEmpresasFaltantes(cnpjsFaltantes) {
    if (cnpjsFaltantes.length === 0) return new Map()
    const jobId = startImportJob({ label: 'Empresas (novas)', total: cnpjsFaltantes.length })
    const criadas = new Map()
    for (let i = 0; i < cnpjsFaltantes.length; i++) {
      const cnpjRaw = cnpjsFaltantes[i]
      if (criadas.has(cnpjRaw)) continue
      updateImportJob(jobId, { current: i, subLabel: `${fmtCNPJ(cnpjRaw)} (${i + 1}/${cnpjsFaltantes.length})…` })
      const result = await addCompany({
        razao: `Empresa ${fmtCNPJ(cnpjRaw)}`, fantasia: '',
        cnpj: fmtCNPJ(cnpjRaw), tipo: 'rascunho', status: 'negociacao',
      })
      if (result?.ok) criadas.set(cnpjRaw, result.data)
    }
    finishImportJob(jobId, {
      status: criadas.size === 0 ? 'error' : undefined,
      subLabel: `${criadas.size} empresa${criadas.size !== 1 ? 's' : ''} criada${criadas.size !== 1 ? 's' : ''} automaticamente (tipo Rascunho).`,
    })
    return criadas
  }

  // Log de erros da importação em CSV — linha, número, CNPJ e cada motivo
  // de erro (uma coluna por erro, já que uma linha pode ter mais de um).
  function downloadErrorsCsv(rowResults, fileName) {
    const comErro = rowResults.filter(r => !r.ok)
    if (comErro.length === 0) return
    const maxErros = Math.max(...comErro.map(r => r.errors.length))
    const headers = ['linha', 'numero', 'empresa_cnpj', ...Array.from({ length: maxErros }, (_, i) => `erro_${i + 1}`)]
    const toCsvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = comErro.map(r => [
      r.line, r.row.numero || '', r.row.empresa_cnpj || '',
      ...Array.from({ length: maxErros }, (_, i) => r.errors[i] || ''),
    ].map(toCsvCell).join(';'))
    const bom  = '﻿'
    const csv  = bom + [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `erros_${fileName || 'importacao_contratos'}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const isNew = editando && !editando.id

  return (
    <>
      <BrowseLayout
        modulo="contratos"
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
        newLabel="Novo contrato"
        onExportCsv={handleExport}
        onImport={() => setImportModal(true)}
        extraMenuItems={importLogs.length > 0 ? [
          { label: 'Ver log de importações', onClick: () => setShowImportLog(true), dividerBefore: true },
        ] : []}
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
        renderCard={row => {
          const stCfg = STATUS_CONTRATO.find(s => s.value === row.status) || STATUS_CONTRATO[0]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8,
              background: 'var(--surface)', border: `1.5px solid ${stCfg.color}44`,
              borderTop: `3px solid ${stCfg.color}`, borderRadius: 10, padding: '12px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)', cursor: 'pointer' }}
              onClick={() => setEditando(row)}>
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
          )
        }}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>📄</span>
            <span style={{ fontSize: 13 }}>Nenhum contrato encontrado</span>
          </div>
        }
      />

      <SlideOver
        open={!!editando}
        onClose={() => { setEditando(null); setContratoTab('dados') }}
        title={isNew ? 'Novo contrato' : (editando?.numero || 'Contrato')}
        subtitle={editando?.empresa_nome || 'Dados contratuais'}
        defaultWidth={720}
        tabs={[{ key: 'dados', label: 'Dados' }, { key: 'playbook', label: 'Playbook' }]}
        activeTab={contratoTab}
        onTabChange={setContratoTab}
        onSave={() => contratoSaveRef.current?.()}
        saveLabel={isNew ? 'Criar contrato' : 'Salvar alterações'}
        onDelete={!isNew ? () => { handleDelete(editando.id); setEditando(null) } : undefined}
        deleteConfirm="Excluir este contrato? Esta ação não pode ser desfeita."
      >
        {editando && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ContratoForm
              form={editando}
              setForm={setEditando}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => { setEditando(null); setContratoTab('dados') }}
              isNew={isNew}
              contratos={contratos}
              produtos={produtos}
              activeTab={contratoTab}
              onTabChange={setContratoTab}
              onShowFeedback={steps => { setEditando(null); setFeedbackSteps(steps) }}
              saveRef={contratoSaveRef}
            />
          </div>
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

      {importModal && (
        <ImportContratosModal
          onClose={() => setImportModal(false)}
          onDownloadTemplate={handleDownloadTemplate}
          onDownloadErrors={downloadErrorsCsv}
          companies={companies}
          produtos={produtos}
          customFieldKeys={getEntityCustomFieldKeys('contracts')}
          contratosExistentes={contratos}
          onCreateMissingCompanies={criarEmpresasFaltantes}
          onImport={async (rows, logEntry) => {
            const jobId = startImportJob({ label: 'Contratos', total: rows.length })
            const result = await importMany(rows, (current, total) => {
              updateImportJob(jobId, { current, subLabel: `${current} de ${total}…` })
            })
            if (result.ok) {
              finishImportJob(jobId, { subLabel: `Concluído! ${result.count} contrato${result.count !== 1 ? 's' : ''} importado${result.count !== 1 ? 's' : ''}.` })
              setImportLogs(prev => [{ ...logEntry, imported: result.count }, ...prev])
            } else {
              finishImportJob(jobId, { status: 'error', subLabel: `Erro: ${result.message}` })
              setImportLogs(prev => [{ ...logEntry, imported: result.count || 0, erro: result.message }, ...prev])
            }
            return result
          }}
        />
      )}
      {showImportLog && <ImportContratosLogModal logs={importLogs} onClose={() => setShowImportLog(false)} onDownloadErrors={downloadErrorsCsv} />}
    </>
  )
}
