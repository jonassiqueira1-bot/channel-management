import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { useContracts } from '../hooks/useContracts'
import ActionFeedback from '../components/ActionFeedback'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import { MOCK_OPORTUNIDADES } from '../data/mockOportunidades'
import { PAGAMENTOS_STORAGE_KEY, MOCK_PAGAMENTOS } from '../data/mockPagamentos'
import SearchSelect from '../components/SearchSelect'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'
import Button from '../components/Button'
import { FullPageEdit, FPESection, FPEField, FPEGrid, FPESeparator, AsideCard } from '../components/ui'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONTRATO = [
  { value: 'rascunho',  label: 'Rascunho',  color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'ativo',     label: 'Ativo',      color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  { value: 'suspenso',  label: 'Suspenso',   color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  { value: 'encerrado', label: 'Encerrado',  color: '#9A9590',       bg: 'var(--surface3)',  text: 'var(--text-muted)' },
  { value: 'cancelado', label: 'Cancelado',  color: 'var(--red)',    bg: 'var(--red-bg)',    text: 'var(--red-text)' },
]

// Slots de produto — cada contrato pode ter até 3 produtos, um por slot
const SLOTS = [
  {
    key: 'adesao',
    label: 'Adesão / CDU',
    hint: 'Receita única de ativação ou implementação',
    icon: '①',
    color: '#0891B2', bg: '#ECFEFF', text: '#0E7490',
    // sugere produtos de cobrança única
    filter: p => p.cobranca === 'unico' && p.status === 'ativo',
  },
  {
    key: 'mrr',
    label: 'MRR',
    hint: 'Receita mensal ou anual recorrente',
    icon: '②',
    color: 'var(--blue)', bg: 'var(--blue-bg)', text: 'var(--blue-text)',
    // sugere produtos recorrentes
    filter: p => ['mensal','anual','uso','usuario'].includes(p.cobranca) && p.status === 'ativo',
  },
  {
    key: 'servico',
    label: 'Serviço',
    hint: 'Suporte, consultoria ou serviço recorrente',
    icon: '③',
    color: 'var(--purple)', bg: 'var(--purple-bg)', text: 'var(--purple-text)',
    // sugere produtos do tipo serviço
    filter: p => p.tipo === 'servico' && p.status === 'ativo',
  },
]

const EMPTY_FORM = {
  numero: '', empresa_id: null, empresa_nome: '',
  status: 'rascunho',
  primeira_compra: false,
  vigencia_inicio: '', vigencia_fim: '',
  // slot adesão
  produto_adesao_id: null, produto_adesao_nome: '', valor_adesao: '',
  tabela_adesao: null, desconto_adesao_pct: '', desconto_autorizado_adesao: false,
  // slot MRR
  produto_mrr_id: null, produto_mrr_nome: '', valor_mrr: '',
  tabela_mrr: null, desconto_mrr_pct: '', desconto_autorizado_mrr: false,
  // slot serviço
  produto_servico_id: null, produto_servico_nome: '', valor_servico: '',
  tabela_servico: null, desconto_servico_pct: '', desconto_autorizado_servico: false,
  responsavel: '', observacoes: '',
  origem: '',
  prospeccao_id: null, prospeccao_titulo: '',
  data_pag_cdu: '', data_pag_sms: '',
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
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
  return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}
function fmtData(d) {
  if (!d) return '—'
  const [y,m,dd] = d.split('-')
  return `${dd}/${m}/${y}`
}
function gerarNumero(existentes) {
  const ano  = new Date().getFullYear()
  const seq  = String(existentes.filter(c => c.numero.includes(String(ano))).length + 1).padStart(3, '0')
  return `CTR-${ano}-${seq}`
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONTRATO.find(s => s.value === status) || STATUS_CONTRATO[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function DescontoBadge({ pct, autorizado }) {
  return (
    <span style={{
      fontSize:9, fontWeight:700, fontFamily:'var(--mono)', padding:'1px 5px', borderRadius:3, whiteSpace:'nowrap',
      background: autorizado ? 'var(--green-bg)' : 'var(--red-bg)',
      color:      autorizado ? 'var(--green-text)' : 'var(--red-text)',
      border:     `1px solid ${autorizado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
    }}>
      -{pct}% {autorizado ? '✓' : '⚠'}
    </span>
  )
}

// ─── Autocomplete de Empresa ──────────────────────────────────────────────────
function EmpresaSearch({ value, label, onChange }) {
  const [query, setQuery] = useState(label || '')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const opts = useMemo(() => {
    const q = query.toLowerCase()
    return MOCK_EMPRESAS.filter(e =>
      (e.fantasia || e.razao).toLowerCase().includes(q) || e.cnpj.includes(q)
    ).slice(0, 8)
  }, [query])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input
          style={{ ...md.input, paddingRight: value ? 28 : 12 }}
          placeholder="Buscar empresa…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null, '') }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button type="button" onClick={() => { onChange(null, ''); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:0 }}>✕</button>
        )}
      </div>
      {open && opts.length > 0 && (
        <div style={ac.dropdown}>
          {opts.map(e => (
            <button type="button" key={e.id} style={ac.option}
              onMouseDown={() => { onChange(e.id, e.fantasia || e.razao); setQuery(e.fantasia || e.razao); setOpen(false) }}>
              <span style={ac.avatar}>{(e.fantasia||e.razao).slice(0,2).toUpperCase()}</span>
              <span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{e.fantasia || e.razao}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{e.cnpj} · {e.cidade}/{e.uf}</div>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && query.length > 1 && opts.length === 0 && (
        <div style={{ ...ac.dropdown, padding:'12px 14px', color:'var(--text-muted)', fontSize:13 }}>Nenhuma empresa encontrada</div>
      )}
    </div>
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

  // Desconto calculado e validação
  const descontoNum  = parseFloat(descontoPct) || 0
  const tabelaNum    = parseFloat(tabela) || 0
  const valorNum     = parseFloat(valor) || 0
  const produtoObj   = value ? MOCK_PRODUTOS.find(p => p.id === value) : null
  const descontoMax  = produtoObj?.desconto_max ?? 100
  const acimaDaFaixa = descontoNum > descontoMax && descontoMax > 0
  const temDesconto  = descontoNum > 0
  const precisaAuth  = temDesconto && !autorizado

  function handleDescontoChange(pct) {
    const p = Math.min(Math.max(parseFloat(pct) || 0, 0), 100)
    onChangeDesconto(String(p))
    if (tabelaNum > 0) {
      onChangeValor(String(Math.round(tabelaNum * (1 - p / 100) * 100) / 100))
    }
  }

  function handleValorChange(v) {
    onChangeValor(v)
    if (tabelaNum > 0 && parseFloat(v) >= 0) {
      const pct = Math.round((1 - parseFloat(v) / tabelaNum) * 10000) / 100
      onChangeDesconto(String(Math.max(0, pct)))
    }
  }

  return (
    <div style={{ border: `1px solid ${precisaAuth ? 'rgba(220,38,38,0.35)' : 'var(--border)'}`, borderRadius:10, padding:14, background: precisaAuth ? 'var(--red-bg)' : 'var(--surface2)', transition:'all 0.2s' }}>
      {/* Slot header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ width:22, height:22, borderRadius:6, background:slot.bg, color:slot.text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, border:`1px solid ${slot.color}33`, flexShrink:0 }}>{slot.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{slot.label}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{slot.hint}</div>
        </div>
        {/* Indicador de autorização */}
        {value && temDesconto && (
          <span style={{ fontSize:11, fontWeight:600, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:10,
            background: autorizado ? 'var(--green-bg)' : 'var(--red-bg)',
            color:       autorizado ? 'var(--green-text)' : 'var(--red-text)',
            border:      `1px solid ${autorizado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
          }}>
            {autorizado ? '✓ Autorizado' : '⚠ Sem autorização'}
          </span>
        )}
        {value && (
          <button type="button" onClick={() => { onChangeProduto(null, '', null); setQuery(''); onChangeDesconto('0'); onChangeAutorizado(false) }}
            style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:0 }}>✕</button>
        )}
      </div>

      {/* Produto search */}
      <div ref={ref} style={{ position:'relative', marginBottom: value ? 12 : 0 }}>
        <input
          style={{ ...md.input, background:'var(--surface)' }}
          placeholder="Selecionar produto…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <div style={ac.dropdown}>
            <div style={{ padding:'6px 10px', borderBottom:'1px solid var(--border2)', display:'flex', gap:8 }}>
              <button type="button"
                style={{ fontSize:11, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:4, border:'1px solid', cursor:'pointer',
                  background: !showAll ? slot.bg : 'none', color: !showAll ? slot.text : 'var(--text-muted)', borderColor: !showAll ? slot.color + '44' : 'var(--border)' }}
                onMouseDown={e => { e.preventDefault(); setShowAll(false) }}>
                Sugeridos ({suggested.length})
              </button>
              <button type="button"
                style={{ fontSize:11, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:4, border:'1px solid', cursor:'pointer',
                  background: showAll ? 'var(--accent-glow)' : 'none', color: showAll ? 'var(--accent)' : 'var(--text-muted)', borderColor: showAll ? 'rgba(30,58,95,0.2)' : 'var(--border)' }}
                onMouseDown={e => { e.preventDefault(); setShowAll(true) }}>
                Todos
              </button>
            </div>
            {opts.length === 0
              ? <div style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:13 }}>Nenhum produto encontrado</div>
              : opts.map(p => (
                  <button type="button" key={p.id} style={ac.option}
                    onMouseDown={() => { onChangeProduto(p.id, p.nome, p.preco); setQuery(p.nome); setOpen(false); onChangeDesconto('0') }}>
                    <span style={{ ...ac.avatar, background: slot.bg, color: slot.text }}>{p.nome.slice(0,2).toUpperCase()}</span>
                    <span style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.nome}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                        {p.codigo} · R$ {Number(p.preco||0).toLocaleString('pt-BR')}/{p.cobranca}
                        {p.desconto_max > 0 && <span style={{ color:'var(--green-text)' }}> · desc. máx {p.desconto_max}%</span>}
                      </div>
                    </span>
                  </button>
                ))
            }
          </div>
        )}
      </div>

      {/* Campos de valor + desconto + autorização */}
      {value && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Linha: Tabela | Desconto % | Valor final */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr', gap:8, alignItems:'end' }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-soft)', display:'block', marginBottom:4 }}>Preço tabela (R$)</label>
              <input
                style={{ ...md.input, background:'var(--surface3)', color:'var(--text-muted)', fontFamily:'var(--mono)' }}
                value={tabelaNum ? Number(tabelaNum).toLocaleString('pt-BR', { minimumFractionDigits:2 }) : '—'}
                readOnly
              />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color: acimaDaFaixa ? 'var(--red)' : 'var(--text-soft)', display:'block', marginBottom:4 }}>
                Desconto {descontoMax > 0 ? `(máx ${descontoMax}%)` : ''}
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type="number" min="0" max="100" step="0.5"
                  style={{ ...md.input, fontFamily:'var(--mono)', background:'var(--surface)', paddingRight:24,
                    borderColor: acimaDaFaixa ? 'var(--red)' : undefined,
                    color: acimaDaFaixa ? 'var(--red)' : undefined }}
                  value={descontoPct}
                  onChange={e => handleDescontoChange(e.target.value)}
                  placeholder="0"
                />
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-muted)', pointerEvents:'none' }}>%</span>
              </div>
              {acimaDaFaixa && <div style={{ fontSize:10, color:'var(--red)', marginTop:2, fontFamily:'var(--mono)' }}>Acima do limite de {descontoMax}%</div>}
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-soft)', display:'block', marginBottom:4 }}>Valor contratado (R$)</label>
              <input
                type="number" min="0" step="0.01"
                style={{ ...md.input, fontFamily:'var(--mono)', background:'var(--surface)', fontWeight:600 }}
                value={valor}
                onChange={e => handleValorChange(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Linha: Autorização de desconto */}
          {temDesconto && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:7,
              background: autorizado ? 'var(--green-bg)' : 'var(--red-bg)',
              border: `1px solid ${autorizado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
              <span style={{ fontSize:12, color: autorizado ? 'var(--green-text)' : 'var(--red-text)', flex:1 }}>
                {autorizado
                  ? '✓ Desconto autorizado'
                  : `⚠ Desconto de ${descontoNum}% aguarda autorização`}
              </span>
              <div style={{ display:'flex', gap:1, borderRadius:6, overflow:'hidden', border:'1px solid var(--border)' }}>
                <button type="button"
                  style={{ padding:'4px 12px', fontSize:12, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'var(--font)',
                    background: autorizado ? 'var(--green)' : 'var(--surface)',
                    color:      autorizado ? '#fff' : 'var(--text-muted)' }}
                  onClick={() => onChangeAutorizado(true)}>Sim</button>
                <button type="button"
                  style={{ padding:'4px 12px', fontSize:12, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'var(--font)',
                    background: !autorizado ? 'var(--red)' : 'var(--surface)',
                    color:      !autorizado ? '#fff' : 'var(--text-muted)' }}
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
  input: { width:'100%', padding:'8px 11px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', fontSize:13, color:'var(--text)', fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' },
}
const ac = {
  dropdown: { position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:100, overflow:'hidden', maxHeight:280, overflowY:'auto' },
  option:   { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left' },
  avatar:   { width:28, height:28, borderRadius:6, background:'var(--blue-bg)', color:'var(--blue-text)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.12)' },
}

// ─── Export Tray ──────────────────────────────────────────────────────────────
function ExportTray({ logs, onClear, onClose }) {
  return (
    <div style={et.tray}>
      <div style={et.trayHeader}>
        <span style={et.trayTitle}>Histórico de exportações</span>
        <div style={{ display:'flex', gap:10 }}>
          {logs.length > 0 && <button style={et.clearBtn} onClick={onClear}>Limpar</button>}
          <button style={et.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
      {logs.length === 0
        ? <div style={et.empty}><span style={{ fontSize:28 }}>📭</span><span style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhuma exportação ainda</span></div>
        : <div style={et.list}>
            {logs.map(l => (
              <div key={l.id} style={et.item}>
                <div style={et.itemIconWrap}>✅</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={et.itemFile}>{l.fileName}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 }}>{l.total} registros · {l.scope} · {l.date}</div>
                </div>
              </div>
            ))}
          </div>
      }
      <div style={et.trayFooter}>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{logs.length} exportaç{logs.length !== 1 ? 'ões' : 'ão'} · sessão atual</span>
      </div>
    </div>
  )
}

const et = {
  tray:       { position:'absolute', top:'calc(100% + 8px)', right:0, width:360, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' },
  trayHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  trayTitle:  { fontSize:13, fontWeight:700, color:'var(--text)' },
  clearBtn:   { fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  closeBtn:   { fontSize:13, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'32px 0' },
  list:       { maxHeight:300, overflowY:'auto' },
  item:       { display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border2)' },
  itemIconWrap:{ fontSize:14, flexShrink:0, marginTop:2 },
  itemFile:   { fontSize:12, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  trayFooter: { padding:'8px 14px', borderTop:'1px solid var(--border2)', background:'var(--surface2)' },
}

// ─── Geração automática de provisões de pagamento ────────────────────────────
function gerarProvisoesPagamento(contrato) {
  const stored = localStorage.getItem(PAGAMENTOS_STORAGE_KEY)
  const pagamentos = stored ? JSON.parse(stored) : MOCK_PAGAMENTOS

  const novas = []
  const toRefMonth = date => date.slice(0, 7) + '-01'

  const cduRef = contrato.data_pag_cdu ? toRefMonth(contrato.data_pag_cdu) : null
  const smsRef = contrato.data_pag_sms ? toRefMonth(contrato.data_pag_sms) : null
  const valorCdu = parseFloat(contrato.valor_adesao) || 0
  const valorSms = parseFloat(contrato.valor_mrr)    || 0

  // produtos do contrato por rubrica
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

  // verifica se já existe provisão para evitar duplicata
  const jaExiste = (ref, campo) =>
    pagamentos.some(p => p.contract_numero === contrato.numero && p.reference_month === ref && p[campo] > 0)

  if (cduRef && valorCdu > 0 && !jaExiste(cduRef, 'amount_cdu')) {
    if (cduRef === smsRef && valorSms > 0) {
      // mesmo mês → provisão combinada; produto = CDU (adesão)
      novas.push({
        ...base,
        id: 'prov_' + Date.now() + '_cdu_sms',
        produto_id: prodCdu.id, produto_nome: prodCdu.nome,
        amount_cdu: valorCdu, amount_sms: valorSms,
        amount_total_net: valorCdu + valorSms,
        reference_month: cduRef, due_date: contrato.data_pag_cdu,
        notes: 'Provisão CDU+SMS gerada automaticamente ao criar contrato.',
      })
    } else {
      novas.push({
        ...base,
        id: 'prov_' + Date.now() + '_cdu',
        produto_id: prodCdu.id, produto_nome: prodCdu.nome,
        amount_cdu: valorCdu, amount_sms: 0,
        amount_total_net: valorCdu,
        reference_month: cduRef, due_date: contrato.data_pag_cdu,
        notes: 'Provisão CDU gerada automaticamente ao criar contrato.',
      })
    }
  }

  if (smsRef && valorSms > 0 && cduRef !== smsRef && !jaExiste(smsRef, 'amount_sms')) {
    novas.push({
      ...base,
      id: 'prov_' + Date.now() + '_sms',
      produto_id: prodSms.id, produto_nome: prodSms.nome,
      amount_cdu: 0, amount_sms: valorSms,
      amount_total_net: valorSms,
      reference_month: smsRef, due_date: contrato.data_pag_sms,
      notes: 'Provisão SMS gerada automaticamente ao criar contrato.',
    })
  }

  if (novas.length > 0) {
    localStorage.setItem(PAGAMENTOS_STORAGE_KEY, JSON.stringify([...novas, ...pagamentos]))
  }
  return novas.length
}


function Section({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 24 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)', marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--border2)' }}>{label}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, flex:1 }}>
      {label && <label style={{ fontSize:11, fontWeight:600, color:'var(--text-soft)', letterSpacing:'0.03em' }}>{label}</label>}
      {children}
    </div>
  )
}

// ─── Ícone Olho ───────────────────────────────────────────────────────────────

// ─── Dropdown Ações ────────────────────────────────────────────────────────────
function AcoesDropdown({ onExport, onClose, anchorRef }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])
  const item = { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    color:'var(--text)', fontFamily:'var(--font)', textAlign:'left', borderRadius:7, transition:'background 0.12s' }
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:600,
      width:210, background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', boxShadow:'0 8px 28px rgba(0,0,0,0.13)', padding:6 }}>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onExport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Exportar dados
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Contratos() {
  const { contratos, setContratos }   = useContracts(MOCK_CONTRATOS)
  const [search, setSearch]           = useLocalState('contratos:search', '')
  const [filterStatus, setFilterStatus] = useLocalState('contratos:filterStatus', '')
  const [sortBy, setSortBy]           = useLocalState('contratos:sortBy', 'numero')
  const [modal, setModal]             = useState(null)
  const [editando, setEditando]       = useState(null)
  const [saving, setSaving]           = useState(false)
  const [selected, setSelected]       = useState(new Set())
  const [exportLogs, setExportLogs]   = useState([])
  const [showTray, setShowTray]       = useState(false)
  const [showMetrics, setShowMetrics] = useLocalState('contratos:showMetrics', true)
  const [acoesOpen, setAcoesOpen]     = useState(false)
  const [filterVigInicio, setFilterVigInicio] = useLocalState('contratos:vigIni', '')
  const [filterVigFim, setFilterVigFim]       = useLocalState('contratos:vigFim', '')
  const trayRef                       = useRef(null)
  const acoesRef                      = useRef(null)

  // ── Filter + Sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contratos
      .filter(c => {
        if (filterStatus && c.status !== filterStatus) return false
        if (filterVigInicio && c.vigencia_inicio && c.vigencia_inicio < filterVigInicio) return false
        if (filterVigFim    && c.vigencia_fim    && c.vigencia_fim    > filterVigFim)    return false
        if (q && !(
          c.numero?.toLowerCase().includes(q) ||
          c.empresa_nome?.toLowerCase().includes(q) ||
          c.produto_mrr_nome?.toLowerCase().includes(q) ||
          c.produto_adesao_nome?.toLowerCase().includes(q) ||
          c.produto_servico_nome?.toLowerCase().includes(q)
        )) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'mrr_desc') return (b.valor_mrr||0) - (a.valor_mrr||0)
        if (sortBy === 'data')     return new Date(b.criado) - new Date(a.criado)
        return a.numero?.localeCompare?.(b.numero) ?? 0
      })
  }, [contratos, search, filterStatus, filterVigInicio, filterVigFim, sortBy])

  // ── KPIs
  const ativos      = contratos.filter(c => c.status === 'ativo').length
  const totalMRR    = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + (parseFloat(c.valor_mrr)||0) + (parseFloat(c.valor_servico)||0), 0)
  const totalAdesao = contratos.filter(c => c.status === 'ativo').reduce((s, c) => s + (parseFloat(c.valor_adesao)||0), 0)

  // ── Bulk
  const allIds      = filtered.map(c => c.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = allIds.some(id => selected.has(id)) && !allSelected
  const chkRef      = useRef(null)
  useEffect(() => { if (chkRef.current) chkRef.current.indeterminate = someSelected }, [someSelected])
  function toggleAll()   { setSelected(allSelected ? new Set() : new Set(allIds)) }
  function toggleOne(id) { setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s }) }
  function clearSel()    { setSelected(new Set()) }
  function applyBulkAction(action) {
    if (action === 'delete') {
      if (!window.confirm(`Excluir ${selected.size} contrato(s)?`)) return
      setContratos(prev => prev.filter(c => !selected.has(c.id)))
    } else {
      setContratos(prev => prev.map(c => selected.has(c.id) ? { ...c, status: action } : c))
    }
    clearSel()
  }

  // ── CRUD
  function handleSave(data) {
    setContratos(prev => {
      const idx = prev.findIndex(c => c.id === data.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
      return [...prev, { ...data, criado: new Date().toISOString().slice(0,10) }]
    })
  }
  function handleDelete(id) { setContratos(prev => prev.filter(c => c.id !== id)) }

  // ── Export
  function handleExport() {
    const scope = selected.size > 0 ? 'selecionados' : (search || filterStatus) ? 'filtrados' : 'todos'
    const rows  = selected.size > 0 ? contratos.filter(c => selected.has(c.id)) : filtered
    const cols  = ['numero','empresa_nome','status','vigencia_inicio','vigencia_fim','produto_adesao_nome','valor_adesao','produto_mrr_nome','valor_mrr','produto_servico_nome','valor_servico','responsavel']
    const bom   = '﻿'
    const csv   = bom + [cols.join(';'), ...rows.map(r => cols.map(c => `"${String(r[c]??'').replace(/"/g,'""')}"`).join(';'))].join('\n')
    const blob  = new Blob([csv], { type:'text/csv;charset=utf-8' })
    const a     = document.createElement('a')
    const fn    = `contratos_${new Date().toISOString().slice(0,10).replace(/-/g,'_')}.csv`
    a.href = URL.createObjectURL(blob); a.download = fn; a.click()
    setExportLogs(prev => [{ id: Date.now(), fileName: fn, total: rows.length, scope, date: new Date().toLocaleString('pt-BR') }, ...prev])
    setShowTray(true)
  }

  useEffect(() => {
    function h(e) { if (trayRef.current && !trayRef.current.contains(e.target)) setShowTray(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const hasFilters = !!(search || filterStatus || filterVigInicio || filterVigFim)

  if (editando) {
    const isNew = !editando.id
    const form = editando
    const set = (field, val) => setEditando(f => ({ ...f, [field]: val }))

    const valorTotal = (parseFloat(form.valor_adesao) || 0) + (parseFloat(form.valor_mrr) || 0) + (parseFloat(form.valor_servico) || 0)

    async function handleSaveForm() {
      if (!form.empresa_id) return alert('Selecione uma empresa')
      setSaving(true)
      try {
        if (isNew) {
          const novoContrato = { ...form, id: Date.now(), criado: new Date().toISOString().slice(0,10) }
          handleSave(novoContrato)
          const provisoes = gerarProvisoesPagamento(novoContrato)
          if (provisoes > 0) alert(`Contrato salvo! ${provisoes} provisão(ões) de pagamento gerada(s) em Faturamento.`)
        } else {
          handleSave(form)
        }
        setEditando(null)
      } finally {
        setSaving(false)
      }
    }

    function handleDeleteForm() {
      if (!window.confirm('Excluir este contrato?')) return
      handleDelete(form.id)
      setEditando(null)
    }

    const statusCfg = STATUS_CONTRATO.find(s => s.value === form.status) || STATUS_CONTRATO[0]

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Contratos', onClick: () => setEditando(null) }, { label: isNew ? 'Novo contrato' : form.numero }]}
        title={isNew ? 'Novo contrato' : form.numero}
        subtitle={form.empresa_nome || 'Dados contratuais'}
        badge={!isNew && <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:12, background:statusCfg.bg, color:statusCfg.text, fontSize:11, fontWeight:600 }}>{statusCfg.label}</span>}
        onSave={handleSaveForm}
        onCancel={() => setEditando(null)}
        onDelete={!isNew ? handleDeleteForm : undefined}
        saving={saving}
        saveLabel={isNew ? 'Criar contrato' : 'Salvar alterações'}
        aside={
          <AsideCard title="Resumo financeiro">
            {[
              { label: 'Adesão', val: parseFloat(form.valor_adesao)||0 },
              { label: 'MRR', val: parseFloat(form.valor_mrr)||0, suffix: '/mês' },
              { label: 'Serviço', val: parseFloat(form.valor_servico)||0 },
              { label: 'Total recorrente', val: (parseFloat(form.valor_mrr)||0)+(parseFloat(form.valor_servico)||0), suffix: '/mês', bold: true },
            ].map(({ label, val, suffix, bold }) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #F4F4F5' }}>
                <span style={{ fontSize:12, color:'#71717A' }}>{label}</span>
                <span style={{ fontSize:13, fontWeight: bold ? 700 : 600, fontFamily:'var(--mono)', color:'#18181B' }}>
                  {fmtMoeda(val)}{suffix && <span style={{ fontSize:10, fontWeight:400 }}>{suffix}</span>}
                </span>
              </div>
            ))}
          </AsideCard>
        }
      >
        <FPESection label="Identificação" noBorder columns={2}>
          <FPEField label="Número do contrato" required>
            <input className="fpe-field" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="CTR-2025-001" />
          </FPEField>
          <FPEField label="Status">
            <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_CONTRATO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Empresa" required span={2}>
            <select className="fpe-field" value={form.empresa_id || ''} onChange={e => {
              const emp = MOCK_EMPRESAS.find(x => x.id === Number(e.target.value))
              set('empresa_id', e.target.value ? Number(e.target.value) : null)
              setEditando(f => ({ ...f, empresa_id: e.target.value ? Number(e.target.value) : null, empresa_nome: emp ? (emp.fantasia || emp.razao) : '' }))
            }}>
              <option value="">— Selecione —</option>
              {MOCK_EMPRESAS.map(e => <option key={e.id} value={e.id}>{e.fantasia || e.razao}</option>)}
            </select>
          </FPEField>
          <FPEField label="Responsável">
            <input className="fpe-field" value={form.responsavel || ''} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" />
          </FPEField>
          <FPEField label="Origem">
            <select className="fpe-field" value={form.origem || ''} onChange={e => set('origem', e.target.value)}>
              <option value="">— Não definida —</option>
              <option value="direta">Direta</option>
              <option value="indireta">Indireta</option>
              <option value="incentivada">Incentivada</option>
            </select>
          </FPEField>
          <FPEField label="Primeira compra">
            <select className="fpe-field" value={form.primeira_compra ? 'sim' : 'nao'} onChange={e => set('primeira_compra', e.target.value === 'sim')}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </FPEField>
        </FPESection>

        <FPESection label="Vigência" columns={2}>
          <FPEField label="Data de aquisição">
            <input type="date" className="fpe-field" value={form.vigencia_inicio || ''} onChange={e => set('vigencia_inicio', e.target.value)} />
          </FPEField>
          <FPEField label="Data de cancelamento">
            <input type="date" className="fpe-field" value={form.vigencia_fim || ''} onChange={e => set('vigencia_fim', e.target.value)} />
          </FPEField>
          <FPEField label="Início pagamento CDU">
            <input type="date" className="fpe-field" value={form.data_pag_cdu || ''} onChange={e => set('data_pag_cdu', e.target.value)} />
          </FPEField>
          <FPEField label="Início pagamento SMS">
            <input type="date" className="fpe-field" value={form.data_pag_sms || ''} onChange={e => set('data_pag_sms', e.target.value)} />
          </FPEField>
        </FPESection>

        <FPESection label="Produtos contratados" columns={1}>
          {SLOTS.map(slot => {
            const idKey = `produto_${slot.key}_id`
            const nomeKey = `produto_${slot.key}_nome`
            const valorKey = `valor_${slot.key}`
            const tabelaKey = `tabela_${slot.key}`
            const descontoKey = `desconto_${slot.key}_pct`
            const autorizadoKey = `desconto_autorizado_${slot.key}`
            return (
              <FPEField key={slot.key} span={1}>
                <ProdutoSearch slot={slot}
                  value={form[idKey]} label={form[nomeKey]}
                  valor={form[valorKey]} tabela={form[tabelaKey]}
                  descontoPct={form[descontoKey]} autorizado={form[autorizadoKey]}
                  onChangeProduto={(id, nome, preco) => setEditando(f => ({ ...f, [idKey]:id, [nomeKey]:nome||'', [valorKey]:id?(preco||''):'', [tabelaKey]:id?(preco||null):null, [descontoKey]:'0', [autorizadoKey]:false }))}
                  onChangeValor={v => set(valorKey, v)}
                  onChangeDesconto={v => set(descontoKey, v)}
                  onChangeAutorizado={v => set(autorizadoKey, v)}
                />
              </FPEField>
            )
          })}
        </FPESection>

        <FPESection label="Observações" columns={1}>
          <FPEField label="Observações">
            <textarea className="fpe-field" value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} placeholder="Condições especiais, anotações comerciais…" />
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={p.pageHeader}>
        <div>
          <div style={p.breadcrumb}><span>Clientes</span><span style={p.sep}>›</span><span>Contratos</span></div>
          <h1 style={p.title}>Contratos</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button
            onClick={() => setShowMetrics(v => !v)}
            title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
              borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
              color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div ref={acoesRef} style={{ position:'relative' }}>
            <button style={{ ...p.ghostBtn, ...(acoesOpen ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}) }}
              onClick={() => setAcoesOpen(v => !v)}>
              Ações <span style={{ fontSize:10 }}>▾</span>
            </button>
            {acoesOpen && (
              <AcoesDropdown
                onExport={() => { handleExport(); setAcoesOpen(false) }}
                onClose={() => setAcoesOpen(false)}
                anchorRef={acoesRef}
              />
            )}
          </div>
          <Button onClick={() => setEditando({ ...EMPTY_FORM, numero: gerarNumero(contratos) })}>+ Novo contrato</Button>
        </div>
      </div>

      {/* KPIs collapsíveis */}
      <div style={{ display:'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr', transition:'grid-template-rows 0.22s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0, overflow:'hidden' }}>
          <div style={p.kpis}>
            <KpiCard label="Total de contratos" value={contratos.length} />
            <KpiCard label="Contratos ativos"   value={ativos} accent />
            <KpiCard label="MRR recorrente"     value={fmtMoeda(totalMRR)} mono />
            <KpiCard label="Receita de adesão"  value={fmtMoeda(totalAdesao)} mono />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={p.toolbar}>
        <div style={p.tbLeft}>
          <div style={p.searchWrap}>
            <span style={p.searchIcon}>⌕</span>
            <input style={p.searchInput} placeholder="Buscar empresa, produto, número…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={p.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Status da assinatura</option>
            {STATUS_CONTRATO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input type="date" style={p.select} value={filterVigInicio}
            onChange={e => setFilterVigInicio(e.target.value)} title="Vigência início" />
          <input type="date" style={p.select} value={filterVigFim}
            onChange={e => setFilterVigFim(e.target.value)} title="Vigência fim" />
        </div>
        <div style={p.tbDivider} />
        <div style={p.tbRight}>
          <select style={p.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="numero">Número</option>
            <option value="mrr_desc">Maior MRR</option>
            <option value="data">Mais recente</option>
          </select>
        </div>
      </div>

      {/* Result row */}
      <div style={p.resultRow}>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)' }}>
          {filtered.length} contrato{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </span>
        {hasFilters && (
          <button style={p.clearBtn} onClick={() => { setSearch(''); setFilterStatus(''); setFilterVigInicio(''); setFilterVigFim('') }}>Limpar filtros</button>
        )}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={p.bulkBar}>
          <span style={p.bulkCount}><span style={p.bulkDot} />{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
          <div style={p.bulkActions}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>Alterar status:</span>
            {STATUS_CONTRATO.filter(s => s.value !== 'rascunho').map(st => (
              <button key={st.value} style={p.bulkBtn} onClick={() => applyBulkAction(st.value)}>→ {st.label}</button>
            ))}
            <div style={{ width:1, background:'rgba(255,255,255,0.2)', alignSelf:'stretch', margin:'0 4px' }} />
            <button style={{ ...p.bulkBtn, color:'#fca5a5', borderColor:'rgba(252,165,165,0.3)' }} onClick={() => applyBulkAction('delete')}>Excluir</button>
          </div>
          <button style={p.bulkClear} onClick={clearSel}>✕ Limpar seleção</button>
        </div>
      )}

      {/* Tabela */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width:36 }}>
                <input type="checkbox" ref={chkRef} checked={allSelected} onChange={toggleAll} style={{ cursor:'pointer', accentColor:'var(--accent)' }} />
              </th>
              <th style={s.th}>Contrato</th>
              <th style={s.th}>Empresa</th>
              <th style={s.th}>① Adesão</th>
              <th style={s.th}>② MRR</th>
              <th style={s.th}>③ Serviço</th>
              <th style={s.th}>Vigência</th>
              <th style={s.th}>Status</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>Nenhum contrato encontrado</td></tr>
            )}
            {filtered.map(c => {
              const totalRec = (parseFloat(c.valor_mrr)||0) + (parseFloat(c.valor_servico)||0)
              return (
                <tr key={c.id} onClick={() => setEditando(c)} style={{ ...s.tr, background: selected.has(c.id) ? 'var(--accent-glow)' : 'transparent', cursor:'pointer' }}>
                  <td style={{ ...s.td, width:36 }}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} style={{ cursor:'pointer', accentColor:'var(--accent)' }} />
                  </td>
                  <td style={s.td}>
                    <div style={{ fontWeight:700, fontSize:12, color:'var(--text)', fontFamily:'var(--mono)' }}>{c.numero}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                      <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{fmtData(c.criado)}</span>
                      {c.primeira_compra && (
                        <span style={{ fontSize:9, fontWeight:700, fontFamily:'var(--mono)', padding:'1px 5px', borderRadius:3, background:'#ECFEFF', color:'#0E7490', border:'1px solid #BAE6FD' }}>1ª COMPRA</span>
                      )}
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={s.avatar}>{(c.empresa_nome||'?').slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{c.empresa_nome}</div>
                        {c.responsavel && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.responsavel}</div>}
                      </div>
                    </div>
                  </td>
                  {/* Slot Adesão */}
                  <td style={s.td}>
                    {c.produto_adesao_id
                      ? <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'#0E7490' }}>{c.produto_adesao_nome}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                            <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{fmtMoeda(c.valor_adesao)}</span>
                            {(c.desconto_adesao_pct > 0) && <DescontoBadge pct={c.desconto_adesao_pct} autorizado={c.desconto_autorizado_adesao} />}
                          </div>
                        </div>
                      : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Slot MRR */}
                  <td style={s.td}>
                    {c.produto_mrr_id
                      ? <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--blue-text)' }}>{c.produto_mrr_nome}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                            <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{fmtMoeda(c.valor_mrr)}<span style={{ fontSize:10 }}>/mês</span></span>
                            {(c.desconto_mrr_pct > 0) && <DescontoBadge pct={c.desconto_mrr_pct} autorizado={c.desconto_autorizado_mrr} />}
                          </div>
                        </div>
                      : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Slot Serviço */}
                  <td style={s.td}>
                    {c.produto_servico_id
                      ? <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--purple-text)' }}>{c.produto_servico_nome}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                            <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{fmtMoeda(c.valor_servico)}</span>
                            {(c.desconto_servico_pct > 0) && <DescontoBadge pct={c.desconto_servico_pct} autorizado={c.desconto_autorizado_servico} />}
                          </div>
                        </div>
                      : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={s.td}>
                    {c.vigencia_inicio
                      ? <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-soft)' }}>
                          <div>{fmtData(c.vigencia_inicio)}</div>
                          <div style={{ color:'var(--text-muted)' }}>até {fmtData(c.vigencia_fim)}</div>
                        </div>
                      : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={s.td}><StatusBadge status={c.status} /></td>
                  <td style={s.td}>
                    <button style={s.editBtn} onClick={e => { e.stopPropagation(); setEditando(c) }}>→</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function KpiCard({ label, value, accent, mono }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)' }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: accent ? 'var(--green-text)' : 'var(--text)', fontFamily: mono ? 'var(--mono)' : 'var(--font)', lineHeight:1 }}>{value}</div>
    </div>
  )
}

