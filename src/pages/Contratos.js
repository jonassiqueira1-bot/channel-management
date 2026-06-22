import { useState, useMemo, useRef, useEffect } from 'react'
import { useContracts } from '../hooks/useContracts'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import { PAGAMENTOS_STORAGE_KEY, MOCK_PAGAMENTOS } from '../data/mockPagamentos'
import Button from '../components/Button'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { DeleteZone } from '../components/NotionDrawer'

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
    hint: 'Receita única de ativação ou implementação',
    icon: '①',
    color: '#0891B2', bg: '#ECFEFF', text: '#0E7490',
    filter: p => p.cobranca === 'unico' && p.status === 'ativo',
  },
  {
    key: 'mrr',
    label: 'MRR',
    hint: 'Receita mensal ou anual recorrente',
    icon: '②',
    color: 'var(--blue)', bg: 'var(--blue-bg)', text: 'var(--blue-text)',
    filter: p => ['mensal','anual','uso','usuario'].includes(p.cobranca) && p.status === 'ativo',
  },
  {
    key: 'servico',
    label: 'Serviço',
    hint: 'Suporte, consultoria ou serviço recorrente',
    icon: '③',
    color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)',
    filter: p => p.tipo === 'servico' && p.status === 'ativo',
  },
]

const EMPTY_FORM = {
  numero: '', empresa_id: null, empresa_nome: '',
  status: 'rascunho',
  primeira_compra: false,
  vigencia_inicio: '', vigencia_fim: '',
  produto_adesao_id: null, produto_adesao_nome: '', valor_adesao: '',
  tabela_adesao: null, desconto_adesao_pct: '', desconto_autorizado_adesao: false,
  produto_mrr_id: null, produto_mrr_nome: '', valor_mrr: '',
  tabela_mrr: null, desconto_mrr_pct: '', desconto_autorizado_mrr: false,
  produto_servico_id: null, produto_servico_nome: '', valor_servico: '',
  tabela_servico: null, desconto_servico_pct: '', desconto_autorizado_servico: false,
  responsavel: '', observacoes: '',
  origem: '',
  data_pag_cdu: '', data_pag_sms: '',
}

