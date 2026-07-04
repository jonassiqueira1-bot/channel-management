import { useState, useMemo, useRef, useEffect } from 'react'
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
import BrowseLayout from '../components/BrowseLayout'
import { DeleteZone } from '../components/NotionDrawer'
import ActionFeedback from '../components/ActionFeedback'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { usePlaybooks } from '../hooks/usePlaybooks'
import { useLocalState } from '../hooks/useLocalState'
import SearchSelect from '../components/SearchSelect'

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
  itens_adesao: [], itens_mrr: [], itens_servico: [],
  responsavel: '', observacoes: '',
  origem: '',
  opportunity_id: null, opportunity_titulo: '',
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

  const STATUS_ITEM_OPTS = [
    { value: 'ativo',      label: 'Ativo' },
    { value: 'pendente',   label: 'Pendente' },
    { value: 'suspenso',   label: 'Suspenso' },
    { value: 'cancelado',  label: 'Cancelado' },
  ]

  function addItem(p) {
    onChange([...(itens||[]), { produto_id: p.id, nome: p.nome, valor: p.preco || 0, tabela: p.preco || null, desconto_pct: 0, desconto_autorizado: false, status_item: 'ativo', vencimento_primeiro_pagamento: '', primeira_compra: false }])
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
            {/* status + vencimento + primeira compra por produto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 6px', flexWrap: 'wrap' }}>
              <select
                value={item.status_item || 'ativo'}
                onChange={e => updateItem(idx, { status_item: e.target.value })}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}>
                {STATUS_ITEM_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>1º pagamento:</label>
              <input
                type="date"
                value={item.vencimento_primeiro_pagamento || ''}
                onChange={e => updateItem(idx, { vencimento_primeiro_pagamento: e.target.value })}
                style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', outline: 'none' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={!!item.primeira_compra} onChange={e => updateItem(idx, { primeira_compra: e.target.checked })}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                1ª compra
              </label>
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


// ─── Provisões de pagamento ───────────────────────────────────────────────────
async function gerarProvisoesPagamento(contrato, tenantId, branchId) {
  const tid = tenantId || 't1'

  // Uma provisão por produto ativo com data de 1º pagamento preenchida
  const slots = [
    ...(contrato.itens_adesao  || []).map(i => ({ ...i, tipo_item: 'adesao' })),
    ...(contrato.itens_mrr     || []).map(i => ({ ...i, tipo_item: 'mrr' })),
    ...(contrato.itens_servico || []).map(i => ({ ...i, tipo_item: 'servico' })),
  ]

  const candidatos = slots.filter(
    i => i.status_item !== 'inativo' && i.vencimento_primeiro_pagamento && (parseFloat(i.valor) || 0) > 0
  )

  if (!candidatos.length) return 0

  // Tenta inserir via Supabase
  let qtd = 0
  try {
    // Checa duplicatas já no banco
    const { data: existentes } = await supabase
      .from('payments')
      .select('id, custom_fields')
      .eq('contract_id', String(contrato.id))

    const jaExiste = (produtoId, vencimento) =>
      (existentes || []).some(p =>
        String(p.custom_fields?.produto_id) === String(produtoId) &&
        p.custom_fields?.vencimento_primeiro_pagamento === vencimento
      )

    const base = {
      tenant_id:   tid,
      branch_id:   branchId || null,
      contract_id: contrato.id,
      company_id:  contrato.empresa_id || null,
      status:      'pendente',
      descricao:   `Provisão automática — contrato ${contrato.numero}`,
    }

    const inserir = candidatos
      .filter(i => !jaExiste(i.produto_id, i.vencimento_primeiro_pagamento))
      .map(i => ({
        ...base,
        vencimento:     i.vencimento_primeiro_pagamento,
        data_pagamento: i.vencimento_primeiro_pagamento.slice(0, 7) + '-01',
        custom_fields: {
          contract_numero:               contrato.numero,
          company_nome:                  contrato.empresa_nome,
          produto_id:                    i.produto_id || null,
          produto_nome:                  i.nome || '',
          tipo_item:                     i.tipo_item,
          amount_total_net:              parseFloat(i.valor) || 0,
          primeira_compra:               i.primeira_compra || false,
          vencimento_primeiro_pagamento: i.vencimento_primeiro_pagamento,
          processed:                     false,
        },
      }))

    if (inserir.length) {
      const { error } = await supabase.from('payments').insert(inserir)
      if (error) throw new Error(error.message)
      qtd = inserir.length
    }
  } catch (err) {
    console.warn('[gerarProvisoesPagamento] Supabase indisponível, usando localStorage:', err.message)
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
      const todosItens = [...(form.itens_adesao||[]), ...(form.itens_mrr||[]), ...(form.itens_servico||[])]
      const semData = todosItens.filter(i => !i.vencimento_primeiro_pagamento)
      if (semData.length > 0) {
        e.vencimento_itens = `Preencha a data de 1º pagamento em todos os produtos (${semData.length} sem data)`
      }
    }
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
    try { onSave(form); onClose() } finally { setSaving(false) }
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
      const todosItens = [...(ativarData.itens_adesao||[]), ...(ativarData.itens_mrr||[]), ...(ativarData.itens_servico||[])]
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
                <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>Registro pendente criado em Pagamentos (D+0 da vigência)</div>
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
                  const itens = [...(ativarData.itens_adesao||[]), ...(ativarData.itens_mrr||[]), ...(ativarData.itens_servico||[])]
                    .filter(i => i.status_item !== 'inativo' && i.vencimento_primeiro_pagamento)
                  return (
                    <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>
                      {itens.length} produto(s) com data de 1º pagamento · uma provisão por produto em Pagamentos
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
          { label: 'Adesão',  val: (form.itens_adesao||[]).reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '' },
          { label: 'MRR',     val: (form.itens_mrr||[]).reduce((s,i)=>s+(parseFloat(i.valor)||0),0),    suffix: '/mês' },
          { label: 'Serviço', val: (form.itens_servico||[]).reduce((s,i)=>s+(parseFloat(i.valor)||0),0), suffix: '' },
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

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Contratos() {
  const { contratos, setContratos, save: saveContrato, remove: removeContrato } = useContracts()
  const { registrar: log } = useAuditLog()
  const { produtos } = useProducts()
  const { profile } = useProfile()
  const [search, setSearch]           = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [editando, setEditando]       = useState(null)
  const [contratoTab, setContratoTab] = useState('dados')
  const contratoSaveRef = useRef(null)
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

  async function handleSave(data, opts = {}) {
    const anterior = contratos.find(c => c.id === data.id)
    const isNew = !anterior
    const ativando = !isNew && anterior?.status === 'rascunho' && data.status === 'ativo'

    const result = await saveContrato(data)
    const contratoFinal = { ...data, id: result?.data?.id || data.id }

    log(isNew ? 'criar' : 'editar', 'contrato', contratoFinal.id, {
      descricao: `Contrato ${isNew ? 'criado' : 'editado'}: ${data.numero || ''} — ${data.empresa_nome || ''}`,
    })

    // Dispara provisões ao ativar (Rascunho → Ativo) ou ao criar já como Ativo
    const tenantId = profile?.tenant_id || null
    const branchId = profile?.branch_id || null
    if ((ativando || (isNew && data.status === 'ativo')) && opts.gerarProvisao !== false) {
      const steps = []
      const [qtdPag, qtdCom] = await Promise.all([
        gerarProvisoesPagamento(contratoFinal, tenantId, branchId),
        gerarProvisoesComissao(contratoFinal, tenantId, branchId),
      ])
      if (qtdPag > 0) steps.push({ id: 'pag', label: `${qtdPag} provisão(ões) de pagamento gerada(s)`, sublabel: 'Status: Pendente — visível em Pagamentos' })
      if (qtdCom > 0) steps.push({ id: 'com', label: `${qtdCom} provisão(ões) de repasse gerada(s)`, sublabel: 'Status: Pendente — visível em Comissões' })
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
    </>
  )
}