const s = {
  tableWrap: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  table:     { width:'100%', borderCollapse:'collapse' },
  th:        { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--mono)', borderBottom:'1px solid var(--border)', background:'var(--surface2)' },
  tr:        { borderBottom:'1px solid var(--border2)', transition:'background 0.1s' },
  td:        { padding:'12px 14px', verticalAlign:'middle' },
  editBtn:   { padding:'5px 12px', borderRadius:7, border:'1px solid var(--border)', background:'none', fontSize:12, color:'var(--text-soft)', cursor:'pointer', fontFamily:'var(--font)' },
  avatar:    { width:32, height:32, borderRadius:7, background:'var(--blue-bg)', color:'var(--blue-text)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.12)' },
}

const p = {
  pageHeader:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 },
  breadcrumb:  { display:'flex', alignItems:'center', gap:6, marginBottom:6, fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  iconBtn:     { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer' },
  iconBtnActive: { borderColor:'var(--accent)', color:'var(--accent)', background:'var(--accent-glow)' },
  ghostBtn:    { height:36, padding:'0 14px', fontSize:13, border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 },
  sep:         { color:'var(--border)' },
  title:       { fontSize:22, fontWeight:700, color:'var(--text)', margin:0 },
  newBtn:      { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  kpis:        { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:4 },
  toolbar:     { background:'var(--surface)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:8, marginBottom:12 },
  tbLeft:      { display:'flex', alignItems:'center', gap:8, flex:1, flexShrink:1, minWidth:0 },
  tbDivider:   { width:1, height:24, background:'var(--border)', flexShrink:0 },
  tbRight:     { display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  searchWrap:  { position:'relative', flex:'1', minWidth:200 },
  searchIcon:  { position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15, pointerEvents:'none' },
  searchInput: { width:'100%', padding:'7px 12px 7px 30px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)' },
  select:      { padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)' },
  exportBtn:   { padding:'7px 12px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--mono)', fontWeight:500 },
  resultRow:   { display:'flex', alignItems:'center', gap:12, marginBottom:12 },
  clearBtn:    { fontSize:12, color:'var(--accent2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  trayBtn:     { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', position:'relative' },
  trayBtnActive:{ background:'var(--accent-glow)', borderColor:'rgba(30,58,95,0.2)', color:'var(--accent)' },
  trayBadge:   { position:'absolute', top:-5, right:-5, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)' },
  bulkBar:     { display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'var(--accent)', borderRadius:10, flexWrap:'wrap', marginBottom:12 },
  bulkCount:   { display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--mono)' },
  bulkDot:     { width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.7)' },
  bulkActions: { display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' },
  bulkBtn:     { padding:'4px 10px', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  bulkClear:   { fontSize:12, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', marginLeft:'auto' },
}