const MOCK_CONTRATOS = [
  {
    id: 1, numero: 'CTR-2024-001',
    empresa_id: 1, empresa_nome: 'Nexus Tech',
    status: 'ativo', primeira_compra: true,
    vigencia_inicio: '2024-03-10', vigencia_fim: '2025-03-10',
    produto_adesao_id: 3,  produto_adesao_nome: 'Implantação Assistida', valor_adesao: 4800,  tabela_adesao: 4800, desconto_adesao_pct: 0,  desconto_autorizado_adesao: true,
    produto_mrr_id: 1,     produto_mrr_nome: 'Canal NG Pro',             valor_mrr: 890,      tabela_mrr: 890,     desconto_mrr_pct: 0,    desconto_autorizado_mrr: true,
    produto_servico_id: 4, produto_servico_nome: 'Suporte Premium',       valor_servico: 450,  tabela_servico: 450, desconto_servico_pct: 0, desconto_autorizado_servico: true,
    responsavel: 'Lucas Ferreira', observacoes: '', criado: '2024-03-10',
  },
  {
    id: 2, numero: 'CTR-2024-002',
    empresa_id: 2, empresa_nome: 'Alpha Dist.',
    status: 'ativo', primeira_compra: true,
    vigencia_inicio: '2024-05-22', vigencia_fim: '2025-05-22',
    produto_adesao_id: null,  produto_adesao_nome: '', valor_adesao: null,  tabela_adesao: null, desconto_adesao_pct: 0,  desconto_autorizado_adesao: false,
    produto_mrr_id: 2,        produto_mrr_nome: 'Canal NG Starter',  valor_mrr: 261,    tabela_mrr: 290,    desconto_mrr_pct: 10,  desconto_autorizado_mrr: true,
    produto_servico_id: null, produto_servico_nome: '', valor_servico: null, tabela_servico: null, desconto_servico_pct: 0, desconto_autorizado_servico: false,
    responsavel: 'Ana Costa', observacoes: 'Desconto de 10% aprovado por gerência', criado: '2024-05-22',
  },
  {
    id: 3, numero: 'CTR-2024-003',
    empresa_id: 4, empresa_nome: 'Milenium',
    status: 'ativo', primeira_compra: false,
    vigencia_inicio: '2024-01-15', vigencia_fim: '2025-01-15',
    produto_adesao_id: 3,     produto_adesao_nome: 'Implantação Assistida', valor_adesao: 4080, tabela_adesao: 4800, desconto_adesao_pct: 15, desconto_autorizado_adesao: false,
    produto_mrr_id: 1,        produto_mrr_nome: 'Canal NG Pro',             valor_mrr: 890,     tabela_mrr: 890,     desconto_mrr_pct: 0,    desconto_autorizado_mrr: true,
    produto_servico_id: null, produto_servico_nome: '', valor_servico: null, tabela_servico: null, desconto_servico_pct: 0, desconto_autorizado_servico: false,
    responsavel: 'Carla Menezes', observacoes: 'Desconto de 15% na adesão aguardando aprovação', criado: '2024-01-15',
  },
  {
    id: 4, numero: 'CTR-2024-004',
    empresa_id: 6, empresa_nome: 'FinCorp',
    status: 'ativo', primeira_compra: false,
    vigencia_inicio: '2023-08-20', vigencia_fim: '2024-08-20',
    produto_adesao_id: 3,  produto_adesao_nome: 'Implantação Assistida', valor_adesao: 4320,  tabela_adesao: 4800, desconto_adesao_pct: 10, desconto_autorizado_adesao: true,
    produto_mrr_id: 1,     produto_mrr_nome: 'Canal NG Pro',             valor_mrr: 801,      tabela_mrr: 890,     desconto_mrr_pct: 10,   desconto_autorizado_mrr: true,
    produto_servico_id: 4, produto_servico_nome: 'Suporte Premium',       valor_servico: 450,  tabela_servico: 450, desconto_servico_pct: 0, desconto_autorizado_servico: true,
    responsavel: 'Mariana Silva', observacoes: 'Descontos de 10% aprovados pela diretoria', criado: '2023-08-20',
  },
  {
    id: 5, numero: 'CTR-2024-005',
    empresa_id: 8, empresa_nome: 'MedGroup',
    status: 'encerrado', primeira_compra: true,
    vigencia_inicio: '2024-02-28', vigencia_fim: '2024-08-28',
    produto_adesao_id: null,  produto_adesao_nome: '', valor_adesao: null,  tabela_adesao: null, desconto_adesao_pct: 0,  desconto_autorizado_adesao: false,
    produto_mrr_id: 2,        produto_mrr_nome: 'Canal NG Starter',  valor_mrr: 290,    tabela_mrr: 290,    desconto_mrr_pct: 0,   desconto_autorizado_mrr: true,
    produto_servico_id: null, produto_servico_nome: '', valor_servico: null, tabela_servico: null, desconto_servico_pct: 0, desconto_autorizado_servico: false,
    responsavel: 'Fernanda Rocha', observacoes: 'Cliente migrou para Pro', criado: '2024-02-28',
  },
]

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

// ─── Autocomplete de Produto por slot ────────────────────────────────────────
function ProdutoSearch({ slot, value, label, valor, tabela, descontoPct, autorizado, onChangeProduto, onChangeValor, onChangeDesconto, onChangeAutorizado }) {
  const [query, setQuery]     = useState(label || '')
  const [open, setOpen]       = useState(false)
  const [showAll, setShowAll] = useState(false)
  const ref                   = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const allActive = MOCK_PRODUTOS.filter(p => p.status === 'ativo')
  const suggested = allActive.filter(slot.filter)
  const pool      = showAll ? allActive : suggested

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    return pool.filter(p =>
      p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query, pool])

  const descontoNum  = parseFloat(descontoPct) || 0
  const tabelaNum    = parseFloat(tabela) || 0
  const produtoObj   = value ? MOCK_PRODUTOS.find(p => p.id === value) : null
  const descontoMax  = produtoObj?.desconto_max ?? 100
  const acimaDaFaixa = descontoNum > descontoMax && descontoMax > 0
  const temDesconto  = descontoNum > 0
  const precisaAuth  = temDesconto && !autorizado

  function handleDescontoChange(pct) {
    const p = Math.min(Math.max(parseFloat(pct) || 0, 0), 100)
    onChangeDesconto(String(p))
    if (tabelaNum > 0) onChangeValor(String(Math.round(tabelaNum * (1 - p / 100) * 100) / 100))
  }

  function handleValorChange(v) {
    onChangeValor(v)
    if (tabelaNum > 0 && parseFloat(v) >= 0) {
      const pct = Math.round((1 - parseFloat(v) / tabelaNum) * 10000) / 100
      onChangeDesconto(String(Math.max(0, pct)))
    }
  }

  return (
    <div style={{ border: `1px solid ${precisaAuth ? 'rgba(220,38,38,0.35)' : 'var(--border)'}`, borderRadius: 10, padding: 14, background: precisaAuth ? 'var(--red-bg)' : 'var(--surface2)', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: slot.bg, color: slot.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: `1px solid ${slot.color}33`, flexShrink: 0 }}>{slot.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{slot.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{slot.hint}</div>
        </div>
        {value && temDesconto && (
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 10,
            background: autorizado ? 'var(--green-bg)' : 'var(--red-bg)',
            color:       autorizado ? 'var(--green-text)' : 'var(--red-text)',
            border:      `1px solid ${autorizado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
            {autorizado ? '✓ Autorizado' : '⚠ Sem autorização'}
          </span>
        )}
        {value && (
          <button type="button" onClick={() => { onChangeProduto(null, '', null); setQuery(''); onChangeDesconto('0'); onChangeAutorizado(false) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
        )}
      </div>

      <div ref={ref} style={{ position: 'relative', marginBottom: value ? 12 : 0 }}>
        <input
          style={{ ...md.input, background: 'var(--surface)' }}
          placeholder="Selecionar produto…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div style={ac.dropdown}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border2)', display: 'flex', gap: 8 }}>
              <button type="button"
                style={{ fontSize: 11, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, border: '1px solid', cursor: 'pointer',
                  background: !showAll ? slot.bg : 'none', color: !showAll ? slot.text : 'var(--text-muted)', borderColor: !showAll ? slot.color + '44' : 'var(--border)' }}
                onMouseDown={e => { e.preventDefault(); setShowAll(false) }}>
                Sugeridos ({suggested.length})
              </button>
              <button type="button"
                style={{ fontSize: 11, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, border: '1px solid', cursor: 'pointer',
                  background: showAll ? 'var(--accent-glow)' : 'none', color: showAll ? 'var(--accent)' : 'var(--text-muted)', borderColor: showAll ? 'rgba(30,58,95,0.2)' : 'var(--border)' }}
                onMouseDown={e => { e.preventDefault(); setShowAll(true) }}>
                Todos
              </button>
            </div>
            {opts.length === 0
              ? <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum produto encontrado</div>
              : opts.map(p => (
                  <button type="button" key={p.id} style={ac.option}
                    onMouseDown={() => { onChangeProduto(p.id, p.nome, p.preco); setQuery(p.nome); setOpen(false); onChangeDesconto('0') }}>
                    <span style={{ ...ac.avatar, background: slot.bg, color: slot.text }}>{p.nome.slice(0, 2).toUpperCase()}</span>
                    <span style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                        {p.codigo} · R$ {Number(p.preco || 0).toLocaleString('pt-BR')}/{p.cobranca}
                        {p.desconto_max > 0 && <span style={{ color: 'var(--green-text)' }}> · desc. máx {p.desconto_max}%</span>}
                      </div>
                    </span>
                  </button>
                ))
            }
          </div>
        )}
      </div>

      {value && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 8, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Preço tabela (R$)</label>
              <input
                style={{ ...md.input, background: 'var(--surface3)', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}
                value={tabelaNum ? Number(tabelaNum).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                readOnly
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: acimaDaFaixa ? 'var(--red)' : 'var(--text-soft)', display: 'block', marginBottom: 4 }}>
                Desconto {descontoMax > 0 ? `(máx ${descontoMax}%)` : ''}
              </label>
              <div style={{ position: 'relative' }}>
                <input type="number" min="0" max="100" step="0.5"
                  style={{ ...md.input, fontFamily: 'var(--mono)', background: 'var(--surface)', paddingRight: 24,
                    borderColor: acimaDaFaixa ? 'var(--red)' : undefined,
                    color: acimaDaFaixa ? 'var(--red)' : undefined }}
                  value={descontoPct}
                  onChange={e => handleDescontoChange(e.target.value)}
                  placeholder="0"
                />
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}>%</span>
              </div>
              {acimaDaFaixa && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2, fontFamily: 'var(--mono)' }}>Acima do limite de {descontoMax}%</div>}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', display: 'block', marginBottom: 4 }}>Valor contratado (R$)</label>
              <input type="number" min="0" step="0.01"
                style={{ ...md.input, fontFamily: 'var(--mono)', background: 'var(--surface)', fontWeight: 600 }}
                value={valor}
                onChange={e => handleValorChange(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          {temDesconto && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7,
              background: autorizado ? 'var(--green-bg)' : 'var(--red-bg)',
              border: `1px solid ${autorizado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
              <span style={{ fontSize: 12, color: autorizado ? 'var(--green-text)' : 'var(--red-text)', flex: 1 }}>
                {autorizado ? '✓ Desconto autorizado' : `⚠ Desconto de ${descontoNum}% aguarda autorização`}
              </span>
              <div style={{ display: 'flex', gap: 1, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button type="button"
                  style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                    background: autorizado ? 'var(--green)' : 'var(--surface)', color: autorizado ? '#fff' : 'var(--text-muted)' }}
                  onClick={() => onChangeAutorizado(true)}>Sim</button>
                <button type="button"
                  style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                    background: !autorizado ? 'var(--red)' : 'var(--surface)', color: !autorizado ? '#fff' : 'var(--text-muted)' }}
                  onClick={() => onChangeAutorizado(false)}>Não</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const md = {
  input: { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' },
}
const ac = {
  dropdown: { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' },
  option:   { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  avatar:   { width: 28, height: 28, borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0, border: '1px solid rgba(30,58,95,0.12)' },
}

// ─── Geração de provisões de pagamento ────────────────────────────────────────
function gerarProvisoesPagamento(contrato) {
  const stored = localStorage.getItem(PAGAMENTOS_STORAGE_KEY)
  const pagamentos = stored ? JSON.parse(stored) : MOCK_PAGAMENTOS
  const novas = []
  const toRefMonth = date => date.slice(0, 7) + '-01'
  const cduRef = contrato.data_pag_cdu ? toRefMonth(contrato.data_pag_cdu) : null
  const smsRef = contrato.data_pag_sms ? toRefMonth(contrato.data_pag_sms) : null
  const valorCdu = parseFloat(contrato.valor_adesao) || 0
  const valorSms = parseFloat(contrato.valor_mrr)    || 0
  const prodCdu = { id: contrato.produto_adesao_id || null, nome: contrato.produto_adesao_nome || '' }
  const prodSms = { id: contrato.produto_mrr_id    || null, nome: contrato.produto_mrr_nome    || '' }
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
  if (novas.length > 0) localStorage.setItem(PAGAMENTOS_STORAGE_KEY, JSON.stringify([...novas, ...pagamentos]))
  return novas.length
}

// ─── Formulário (SlideOver) ───────────────────────────────────────────────────
function ContratoForm({ form, setForm, onSave, onDelete, onClose, isNew, contratos }) {
  const [saving, setSaving] = useState(false)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  const valorAdesao  = parseFloat(form.valor_adesao)  || 0
  const valorMrr     = parseFloat(form.valor_mrr)     || 0
  const valorServico = parseFloat(form.valor_servico) || 0
  const totalRec     = valorMrr + valorServico

  async function handleSave() {
    if (!form.empresa_id) return alert('Selecione uma empresa')
    setSaving(true)
    try {
      if (isNew) {
        const novoContrato = { ...form, id: Date.now(), criado: new Date().toISOString().slice(0, 10) }
        onSave(novoContrato)
        const provisoes = gerarProvisoesPagamento(novoContrato)
        if (provisoes > 0) alert(`Contrato salvo! ${provisoes} provisão(ões) de pagamento gerada(s) em Faturamento.`)
      } else {
        onSave(form)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Resumo financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        {[
          { label: 'Adesão',      val: valorAdesao,  suffix: '' },
          { label: 'MRR',         val: valorMrr,     suffix: '/mês' },
          { label: 'Serviço',     val: valorServico, suffix: '' },
          { label: 'Recorrente',  val: totalRec,     suffix: '/mês', bold: true },
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
          <FormField label="Número do contrato" required>
            <input className="so-field" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="CTR-2025-001" />
          </FormField>
          <FormField label="Status">
            <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_CONTRATO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>
        </FormGrid>
        <FormGrid cols={1}>
          <FormField label="Empresa" required>
            <select className="so-field" value={form.empresa_id || ''} onChange={e => {
              const emp = MOCK_EMPRESAS.find(x => x.id === Number(e.target.value))
              setForm(f => ({ ...f, empresa_id: e.target.value ? Number(e.target.value) : null, empresa_nome: emp ? (emp.fantasia || emp.razao) : '' }))
            }}>
              <option value="">— Selecione —</option>
              {MOCK_EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.fantasia || e.razao}</option>)}
            </select>
          </FormField>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SLOTS.map(slot => {
            const idKey         = `produto_${slot.key}_id`
            const nomeKey       = `produto_${slot.key}_nome`
            const valorKey      = `valor_${slot.key}`
            const tabelaKey     = `tabela_${slot.key}`
            const descontoKey   = `desconto_${slot.key}_pct`
            const autorizadoKey = `desconto_autorizado_${slot.key}`
            return (
              <ProdutoSearch key={slot.key} slot={slot}
                value={form[idKey]} label={form[nomeKey]}
                valor={form[valorKey]} tabela={form[tabelaKey]}
                descontoPct={form[descontoKey]} autorizado={form[autorizadoKey]}
                onChangeProduto={(id, nome, preco) => setForm(f => ({ ...f, [idKey]: id, [nomeKey]: nome || '', [valorKey]: id ? (preco || '') : '', [tabelaKey]: id ? (preco || null) : null, [descontoKey]: '0', [autorizadoKey]: false }))}
                onChangeValor={v => set(valorKey, v)}
                onChangeDesconto={v => set(descontoKey, v)}
                onChangeAutorizado={v => set(autorizadoKey, v)}
              />
            )
          })}
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
  )
}

// ─── Colunas ─────────────────────────────────────────────────────────────────
const COLUMNS = [
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
    key: 'produto_adesao_nome',
    label: '① Adesão',
    render: (val, row) => val
      ? <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0E7490' }}>{val}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(row.valor_adesao)}</span>
            {row.desconto_adesao_pct > 0 && <DescontoBadge pct={row.desconto_adesao_pct} autorizado={row.desconto_autorizado_adesao} />}
          </div>
        </div>
      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'produto_mrr_nome',
    label: '② MRR',
    render: (val, row) => val
      ? <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-text)' }}>{val}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(row.valor_mrr)}<span style={{ fontSize: 10 }}>/mês</span></span>
            {row.desconto_mrr_pct > 0 && <DescontoBadge pct={row.desconto_mrr_pct} autorizado={row.desconto_autorizado_mrr} />}
          </div>
        </div>
      : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'produto_servico_nome',
    label: '③ Serviço',
    render: (val, row) => val
      ? <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-text)' }}>{val}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtMoeda(row.valor_servico)}</span>
            {row.desconto_servico_pct > 0 && <DescontoBadge pct={row.desconto_servico_pct} autorizado={row.desconto_autorizado_servico} />}
          </div>
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
  { key: 'status', label: 'Status', render: val => <StatusBadge status={val} /> },
]

const FILTERS = [
  { key: 'status', label: 'Status', options: STATUS_CONTRATO.map(s => ({ value: s.value, label: s.label })) },
]

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Contratos() {
  const { contratos, setContratos } = useContracts(MOCK_CONTRATOS)
  const [search, setSearch]           = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [editando, setEditando]       = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const statusFilter = activeFilters.status || []
    return contratos.filter(c => {
      if (statusFilter.length && !statusFilter.includes(c.status)) return false
      if (q && !(
        c.numero?.toLowerCase().includes(q) ||
        c.empresa_nome?.toLowerCase().includes(q) ||
        c.produto_mrr_nome?.toLowerCase().includes(q) ||
        c.produto_adesao_nome?.toLowerCase().includes(q) ||
        c.produto_servico_nome?.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [contratos, search, activeFilters])

  // KPIs
  const ativos      = contratos.filter(c => c.status === 'ativo').length
  const totalMRR    = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + (parseFloat(c.valor_mrr) || 0) + (parseFloat(c.valor_servico) || 0), 0)
  const totalAdesao = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + (parseFloat(c.valor_adesao) || 0), 0)

  const kpisNode = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {[
        { label: 'Total de contratos', value: contratos.length, mono: false },
        { label: 'Contratos ativos',   value: ativos,           color: 'var(--green-text)' },
        { label: 'MRR recorrente',     value: fmtMoeda(totalMRR),    mono: true },
        { label: 'Receita de adesão',  value: fmtMoeda(totalAdesao), mono: true },
      ].map(k => (
        <div key={k.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', borderTop: '3px solid var(--border)' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: k.color || 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1, fontFamily: k.mono ? 'var(--mono)' : 'inherit' }}>{k.value}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</span>
        </div>
      ))}
    </div>
  )

  function handleSave(data) {
    setContratos(prev => {
      const idx = prev.findIndex(c => c.id === data.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
      return [...prev, { ...data, criado: new Date().toISOString().slice(0, 10) }]
    })
  }

  function handleDelete(id) {
    setContratos(prev => prev.filter(c => c.id !== id))
    setEditando(null)
  }

  function handleExport() {
    const cols = ['numero','empresa_nome','status','vigencia_inicio','vigencia_fim','produto_adesao_nome','valor_adesao','produto_mrr_nome','valor_mrr','produto_servico_nome','valor_servico','responsavel']
    const bom  = '﻿'
    const csv  = bom + [cols.join(';'), ...filtered.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n')
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
        columns={COLUMNS}
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
          />
        )}
      </SlideOver>
    </>
  )
}
