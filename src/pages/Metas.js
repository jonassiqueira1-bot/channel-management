/**
 * Metas Comerciais — v4 (Matrix View)
 *
 * Layout:
 *  - Top bar limpa: título + CTA + 3 filtros em popovers (Atribuição, Período, Responsável)
 *  - Grid horizontal: 1ª coluna fixa (entidade), colunas dinâmicas por mês do intervalo
 *  - Cada célula mensal: % progresso + barra + realizado/meta com cor condicional
 *
 * Supabase schema — goals table (v3, mantido):
 *   tipo_alvo: 'vendedor'|'unidade'|'categoria'|'produto'
 *   tipo_meta: 'valor'|'atividade'|'operacional'
 *   subtipo_operacional: 'quantidade'|'moeda'
 *   valor_sufixo: TEXT
 *   periodo_mes, periodo_ano, valor_alvo, valor_atual, status
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useGoals } from '../hooks/useGoals'
import { useProducts } from '../hooks/useProducts'
import { useContracts } from '../hooks/useContracts'
import { Target, X, ChevronDown, SlidersHorizontal, CalendarDays, Users, Plus } from 'lucide-react'
import SlideOver, { FormField, FormSection } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Tipos de alvo ────────────────────────────────────────────────────────────
const TIPOS_ALVO = {
  vendedor:  { label: 'Por Vendedor',             badgeLabel: 'Vendedor',  badgeColor: 'var(--accent)', badgeBg: '#F5F3FF', badgeBorder: '#DDD6FE' },
  unidade:   { label: 'Por Unidade / Franquia',   badgeLabel: 'Unidade',   badgeColor: '#1D4ED8', badgeBg: '#EFF6FF', badgeBorder: '#BFDBFE' },
  categoria: { label: 'Por Categoria de Produto', badgeLabel: 'Categoria', badgeColor: '#0891B2', badgeBg: '#ECFEFF', badgeBorder: '#A5F3FC' },
  produto:   { label: 'Por Produto Específico',   badgeLabel: 'Produto',   badgeColor: '#059669', badgeBg: '#F0FDF4', badgeBorder: '#A7F3D0' },
  equipe:    { label: 'Por Equipe',               badgeLabel: 'Equipe',    badgeColor: '#7C3AED', badgeBg: '#F5F3FF', badgeBorder: '#C4B5FD' },
}

const TIPOS_META = {
  valor:       { label: 'Valor de Vendas (R$)',               prefix: 'R$', suffix: '' },
  atividade:   { label: 'Qtd. de Oportunidades / Atividades', prefix: '',   suffix: 'ops' },
  operacional: { label: 'Não-Comercial / Operacional',        prefix: '',   suffix: '' },
}

const STATUS_CFG = {
  ativa:     { label: 'Ativa',     color: '#3B82F6', bg: '#EFF6FF', text: '#1E40AF' },
  concluida: { label: 'Concluída', color: '#10B981', bg: '#F0FDF4', text: '#166534' },
  cancelada: { label: 'Cancelada', color: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const TIPO_FILTER_OPTIONS = [
  { val: 'responsavel', label: 'Responsável',          desc: 'Vendedores e unidades' },
  { val: 'categoria',   label: 'Categoria de Produto', desc: 'Por segmento / categoria' },
  { val: 'produto',     label: 'Produto Específico',   desc: 'Por SKU / produto' },
  { val: 'operacional', label: 'Métricas Operacionais',desc: 'Metas não-comerciais' },
]

// ─── Mock seed ────────────────────────────────────────────────────────────────
const NOW     = new Date()
const MES     = NOW.getMonth() + 1
const ANO     = NOW.getFullYear()
const MES_ANT = MES === 1 ? 12 : MES - 1
const ANO_ANT = MES === 1 ? ANO - 1 : ANO

function mockGoal(id, tipoAlvo, idV, idU, catId, prodId, nomeRef, subRef, tipoMeta, subtipo, sufixo, alvo, atual, mes, ano) {
  return { id, tipo_alvo:tipoAlvo, id_vendedor:idV, id_unidade:idU, category_id:catId, product_id:prodId,
    nome_ref:nomeRef, sub_ref:subRef, tipo_meta:tipoMeta, subtipo_operacional:subtipo, valor_sufixo:sufixo,
    valor_alvo:alvo, valor_atual:atual, periodo_mes:mes, periodo_ano:ano,
    data_inicio:null, data_fim:null, status:'ativa' }
}

const MOCK_GOALS_SEED = [
  // Vendedores — mês atual
  mockGoal('g1','vendedor','v5',null,null,null,'João Lima','Filial — Ribeirão Preto','valor',null,null,18000,14200,MES,ANO),
  mockGoal('g2','vendedor','v3',null,null,null,'Fernanda Rocha','Filial — Porto Alegre','valor',null,null,15000,15800,MES,ANO),
  mockGoal('g3','vendedor','v1',null,null,null,'Lucas Ferreira','Matriz — São Paulo','valor',null,null,22000,9400,MES,ANO),
  mockGoal('g4','vendedor','v4',null,null,null,'Pedro Alves','Filial — Belo Horizonte','atividade',null,null,20,13,MES,ANO),
  mockGoal('g5','vendedor','v8',null,null,null,'Mariana Silva','Matriz — São Paulo','valor',null,null,30000,31500,MES,ANO),
  // Vendedores — mês anterior
  mockGoal('g1b','vendedor','v5',null,null,null,'João Lima','Filial — Ribeirão Preto','valor',null,null,18000,18900,MES_ANT,ANO_ANT),
  mockGoal('g3b','vendedor','v1',null,null,null,'Lucas Ferreira','Matriz — São Paulo','valor',null,null,20000,17500,MES_ANT,ANO_ANT),
  mockGoal('g5b','vendedor','v8',null,null,null,'Mariana Silva','Matriz — São Paulo','valor',null,null,28000,31000,MES_ANT,ANO_ANT),
  // Mês -2
  mockGoal('g1c','vendedor','v5',null,null,null,'João Lima','Filial — Ribeirão Preto','valor',null,null,16000,12800,MES<=2?12+MES-2:MES-2,MES<=2?ANO-1:ANO),
  mockGoal('g3c','vendedor','v1',null,null,null,'Lucas Ferreira','Matriz — São Paulo','valor',null,null,18000,5400,MES<=2?12+MES-2:MES-2,MES<=2?ANO-1:ANO),
  mockGoal('g5c','vendedor','v8',null,null,null,'Mariana Silva','Matriz — São Paulo','valor',null,null,25000,26500,MES<=2?12+MES-2:MES-2,MES<=2?ANO-1:ANO),
  // Unidades
  mockGoal('g6','unidade',null,'u1',null,null,'Matriz — São Paulo','','valor',null,null,80000,56900,MES,ANO),
  mockGoal('g7','unidade',null,'u5',null,null,'Filial — Porto Alegre','','valor',null,null,25000,18700,MES,ANO),
  mockGoal('g6b','unidade',null,'u1',null,null,'Matriz — São Paulo','','valor',null,null,75000,72000,MES_ANT,ANO_ANT),
  // Categorias
  mockGoal('g8','categoria',null,null,'cat2',null,'Gestão de Ativos (CMMS)','Categoria de produto','valor',null,null,45000,32100,MES,ANO),
  mockGoal('g9','categoria',null,null,'cat1',null,'Segurança do Trabalho (EHS)','Categoria de produto','valor',null,null,35000,35200,MES,ANO),
  mockGoal('g8b','categoria',null,null,'cat2',null,'Gestão de Ativos (CMMS)','Categoria de produto','valor',null,null,40000,38000,MES_ANT,ANO_ANT),
  // Produtos
  mockGoal('g10','produto',null,null,null,'p1','Canal NG Pro','Gestão de Ativos (CMMS)','valor',null,null,20000,11400,MES,ANO),
  mockGoal('g11','produto',null,null,null,'p2','Licença SST','Segurança do Trabalho (EHS)','atividade',null,null,30,28,MES,ANO),
  mockGoal('g12','produto',null,null,null,'p4','Canal NG Frotas','Frotas & Logística','valor',null,null,12000,12600,MES,ANO),
  // Operacionais
  mockGoal('g15','unidade',null,'u1',null,null,'Matriz — São Paulo','','operacional','quantidade','treinamentos',4,3,MES,ANO),
  mockGoal('g16','vendedor','v2',null,null,null,'Carla Menezes','Matriz — São Paulo','operacional','moeda',null,5000,5200,MES,ANO),
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(atual, alvo) { return alvo > 0 ? Math.min(Math.round((atual / alvo) * 100), 100) : 0 }
function pctReal(atual, alvo) { return alvo > 0 ? Math.round((atual / alvo) * 100) : 0 }

function fmtInput(v) {
  const num = String(v).replace(/\D/g, '')
  return num ? Number(num).toLocaleString('pt-BR') : ''
}
function parseInput(v) { return parseFloat(String(v).replace(/\./g,'').replace(',','.')) || 0 }

function iniciais(nome) {
  const p = (nome || '').trim().split(' ').filter(Boolean)
  if (p.length === 0) return '?'
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase()
}
function corAvatar(nome) {
  const cores = ['var(--accent)','#10B981','#F59E0B','#3B82F6','#EC4899','var(--accent)','#059669','#D97706']
  return cores[(nome || '').charCodeAt(0) % cores.length]
}
function corBarra(p) {
  if (p >= 100) return '#10B981'
  if (p >= 70)  return '#3B82F6'
  if (p >= 40)  return '#F59E0B'
  return '#EF4444'
}
function fmtCompact(v, tipo, goal) {
  const n = Number(v)
  const isCurrency = tipo === 'valor' || (tipo === 'operacional' && goal?.subtipo_operacional === 'moeda')
  const sfx = tipo === 'atividade' ? 'ops'
    : tipo === 'operacional' && goal?.valor_sufixo ? goal.valor_sufixo.slice(0,6) : ''
  let num
  if (n >= 1000000) num = (n/1000000).toFixed(1).replace('.', ',') + 'M'
  else if (n >= 1000) num = (n/1000).toFixed(0) + 'k'
  else num = n.toLocaleString('pt-BR')
  return (isCurrency ? 'R$ ' : '') + num + (sfx ? ' ' + sfx : '')
}

// ─── Realizado automático a partir de contratos ativos ───────────────────────
function calcRealizado(goal, contratosAtivos, produtos, equipes, vendedores) {
  // Filtra contratos cujo início de vigência cai no mês/ano da meta
  const noPeriodo = contratosAtivos.filter(c => {
    if (!c.vigencia_inicio) return false
    const [y, m] = c.vigencia_inicio.split('-').map(Number)
    return y === goal.periodo_ano && m === goal.periodo_mes
  })

  let filtrados = noPeriodo
  if (goal.tipo_alvo === 'vendedor') {
    const v = vendedores.find(x => x.id === goal.id_vendedor)
    if (v) filtrados = filtrados.filter(c => c.responsavel === v.nome)
    else return 0
  } else if (goal.tipo_alvo === 'unidade') {
    filtrados = filtrados.filter(c => String(c.branch_id) === String(goal.id_unidade))
  } else if (goal.tipo_alvo === 'categoria') {
    const catProdIds = new Set(produtos.filter(p => p.categoria === goal.category_id).map(p => String(p.id)))
    filtrados = filtrados.filter(c =>
      catProdIds.has(String(c.produto_adesao_id)) ||
      catProdIds.has(String(c.produto_mrr_id)) ||
      catProdIds.has(String(c.produto_servico_id))
    )
  } else if (goal.tipo_alvo === 'produto') {
    filtrados = filtrados.filter(c =>
      String(c.produto_adesao_id) === String(goal.product_id) ||
      String(c.produto_mrr_id)    === String(goal.product_id) ||
      String(c.produto_servico_id) === String(goal.product_id)
    )
  } else if (goal.tipo_alvo === 'equipe') {
    const eq = equipes.find(e => e.id === goal.equipe_id)
    const memNomes = eq
      ? (eq.membro_ids || []).map(mid => vendedores.find(v => v.id === mid)?.nome).filter(Boolean)
      : []
    filtrados = filtrados.filter(c => memNomes.includes(c.responsavel))
  }

  if (goal.tipo_meta === 'atividade') return filtrados.length
  if (goal.tipo_meta === 'valor') {
    return filtrados.reduce((s, c) =>
      s + (Number(c.valor_adesao) || 0) + (Number(c.valor_mrr) || 0) + (Number(c.valor_servico) || 0), 0)
  }
  // operacional: sem cálculo automático — mantém valor_atual salvo
  return goal.valor_atual ?? 0
}

// ─── Avatar simples ───────────────────────────────────────────────────────────
function Avatar({ nome, size = 32 }) {
  const cor = corAvatar(nome)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: cor + '18', color: cor, border: `1.5px solid ${cor}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800 }}>
      {iniciais(nome)}
    </div>
  )
}

function AlvoBadge({ tipoAlvo }) {
  const cfg = TIPOS_ALVO[tipoAlvo]
  if (!cfg) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center',
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
      background: cfg.badgeBg, color: cfg.badgeColor, border: `1px solid ${cfg.badgeBorder}` }}>
      {cfg.badgeLabel}
    </span>
  )
}

// ─── Hook: fecha ao clicar fora ───────────────────────────────────────────────
function useOutsideClick(popRef, anchorRef, onClose) {
  const cb = useCallback(onClose, [onClose])
  useEffect(() => {
    function h(e) {
      if (popRef.current   && popRef.current.contains(e.target))   return
      if (anchorRef.current && anchorRef.current.contains(e.target)) return
      cb()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [popRef, anchorRef, cb])
}

// ─── FilterButton — botão padrão dos filtros da top bar ──────────────────────
function FilterButton({ icon, label, badge, active, onClick, refProp }) {
  return (
    <button ref={refProp} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 13px', height: 36, borderRadius: 9,
      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'var(--accent-glow)' : 'var(--surface)',
      color: active ? 'var(--accent)' : 'var(--text-soft)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font)', whiteSpace: 'nowrap', transition: 'all 0.14s',
    }}>
      {icon}
      {label}
      {badge > 0 && (
        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10,
          fontSize: 10, fontWeight: 800, padding: '1px 6px', lineHeight: '16px', marginLeft: 2 }}>
          {badge}
        </span>
      )}
      <ChevronDown size={12} style={{ opacity: 0.6 }} />
    </button>
  )
}

// ─── Popover: Tipo de Atribuição ──────────────────────────────────────────────
function TipoAtribuicaoPopover({ selected, onChange, onClose, anchorRef }) {
  const popRef = useRef(null)
  useOutsideClick(popRef, anchorRef, onClose)

  function toggle(val) {
    onChange(selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val])
  }

  return (
    <div ref={popRef} style={pop.wrap}>
      <div style={pop.header}>
        <span style={pop.title}>Tipo de Atribuição</span>
        <button onClick={onClose} style={pop.closeBtn}><X size={14} /></button>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TIPO_FILTER_OPTIONS.map(opt => {
          const on = selected.includes(opt.val)
          return (
            <label key={opt.val} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 9, cursor: 'pointer',
              border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              background: on ? 'var(--accent-glow)' : 'var(--surface2)',
              transition: 'all 0.12s',
            }}>
              <input type="checkbox" checked={on} onChange={() => toggle(opt.val)}
                style={{ accentColor: 'var(--accent)', flexShrink: 0, width: 15, height: 15 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700,
                  color: on ? 'var(--accent)' : 'var(--text)' }}>{opt.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{opt.desc}</div>
              </div>
            </label>
          )
        })}
      </div>
      <div style={pop.footer}>
        <button onClick={() => onChange([])} style={pop.clearBtn}>Limpar seleção</button>
        <button onClick={onClose} style={pop.applyBtn}>Aplicar</button>
      </div>
    </div>
  )
}

// ─── Popover: Período (De/Até) ────────────────────────────────────────────────
const PERIOD_PRESETS = [
  { label: 'Mês atual',         deMes: () => MES,   deAno: () => ANO, ateMes: () => MES, ateAno: () => ANO },
  { label: 'Últimos 3 meses',   deMes: () => MES<=3?MES+9:MES-3, deAno: () => MES<=3?ANO-1:ANO, ateMes: () => MES, ateAno: () => ANO },
  { label: 'Último semestre',   deMes: () => MES<=6?MES+6:MES-6, deAno: () => MES<=6?ANO-1:ANO, ateMes: () => MES, ateAno: () => ANO },
  { label: 'Ano completo',      deMes: () => 1, deAno: () => ANO, ateMes: () => 12, ateAno: () => ANO },
]
const anos = [ANO - 1, ANO, ANO + 1]

function PeriodoPopover({ deMes, deAno, ateMes, ateAno, setDeMes, setDeAno, setAteMes, setAteAno, onClose, anchorRef }) {
  const popRef = useRef(null)
  useOutsideClick(popRef, anchorRef, onClose)

  function applyPreset(p) {
    setDeMes(String(p.deMes()))
    setDeAno(String(p.deAno()))
    setAteMes(String(p.ateMes()))
    setAteAno(String(p.ateAno()))
  }

  const sel = { height: 34, padding: '0 8px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface2)', fontSize: 13, color: 'var(--text)',
    fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none' }

  return (
    <div ref={popRef} style={{ ...pop.wrap, width: 320 }}>
      <div style={pop.header}>
        <span style={pop.title}>Período</span>
        <button onClick={onClose} style={pop.closeBtn}><X size={14} /></button>
      </div>
      {/* Presets */}
      <div style={{ padding: '10px 14px 6px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PERIOD_PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p)} style={{
            padding: '4px 11px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', border: '1px solid var(--border)',
            background: 'var(--surface2)', color: 'var(--text-soft)',
            fontFamily: 'var(--font)', transition: 'all 0.12s',
          }}>
            {p.label}
          </button>
        ))}
      </div>
      {/* De / Até */}
      <div style={{ padding: '6px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'De', mes: deMes, ano: deAno, setMes: setDeMes, setAno: setDeAno },
          { label: 'Até', mes: ateMes, ano: ateAno, setMes: setAteMes, setAno: setAteAno },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em', width: 30 }}>
              {row.label}
            </span>
            <select style={{ ...sel, flex: 1 }} value={row.mes} onChange={e => row.setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select style={{ ...sel, width: 80 }} value={row.ano} onChange={e => row.setAno(e.target.value)}>
              {anos.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={pop.footer}>
        <button onClick={onClose} style={{ ...pop.applyBtn, marginLeft: 'auto' }}>Aplicar</button>
      </div>
    </div>
  )
}

// ─── Popover: Responsável ─────────────────────────────────────────────────────
function ResponsavelPopover({ selected, onChange, onClose, anchorRef, vendedores }) {
  const popRef = useRef(null)
  useOutsideClick(popRef, anchorRef, onClose)
  const [search, setSearch] = useState('')

  const visibleVendedores = vendedores.filter(v =>
    v.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={popRef} style={{ ...pop.wrap, width: 280 }}>
      <div style={pop.header}>
        <span style={pop.title}>Responsável</span>
        <button onClick={onClose} style={pop.closeBtn}><X size={14} /></button>
      </div>
      <div style={{ padding: '10px 14px 4px' }}>
        <input placeholder="Buscar vendedor..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface2)',
            fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font)',
            outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 14px 10px',
        display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Todos */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px',
          borderRadius: 7, cursor: 'pointer', background: !selected ? 'var(--accent-glow)' : 'transparent' }}>
          <input type="radio" name="resp" checked={!selected} onChange={() => onChange('')}
            style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: !selected ? 'var(--accent)' : 'var(--text)' }}>
            Todos os responsáveis
          </span>
        </label>
        {visibleVendedores.map(v => (
          <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px',
            borderRadius: 7, cursor: 'pointer',
            background: selected === v.id ? 'var(--accent-glow)' : 'transparent' }}>
            <input type="radio" name="resp" checked={selected === v.id} onChange={() => onChange(v.id)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600,
                color: selected === v.id ? 'var(--accent)' : 'var(--text)' }}>{v.nome}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{v.unidade}</div>
            </div>
          </label>
        ))}
      </div>
      <div style={pop.footer}>
        <button onClick={() => onChange('')} style={pop.clearBtn}>Limpar</button>
        <button onClick={onClose} style={pop.applyBtn}>Aplicar</button>
      </div>
    </div>
  )
}

// Estilos compartilhados dos popovers
const pop = {
  wrap:     { position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 500,
              minWidth: 260, background: 'var(--surface)', borderRadius: 12,
              border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
              overflow: 'hidden' },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' },
  title:    { fontSize: 13, fontWeight: 700, color: 'var(--text)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 },
  footer:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 14px', borderTop: '1px solid var(--border)' },
  clearBtn: { background: 'none', border: 'none', fontSize: 12, color: 'var(--text-muted)',
              cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font)', textDecoration: 'underline' },
  applyBtn: { padding: '7px 18px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font)' },
}

// ─── Célula da matriz (compacta) ─────────────────────────────────────────────
function MatrixCell({ goal, tipo_meta, subtipo_operacional, valor_sufixo, onEdit }) {
  const [hover, setHover] = useState(false)

  if (!goal) {
    return (
      <td style={mx.td}>
        <div style={{ textAlign: 'center', color: 'var(--border)', fontSize: 13, lineHeight: '30px' }}>—</div>
      </td>
    )
  }

  const p   = pctReal(goal.valor_atual, goal.valor_alvo)
  const cor = corBarra(Math.min(p, 100))
  const goalTipo    = goal.tipo_meta || tipo_meta
  const goalSubtipo = goal.subtipo_operacional || subtipo_operacional
  const goalSufixo  = goal.valor_sufixo || valor_sufixo
  const alvoFmt     = fmtCompact(goal.valor_alvo, goalTipo, { ...goal, subtipo_operacional: goalSubtipo, valor_sufixo: goalSufixo })
  const realFmt     = fmtCompact(goal.valor_atual, goalTipo, { ...goal, subtipo_operacional: goalSubtipo, valor_sufixo: goalSufixo })
  const pPct        = Math.min(p, 100)

  return (
    <td style={mx.td}>
      <div
        onClick={() => onEdit(goal)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          borderRadius: 5, cursor: 'pointer',
          borderLeft: `2.5px solid ${cor}`,
          background: hover ? cor + '18' : cor + '09',
          padding: '4px 7px 5px',
          transition: 'background 0.1s',
        }}>
        {/* Linha: resultado / meta */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: cor, fontFamily: 'var(--mono)' }}>
            {realFmt}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-soft)', fontFamily: 'var(--mono)' }}>
            /{alvoFmt}
          </span>
        </div>
        {/* Barra de progresso */}
        <div style={{ height: 3, background: cor + '22', borderRadius: 2, marginTop: 4 }}>
          <div style={{ height: '100%', width: `${pPct}%`, background: cor, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>
    </td>
  )
}

// ─── Linha da matriz ──────────────────────────────────────────────────────────
function MatrixRow({ row, months, onEdit }) {
  // Calcular totais da linha (apenas meses com dados)
  const goalsInRange = months.map(m => row.goals[`${m.ano}-${m.mes}`]).filter(Boolean)
  const totalAlvo  = goalsInRange.reduce((s, g) => s + g.valor_alvo, 0)
  const totalAtual = goalsInRange.reduce((s, g) => s + g.valor_atual, 0)
  const pTotal     = pct(totalAtual, totalAlvo)
  const corTotal   = corBarra(pTotal)

  // Clica em qualquer célula → abre modal com o goal + row completo
  const handleCellEdit = useCallback((goal) => onEdit(goal, row), [onEdit, row])

  return (
    <tr style={{ borderBottom: '1px solid var(--border2)' }}>
      {/* Coluna entidade (sticky, max-200px) */}
      <td style={mx.stickyCol}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar nome={row.nome_ref} size={26} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
              {row.nome_ref}
            </div>
            {row.sub_ref && (
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.2, marginBottom: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.sub_ref}
              </div>
            )}
            <AlvoBadge tipoAlvo={row.tipo_alvo} />
          </div>
        </div>
      </td>

      {/* Coluna de totais (compacta) */}
      {totalAlvo > 0 ? (
        <td style={mx.td}>
          <div style={{ padding: '4px 7px', borderRadius: 6,
            border: `1px dashed ${corTotal}50`, background: corTotal + '08' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: corTotal, lineHeight: 1.3 }}>{pTotal}%</div>
            <div style={{ height: 2, background: corTotal + '22', borderRadius: 1, margin: '3px 0' }}>
              <div style={{ height: '100%', width: `${Math.min(pTotal,100)}%`, background: corTotal, borderRadius: 1 }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>total</div>
          </div>
        </td>
      ) : <td style={mx.td} />}

      {/* Células mensais */}
      {months.map(m => (
        <MatrixCell
          key={`${m.ano}-${m.mes}`}
          goal={row.goals[`${m.ano}-${m.mes}`] || null}
          tipo_meta={row.tipo_meta}
          subtipo_operacional={row.subtipo_operacional}
          valor_sufixo={row.valor_sufixo}
          onEdit={handleCellEdit}
        />
      ))}
    </tr>
  )
}

// ─── Grid da matriz ───────────────────────────────────────────────────────────
function MatrixGrid({ rows, months, onEdit, onNew }) {
  if (rows.length === 0 || months.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--text-muted)' }}>
        <Target size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: .25 }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma meta encontrada para o período</div>
        <div style={{ fontSize: 12, marginTop: 6, opacity: .7 }}>Ajuste os filtros ou crie novas metas</div>
        <Button onClick={onNew} icon={<Plus size={14} />} style={{ marginTop: 16 }}>Nova meta</Button>
      </div>
    )
  }

  // Agrupar linhas por tipo_alvo para separadores visuais
  const groups = []
  let currentType = null
  rows.forEach(row => {
    if (row.tipo_alvo !== currentType) {
      currentType = row.tipo_alvo
      groups.push({ tipo: row.tipo_alvo, label: TIPOS_ALVO[row.tipo_alvo]?.label || row.tipo_alvo, rows: [] })
    }
    groups[groups.length - 1].rows.push(row)
  })

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <table style={mx.table}>
        {/* Cabeçalho */}
        <thead>
          <tr>
            {/* Col: entidade */}
            <th style={mx.stickyHeader}>
              Atribuição
            </th>
            {/* Col: total */}
            <th style={mx.th}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total
              </span>
            </th>
            {/* Cols: meses */}
            {months.map(m => {
              const isCurrent = m.mes === MES && m.ano === ANO
              return (
                <th key={`${m.ano}-${m.mes}`} style={{
                  ...mx.th,
                  ...(isCurrent ? {
                    background: 'var(--accent-glow)',
                    color: 'var(--accent)',
                    borderBottom: '2px solid var(--accent)',
                  } : {}),
                }}>
                  <div style={{ fontWeight: 800 }}>{MESES[m.mes-1].slice(0,3)}</div>
                  <div style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>{m.ano}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        {/* Corpo — agrupado */}
        <tbody>
          {groups.flatMap(g => [
            <tr key={`sep_${g.tipo}`}>
              <td colSpan={months.length + 2} style={{
                padding: '6px 16px 5px',
                background: 'var(--surface2)',
                borderTop: '2px solid var(--border)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--text-muted)',
                }}>
                  {g.label} · {g.rows.length} {g.rows.length === 1 ? 'linha' : 'linhas'}
                </span>
              </td>
            </tr>,
            ...g.rows.map(row => (
              <MatrixRow key={row.key} row={row} months={months} onEdit={onEdit} />
            )),
          ])}
        </tbody>
      </table>
    </div>
  )
}

// Estilos da matriz
const mx = {
  table:       { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  stickyHeader:{ position: 'sticky', left: 0, zIndex: 12,
                 background: 'var(--surface2)', padding: '8px 12px',
                 textAlign: 'left', fontSize: 10, fontWeight: 700,
                 textTransform: 'uppercase', letterSpacing: '0.08em',
                 color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                 width: 190, maxWidth: 200, whiteSpace: 'nowrap' },
  th:          { padding: '8px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700,
                 color: 'var(--text-muted)', background: 'var(--surface2)',
                 borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                 minWidth: 90 },
  stickyCol:   { position: 'sticky', left: 0, zIndex: 10, background: 'var(--surface)',
                 padding: '7px 10px', borderRight: '1px solid var(--border)',
                 width: 190, maxWidth: 200, verticalAlign: 'middle' },
  td:          { padding: '5px 5px', verticalAlign: 'middle', minWidth: 90 },
}

// ─── Célula dos meses no Modal (inalterado) ───────────────────────────────────
function MesCell({ mes, label, value, onChange, showPrefix, isCurrent }) {
  const filled = parseInput(value) > 0
  return (
    <div style={{
      borderRadius: 10,
      border: `1.5px solid ${filled ? 'var(--accent)' : 'var(--border)'}`,
      background: filled ? 'var(--accent-glow)' : isCurrent ? 'var(--surface3)' : 'var(--surface2)',
      padding: '8px 10px',
      transition: 'all 0.12s',
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: filled ? 'var(--accent)' : isCurrent ? 'var(--text-soft)' : 'var(--text-muted)',
      }}>{label}</span>
      <div style={{ position: 'relative' }}>
        {showPrefix && (
          <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', pointerEvents: 'none' }}>R$</span>
        )}
        <input type="text" inputMode="numeric" placeholder="—" value={value}
          onChange={e => onChange(mes, fmtInput(e.target.value))}
          style={{
            width: '100%', padding: showPrefix ? '6px 6px 6px 22px' : '6px 7px',
            borderRadius: 6, border: `1px solid ${filled ? 'var(--accent)' : 'var(--border)'}`,
            background: 'var(--surface)', fontSize: 12, fontWeight: filled ? 700 : 400,
            color: filled ? 'var(--text)' : 'var(--text-muted)',
            fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.12s',
          }} />
      </div>
    </div>
  )
}

// ─── Modal Nova/Editar Meta ───────────────────────────────────────────────────
const EMPTY_MESES_VALORES = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, '']))
const EMPTY_FORM = {
  tipo_alvo: 'vendedor', id_vendedor: '', id_unidade: '', category_id: '', product_id: '', equipe_id: '',
  tipo_meta: 'valor', subtipo_operacional: 'quantidade', valor_sufixo: '',
  periodo_ano: String(ANO), meses_valores: { ...EMPTY_MESES_VALORES }, valor_padrao_str: '',
  status: 'ativa',
}

function MetaDetail({ initial, row, onClose, onSave, vendedores, unidades, categorias, produtos, equipes }) {
  const isEditing = !!initial
  const [activeTab, setActiveTab] = useState('meta') // 'meta' | 'execucao'

  // ── Realizado state (aba Execução) ─────────────────────────────────────────
  const [realizadoValues, setRealizadoValues] = useState(() => {
    if (!row) return {}
    return Object.fromEntries(
      Object.values(row.goals).map(g => [g.id, g.valor_atual > 0 ? fmtInput(String(g.valor_atual)) : ''])
    )
  })

  function handleSaveRealizado() {
    const records = Object.values(row.goals).map(g => ({
      ...g,
      valor_atual: parseInput(realizadoValues[g.id] || '0'),
    }))
    onSave(records)
  }

  const [form, setForm] = useState(() => {
    if (!initial) return { ...EMPTY_FORM }
    // Preenche todos os meses a partir de row.goals (todos os meses salvos para essa entidade)
    const mv = { ...EMPTY_MESES_VALORES }
    if (row?.goals) {
      Object.values(row.goals).forEach(g => {
        if (String(g.periodo_ano) === String(initial.periodo_ano)) {
          const v = g.valor_alvo ?? g.valor_planejado ?? 0
          if (v > 0) mv[g.periodo_mes] = fmtInput(String(v))
        }
      })
    } else {
      mv[initial.periodo_mes] = fmtInput(String(initial.valor_alvo ?? 0))
    }
    return {
      tipo_alvo: initial.tipo_alvo, id_vendedor: initial.id_vendedor || '',
      id_unidade: initial.id_unidade || '', category_id: initial.category_id || '',
      product_id: initial.product_id || '', equipe_id: initial.equipe_id || '',
      tipo_meta: initial.tipo_meta,
      subtipo_operacional: initial.subtipo_operacional || 'quantidade',
      valor_sufixo: initial.valor_sufixo || '', periodo_ano: String(initial.periodo_ano),
      meses_valores: mv, valor_padrao_str: '', status: initial.status,
    }
  })
  const [errors, setErrors] = useState({})
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }
  function setMes(mes, val) { setForm(p => ({ ...p, meses_valores: { ...p.meses_valores, [mes]: val } })) }

  const filledCount = Object.values(form.meses_valores).filter(v => parseInput(v) > 0).length

  function applyPadrao() {
    if (!form.valor_padrao_str) return
    const mv = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i+1, form.valor_padrao_str]))
    setForm(p => ({ ...p, meses_valores: mv }))
  }
  function clearAll() { setForm(p => ({ ...p, meses_valores: { ...EMPTY_MESES_VALORES }, valor_padrao_str: '' })) }

  function validate() {
    const e = {}
    if (form.tipo_alvo==='vendedor'  && !form.id_vendedor)  e.ref='Selecione um vendedor'
    if (form.tipo_alvo==='unidade'   && !form.id_unidade)   e.ref='Selecione uma unidade'
    if (form.tipo_alvo==='categoria' && !form.category_id)  e.ref='Selecione uma categoria'
    if (form.tipo_alvo==='produto'   && !form.product_id)   e.ref='Selecione um produto'
    if (form.tipo_alvo==='equipe'    && !form.equipe_id)    e.ref='Selecione uma equipe'
    if (filledCount === 0) e.meses='Preencha ao menos um mês'
    setErrors(e); return Object.keys(e).length === 0
  }

  function handleSave(e) {
    e.preventDefault()
    if (!validate()) return
    let nome_ref = '', sub_ref = ''
    if (form.tipo_alvo==='vendedor')       { const v=vendedores.find(x=>x.id===form.id_vendedor); nome_ref=v?.nome||''; sub_ref=v?.unidade||v?.franquia||'' }
    else if (form.tipo_alvo==='unidade')   { const u=unidades.find(x=>x.id===form.id_unidade);    nome_ref=u?.nome||'' }
    else if (form.tipo_alvo==='categoria') { nome_ref=form.category_id; sub_ref='Categoria de produto' }
    else if (form.tipo_alvo==='produto')   { const p=produtos.find(x=>x.id===form.product_id); nome_ref=p?.nome||''; sub_ref=p?.categoria||'' }
    else if (form.tipo_alvo==='equipe')    { const e=equipes.find(x=>x.id===form.equipe_id);    nome_ref=e?.nome||''; sub_ref='Equipe' }

    const base = {
      tipo_alvo: form.tipo_alvo,
      id_vendedor: form.tipo_alvo==='vendedor'  ? form.id_vendedor  : null,
      id_unidade:  form.tipo_alvo==='unidade'   ? form.id_unidade   : null,
      category_id: form.tipo_alvo==='categoria' ? form.category_id  : null,
      product_id:  form.tipo_alvo==='produto'   ? form.product_id   : null,
      equipe_id:   form.tipo_alvo==='equipe'    ? form.equipe_id    : null,
      alvo_nome: nome_ref, alvo_contexto: sub_ref,
      nome_ref, sub_ref,
      tipo_meta: form.tipo_meta,
      subtipo_operacional: form.tipo_meta==='operacional' ? form.subtipo_operacional : null,
      valor_sufixo: form.tipo_meta==='operacional' && form.subtipo_operacional==='quantidade' ? (form.valor_sufixo||null) : null,
      periodo_ano: Number(form.periodo_ano), data_inicio:null, data_fim:null, status:form.status,
    }

    if (isEditing) {
      const records = Object.entries(form.meses_valores)
        .filter(([,v]) => parseInput(v) > 0)
        .map(([mes,v]) => {
          const mesNum = Number(mes)
          const isOriginal = mesNum === initial.periodo_mes
          return { ...base, id: isOriginal ? initial.id : `g_${Date.now()}_${mes}`,
            valor_alvo: parseInput(v), valor_atual: isOriginal ? initial.valor_atual : 0, periodo_mes: mesNum }
        })
      onSave(records)
    } else {
      const ts = Date.now()
      const records = Object.entries(form.meses_valores)
        .filter(([,v]) => parseInput(v) > 0)
        .map(([mes,v]) => ({ ...base, id:`g_${ts}_${mes}`, valor_alvo:parseInput(v), valor_atual:0, periodo_mes:Number(mes) }))
      onSave(records)
    }
  }

  const ALVO_OPTIONS = Object.entries(TIPOS_ALVO).map(([k,v]) => ({ val:k, label:v.label }))
  const modalAnos = [ANO-1, ANO, ANO+1]
  const isOp  = form.tipo_meta === 'operacional'
  const showR = form.tipo_meta === 'valor' || (isOp && form.subtipo_operacional === 'moeda')

  const tipoMetaOpts  = Object.entries(TIPOS_META).map(([k,v]) => ({ value:k, label:v.label }))
  const periodoAnoOpts = [ANO-1, ANO, ANO+1].map(y => ({ value:String(y), label:String(y) }))
  const statusOpts     = Object.entries(STATUS_CFG).map(([k,v]) => ({ value:k, label:v.label }))

  const left = (
    <div style={{ display:'flex', flexDirection:'column', gap:20, flex:1 }}>

      {/* Tipo de Alvo */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Tipo de atribuição</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {ALVO_OPTIONS.map(opt => {
            const cfg=TIPOS_ALVO[opt.val]; const isOn=form.tipo_alvo===opt.val
            return (
              <label key={opt.val} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
                borderRadius:9, cursor:'pointer',
                border:`2px solid ${isOn?cfg.badgeColor:'var(--border)'}`,
                background:isOn?cfg.badgeBg:'var(--surface2)', transition:'all 0.14s' }}>
                <input type="radio" name="tipo_alvo" value={opt.val} checked={isOn}
                  onChange={() => { set('tipo_alvo',opt.val); setErrors({}) }}
                  style={{ accentColor:cfg.badgeColor, flexShrink:0 }} />
                <span style={{ fontSize:12, fontWeight:600, color:isOn?cfg.badgeColor:'var(--text-soft)' }}>{opt.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Referência dinâmica */}
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)',
          textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>
          {{ vendedor:'Vendedor', unidade:'Unidade / Franquia', categoria:'Categoria de produto', produto:'Produto', equipe:'Equipe' }[form.tipo_alvo]}
        </div>
        <select style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:`1px solid ${errors.ref?'var(--red)':'var(--border)'}`,
          background:'var(--surface2)', fontSize:13, color:'var(--text)', fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' }}
          value={form.tipo_alvo==='vendedor'?form.id_vendedor:form.tipo_alvo==='unidade'?form.id_unidade:form.tipo_alvo==='categoria'?form.category_id:form.tipo_alvo==='equipe'?form.equipe_id:form.product_id}
          onChange={e => {
            if (form.tipo_alvo==='vendedor')       set('id_vendedor',e.target.value)
            else if (form.tipo_alvo==='unidade')   set('id_unidade',e.target.value)
            else if (form.tipo_alvo==='categoria') set('category_id',e.target.value)
            else if (form.tipo_alvo==='equipe')    set('equipe_id',e.target.value)
            else                                   set('product_id',e.target.value)
          }}>
          <option value="">— Selecione —</option>
          {form.tipo_alvo==='vendedor'  && vendedores.map(v=><option key={v.id} value={v.id}>{v.nome}{v.unidade?` · ${v.unidade}`:''}</option>)}
          {form.tipo_alvo==='unidade'   && unidades.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
          {form.tipo_alvo==='categoria' && categorias.map(c=><option key={c} value={c}>{c}</option>)}
          {form.tipo_alvo==='produto'   && produtos.map(p=><option key={p.id} value={p.id}>{p.nome}{p.categoria?` · ${p.categoria}`:''}</option>)}
          {form.tipo_alvo==='equipe'    && equipes.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        {errors.ref && <span style={{ fontSize:11, color:'var(--red)', fontWeight:600, marginTop:3, display:'block' }}>{errors.ref}</span>}
      </div>

      {/* Abas (edição): Meta / Execução */}
      {isEditing && row && (
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
          {[{ key:'meta', label:'Meta / Alvo' },{ key:'execucao', label:'Execução · Realizado' }].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              style={{ padding:'8px 14px', fontSize:12.5, fontWeight:700, border:'none',
                background:'none', cursor:'pointer', fontFamily:'var(--font)',
                color: activeTab===tab.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab===tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom:-1, transition:'color 0.12s' }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Aba Execução */}
      {activeTab === 'execucao' && isEditing && row && (() => {
        const sortedGoals = Object.values(row.goals).sort((a,b)=>(a.periodo_ano*12+a.periodo_mes)-(b.periodo_ano*12+b.periodo_mes))
        const goalTipo    = initial.tipo_meta
        const goalSubtipo = initial.subtipo_operacional
        const goalSufixo  = initial.valor_sufixo
        const showPfx     = goalTipo==='valor' || (goalTipo==='operacional' && goalSubtipo==='moeda')
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <p style={{ margin:'0 0 4px', fontSize:12, color:'var(--text-muted)' }}>
              Preencha o valor realizado em cada mês.
            </p>
            {sortedGoals.map(g => {
              const alvoFmt = fmtCompact(g.valor_alvo, goalTipo, { ...g, subtipo_operacional:goalSubtipo, valor_sufixo:goalSufixo })
              const val = realizadoValues[g.id] ?? ''
              const p   = pctReal(parseInput(val), g.valor_alvo)
              const cor = corBarra(Math.min(p,100))
              return (
                <div key={g.id} style={{ display:'grid', gridTemplateColumns:'90px 1fr 70px',
                  alignItems:'center', gap:10, padding:'8px 10px',
                  borderRadius:9, background:'var(--surface2)', border:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>
                      {MESES[g.periodo_mes-1].slice(0,3)} {g.periodo_ano}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                      Meta: {alvoFmt}
                    </div>
                  </div>
                  <div style={{ position:'relative' }}>
                    {showPfx && <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', fontSize:11, fontWeight:700, color:'var(--text-muted)', pointerEvents:'none' }}>R$</span>}
                    <input type="text" inputMode="numeric"
                      placeholder={g.valor_atual > 0 ? fmtInput(String(g.valor_atual)) : '0'}
                      value={val}
                      onChange={e => setRealizadoValues(prev => ({ ...prev, [g.id]: fmtInput(e.target.value) }))}
                      style={{ width:'100%', boxSizing:'border-box',
                        padding: showPfx ? '7px 10px 7px 26px' : '7px 10px',
                        borderRadius:7, border:`1.5px solid ${val ? cor : 'var(--border)'}`,
                        background:'var(--surface)', fontSize:13, fontWeight:700,
                        color:'var(--text)', fontFamily:'var(--mono)', outline:'none' }} />
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {val ? <span style={{ fontSize:12, fontWeight:800, color:cor }}>{p}%</span>
                         : <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>}
                  </div>
                </div>
              )
            })}
            <Button onClick={handleSaveRealizado} style={{ alignSelf:'flex-end', marginTop:6 }}>Salvar realizado</Button>
          </div>
        )
      })()}

      {/* Aba Meta / Alvo — distribuição mensal */}
      {activeTab === 'meta' && (
        <div style={{ borderRadius:12, border:`1.5px solid ${errors.meses?'var(--red)':'var(--border)'}`, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 14px', background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize:11, fontWeight:800, color:'var(--text)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                Distribuição por Mês
              </span>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:8 }}>
                {form.periodo_ano} · {showR?'(R$)':isOp?`(${form.valor_sufixo||'qtd'})`:'(ops)'}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {filledCount > 0 && <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>{filledCount}/12</span>}
              {filledCount > 0 && <button type="button" onClick={clearAll}
                style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline', padding:0 }}>
                Limpar
              </button>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', whiteSpace:'nowrap' }}>Padrão:</span>
            <div style={{ position:'relative', flex:1, maxWidth:160 }}>
              {showR && <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', fontSize:11, fontWeight:700, color:'var(--text-muted)', pointerEvents:'none' }}>R$</span>}
              <input type="text" inputMode="numeric" placeholder="0" value={form.valor_padrao_str}
                onChange={e => set('valor_padrao_str',fmtInput(e.target.value))}
                style={{ width:'100%', boxSizing:'border-box', height:32, padding:showR?'0 10px 0 24px':'0 10px',
                  borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)',
                  fontSize:12, fontFamily:'var(--mono)', color:'var(--text)', outline:'none' }} />
            </div>
            <button type="button" onClick={applyPadrao} disabled={!form.valor_padrao_str}
              style={{ padding:'0 12px', height:32, borderRadius:7, border:'1.5px solid var(--accent)',
                background:form.valor_padrao_str?'var(--accent)':'var(--surface2)',
                color:form.valor_padrao_str?'#fff':'var(--text-muted)',
                fontSize:11, fontWeight:700, cursor:form.valor_padrao_str?'pointer':'not-allowed',
                fontFamily:'var(--font)', transition:'all 0.14s' }}>
              Aplicar a todos
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, padding:'10px 14px', background:'var(--surface)' }}>
            {Array.from({length:12},(_,i)=>i+1).map(mes => (
              <MesCell key={mes} mes={mes} label={MESES[mes-1].slice(0,3)}
                value={form.meses_valores[mes]} onChange={setMes}
                showPrefix={showR} isCurrent={mes===MES && Number(form.periodo_ano)===ANO} />
            ))}
          </div>
          {errors.meses && (
            <div style={{ padding:'6px 14px', background:'rgba(220,38,38,0.07)', borderTop:'1px solid var(--border)' }}>
              <span style={{ fontSize:11, color:'var(--red)', fontWeight:600 }}>{errors.meses}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'meta' && (
        <Button onClick={e => { e.preventDefault(); handleSave(e) }} style={{ alignSelf:'flex-start' }}>
          {isEditing ? 'Salvar alterações' : `Criar ${filledCount>1?filledCount+' metas':'meta'}`}
        </Button>
      )}
    </div>
  )

  const fldStyle = { width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', fontSize:13, color:'var(--text)', fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {left}
      {/* Painel de configuração inline */}
      <FormSection label="Configuração">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <span style={lbl}>Tipo de meta</span>
            <select style={fldStyle} value={form.tipo_meta} onChange={e => set('tipo_meta', e.target.value)}>
              {tipoMetaOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <span style={lbl}>Ano</span>
            <select style={fldStyle} value={form.periodo_ano} onChange={e => set('periodo_ano', e.target.value)}>
              {periodoAnoOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {isEditing && (
            <div>
              <span style={lbl}>Status</span>
              <select style={fldStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
          {isOp && (
            <div>
              <span style={lbl}>Natureza</span>
              <select style={fldStyle} value={form.subtipo_operacional} onChange={e => set('subtipo_operacional', e.target.value)}>
                <option value="quantidade">Quantidade</option>
                <option value="moeda">Valor (R$)</option>
              </select>
            </div>
          )}
          {isOp && form.subtipo_operacional === 'quantidade' && (
            <div>
              <span style={lbl}>Sufixo</span>
              <input style={fldStyle} value={form.valor_sufixo || ''} onChange={e => set('valor_sufixo', e.target.value)} placeholder="treinamentos…" />
            </div>
          )}
        </div>
      </FormSection>

      {isEditing && initial && (
        <button type="button" onClick={onClose}
          style={{ alignSelf:'flex-start', padding:'7px 14px', borderRadius:8, border:'1px solid var(--red)', background:'none', color:'var(--red)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
          Excluir meta
        </button>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const FUNC_STORAGE_KEY = 'funcionarios:data_v2'

// ─── KPI card (padrão Pipeline) ──────────────────────────────────────────────
function KpiCard({ label, value, accent, sub, mono }) {
  return (
    <div style={{ background:'var(--surface)', borderRadius:10, padding:'16px 18px',
      display:'flex', flexDirection:'column', gap:4,
      border:'1px solid var(--border2)', boxShadow:'var(--shadow)',
      borderTop:`3px solid ${accent ? 'var(--accent)' : 'var(--border)'}` }}>
      <span style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1,
        fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</span>
      <span style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{label}</span>
      {sub && <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{sub}</span>}
    </div>
  )
}

export default function Metas() {
  const { goals, save: saveGoals, remove: deleteGoal } = useGoals()
  const { produtos: produtosStore } = useProducts()
  const { contratos: todosContratos } = useContracts()

  // ── Dados reais de referência ─────────────────────────────────────────────
  const [funcionarios]  = useLocalState(FUNC_STORAGE_KEY, [])
  const [franquiasData] = useLocalState('settings:franquias_v2', [])
  const [categoriasData] = useLocalState('produtos:categorias', [])
  const [equipesData]   = useLocalState('settings:equipes_v1', [])

  const vendedores = funcionarios.map(f => ({ id: f.id, nome: f.nome, unidade: f.empresa || '' }))
  const unidades   = franquiasData.map(f => ({ id: String(f.id), nome: [f.codigo ? `[${f.codigo}] ` : '', f.nome].join('') }))
  const categorias = categoriasData
  const produtos   = produtosStore
  const equipes    = equipesData.filter(e => e.status !== 'inativa')

  // Período De/Até
  const [deMes,  setDeMes]  = useLocalState('metas:deMes',  String(1))
  const [deAno,  setDeAno]  = useLocalState('metas:deAno',  String(ANO))
  const [ateMes, setAteMes] = useLocalState('metas:ateMes', String(MES))
  const [ateAno, setAteAno] = useLocalState('metas:ateAno', String(ANO))

  // Filtros
  const [filterTipos,    setFilterTipos]    = useLocalState('metas:filterTipos',    [])
  const [filterVendedor, setFilterVendedor] = useLocalState('metas:filterVendedor', '')
  const [showKpis,       setShowKpis]       = useLocalState('metas:showKpis',       true)

  // Popovers
  const [atribuicaoOpen,  setAtribuicaoOpen]  = useState(false)
  const [periodoOpen,     setPeriodoOpen]      = useState(false)
  const [responsavelOpen, setResponsavelOpen] = useState(false)
  const atribuicaoRef  = useRef(null)
  const periodoRef     = useRef(null)
  const responsavelRef = useRef(null)

  const [modal, setModal] = useState(null)

  // ── Colunas de meses ────────────────────────────────────────────────────
  const months = useMemo(() => {
    const result = []
    let year = Number(deAno), month = Number(deMes)
    const endYear = Number(ateAno), endMonth = Number(ateMes)
    let safety = 0
    while ((year < endYear || (year === endYear && month <= endMonth)) && safety < 36) {
      result.push({ mes: month, ano: year })
      month++; if (month > 12) { month = 1; year++ }
      safety++
    }
    return result
  }, [deMes, deAno, ateMes, ateAno])

  // ── Linhas da matriz ────────────────────────────────────────────────────
  const matrixRows = useMemo(() => {
    const deDate  = Number(deAno)  * 12 + Number(deMes)
    const ateDate = Number(ateAno) * 12 + Number(ateMes)

    const inRange = goals.filter(g => {
      const gDate = g.periodo_ano * 12 + g.periodo_mes
      return gDate >= deDate && gDate <= ateDate
    })

    // Filtro tipo de atribuição
    const byTipo = filterTipos.length === 0 ? inRange : inRange.filter(g => {
      if (filterTipos.includes('operacional') && g.tipo_meta === 'operacional') return true
      if (filterTipos.includes('responsavel') && (g.tipo_alvo==='vendedor' || g.tipo_alvo==='unidade')) return true
      if (filterTipos.includes('categoria')   && g.tipo_alvo==='categoria') return true
      if (filterTipos.includes('produto')     && g.tipo_alvo==='produto')   return true
      return false
    })

    // Filtro responsável
    const byResp = filterVendedor
      ? byTipo.filter(g => g.id_vendedor === filterVendedor)
      : byTipo

    // Agrupar por entidade
    // Suporte a ambos os formatos de campo (hook novo: alvo_nome/alvo_contexto, legado: nome_ref/sub_ref)
    // Fallback: resolve nome a partir dos dados de referência quando alvo_nome está vazio (goals antigos no Supabase)
    function resolveNome(g) {
      const raw = g.alvo_nome || g.nome_ref || ''
      if (raw) return raw
      if (g.tipo_alvo === 'vendedor')  { const v = vendedores.find(x => x.id === g.id_vendedor);  return v?.nome || '' }
      if (g.tipo_alvo === 'unidade')   { const u = unidades.find(x => x.id === g.id_unidade);     return u?.nome || '' }
      if (g.tipo_alvo === 'categoria') { return g.category_id || '' }
      if (g.tipo_alvo === 'produto')   { const p = produtos.find(x => String(x.id) === String(g.product_id)); return p?.nome || '' }
      if (g.tipo_alvo === 'equipe')    { const e = equipes.find(x => x.id === g.equipe_id);       return e?.nome || '' }
      return ''
    }
    function resolveContexto(g) {
      const raw = g.alvo_contexto || g.sub_ref || ''
      if (raw) return raw
      if (g.tipo_alvo === 'vendedor')  { const v = vendedores.find(x => x.id === g.id_vendedor);  return v?.unidade || '' }
      if (g.tipo_alvo === 'categoria') return 'Categoria de produto'
      if (g.tipo_alvo === 'produto')   { const p = produtos.find(x => String(x.id) === String(g.product_id)); return p?.categoria || '' }
      if (g.tipo_alvo === 'equipe')    return 'Equipe'
      return ''
    }
    const entityMap = {}
    byResp.forEach(g => {
      const idRef  = g.id_vendedor || g.id_unidade || g.category_id || g.product_id || g.equipe_id || 'global'
      const key    = `${g.tipo_alvo}|${idRef}|${g.tipo_meta}`
      const nomeRef = resolveNome(g)
      const subRef  = resolveContexto(g)
      if (!entityMap[key]) {
        entityMap[key] = {
          key, tipo_alvo: g.tipo_alvo, tipo_meta: g.tipo_meta,
          subtipo_operacional: g.subtipo_operacional, valor_sufixo: g.valor_sufixo,
          nome_ref: nomeRef, sub_ref: subRef, goals: {},
        }
      }
      // Normaliza o registro para sempre ter valor_alvo e nome_ref
      entityMap[key].goals[`${g.periodo_ano}-${g.periodo_mes}`] = {
        ...g,
        nome_ref:  nomeRef,
        sub_ref:   subRef,
        valor_alvo: g.valor_planejado ?? g.valor_alvo ?? 0,
      }
    })

    const ORDER = { vendedor: 0, unidade: 1, categoria: 2, produto: 3 }
    return Object.values(entityMap).sort((a, b) => {
      if (ORDER[a.tipo_alvo] !== ORDER[b.tipo_alvo]) return ORDER[a.tipo_alvo] - ORDER[b.tipo_alvo]
      return a.nome_ref.localeCompare(b.nome_ref, 'pt-BR')
    })
  }, [goals, deMes, deAno, ateMes, ateAno, filterTipos, filterVendedor, vendedores, unidades, categorias, produtos, equipes])

  // ── KPIs de resumo ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const deDate  = Number(deAno)  * 12 + Number(deMes)
    const ateDate = Number(ateAno) * 12 + Number(ateMes)

    // Contratos do período atual
    const contratosAtivos = (todosContratos || []).filter(c => {
      if (!c.vigencia_inicio) return false
      const [y, m] = c.vigencia_inicio.split('-').map(Number)
      const d = y * 12 + m
      return d >= deDate && d <= ateDate
    })
    // Contratos do mesmo período do ano anterior (YoY)
    const contratosYoY = (todosContratos || []).filter(c => {
      if (!c.vigencia_inicio) return false
      const [y, m] = c.vigencia_inicio.split('-').map(Number)
      const d = (y + 1) * 12 + m  // compara com o ano seguinte = mesmo período do ano passado
      return d >= deDate && d <= ateDate
    })

    const somaValor = (arr) => arr.reduce((s, c) =>
      s + (Number(c.valor_adesao)||0) + (Number(c.valor_mrr)||0) + (Number(c.valor_servico)||0), 0)

    const realizado   = somaValor(contratosAtivos)
    const realizadoYY = somaValor(contratosYoY)
    const qtd         = contratosAtivos.length
    const ticket      = qtd > 0 ? realizado / qtd : 0
    const yoyDelta    = realizadoYY > 0
      ? ((realizado - realizadoYY) / realizadoYY * 100).toFixed(1)
      : null

    return { realizado, realizadoYY, qtd, ticket, yoyDelta }
  }, [todosContratos, deMes, deAno, ateMes, ateAno])

  // ── Rótulo do filtro de período ────────────────────────────────────────
  const periodoLabel = (() => {
    const de  = `${MESES[Number(deMes)-1].slice(0,3)} ${deAno}`
    const ate = `${MESES[Number(ateMes)-1].slice(0,3)} ${ateAno}`
    return de === ate ? de : `${de} → ${ate}`
  })()

  const responsavelLabel = filterVendedor
    ? vendedores.find(v => v.id === filterVendedor)?.nome?.split(' ')[0] || 'Responsável'
    : 'Responsável'

  // ── CRUD ────────────────────────────────────────────────────────────────
  function handleSave(records) { saveGoals(records); setModal(null) }
  function handleDelete(id) {
    if (!window.confirm('Excluir esta meta?')) return
    deleteGoal(id)
  }

  // Fechar popovers ao abrir outro
  function openAtribuicao()  { setAtribuicaoOpen(v=>!v); setPeriodoOpen(false);     setResponsavelOpen(false) }
  function openPeriodo()     { setPeriodoOpen(v=>!v);     setAtribuicaoOpen(false);  setResponsavelOpen(false) }
  function openResponsavel() { setResponsavelOpen(v=>!v); setAtribuicaoOpen(false);  setPeriodoOpen(false) }

  return (
    <div style={s.page}>

      {/* ── Top bar ── */}
      <div style={s.topBar}>
        {/* Esquerda: título + toggle KPIs */}
        <div>
          <div style={s.breadcrumb}>
            Comercial <span style={{ margin:'0 5px', opacity:.4 }}>›</span> Metas
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h1 style={s.title}>Metas Comerciais</h1>
            <button
              onClick={() => setShowKpis(v => !v)}
              title={showKpis ? 'Ocultar indicadores' : 'Exibir indicadores'}
              style={{ display:'flex', alignItems:'center', justifyContent:'center',
                width:28, height:28, borderRadius:7, border:'1px solid var(--border)',
                background:'var(--surface)', color:'var(--text-muted)',
                cursor:'pointer', flexShrink:0, marginTop:2 }}>
              {showKpis ? <ChevronDown size={14} /> : <ChevronDown size={14} style={{ transform:'rotate(-90deg)' }} />}
            </button>
          </div>
        </div>

        {/* Direita: filtros + CTA */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>

          {/* Filtro: Atribuição */}
          <div style={{ position:'relative' }} ref={atribuicaoRef}>
            <FilterButton
              icon={<SlidersHorizontal size={13} />}
              label={filterTipos.length > 0
                ? filterTipos.map(t=>TIPO_FILTER_OPTIONS.find(o=>o.val===t)?.label?.split(' ')[0]).join(', ')
                : 'Atribuição'}
              badge={filterTipos.length}
              active={filterTipos.length > 0}
              onClick={openAtribuicao}
            />
            {atribuicaoOpen && (
              <TipoAtribuicaoPopover
                selected={filterTipos}
                onChange={setFilterTipos}
                onClose={() => setAtribuicaoOpen(false)}
                anchorRef={atribuicaoRef}
              />
            )}
          </div>

          {/* Filtro: Período */}
          <div style={{ position:'relative' }} ref={periodoRef}>
            <FilterButton
              icon={<CalendarDays size={13} />}
              label={periodoLabel}
              badge={0}
              active={true}
              onClick={openPeriodo}
            />
            {periodoOpen && (
              <PeriodoPopover
                deMes={deMes} deAno={deAno} ateMes={ateMes} ateAno={ateAno}
                setDeMes={setDeMes} setDeAno={setDeAno} setAteMes={setAteMes} setAteAno={setAteAno}
                onClose={() => setPeriodoOpen(false)}
                anchorRef={periodoRef}
              />
            )}
          </div>

          {/* Filtro: Responsável */}
          <div style={{ position:'relative' }} ref={responsavelRef}>
            <FilterButton
              icon={<Users size={13} />}
              label={responsavelLabel}
              badge={filterVendedor ? 1 : 0}
              active={!!filterVendedor}
              onClick={openResponsavel}
            />
            {responsavelOpen && (
              <ResponsavelPopover
                selected={filterVendedor}
                onChange={setFilterVendedor}
                onClose={() => setResponsavelOpen(false)}
                anchorRef={responsavelRef}
                vendedores={vendedores}
              />
            )}
          </div>

          {/* Separador */}
          <div style={{ width:1, height:24, background:'var(--border)', margin:'0 4px' }} />

          {/* Contador */}
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
            {matrixRows.length} linha{matrixRows.length!==1?'s':''} · {months.length} {months.length===1?'mês':'meses'}
          </span>

          {/* Nova meta */}
          <Button icon={<Plus size={14} />} onClick={() => setModal({ mode:'new' })}>Nova meta</Button>
        </div>
      </div>

      {/* ── KPI cards retráteis ── */}
      <div style={{ display:'grid', gridTemplateRows: showKpis ? '1fr' : '0fr',
        transition:'grid-template-rows 0.25s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12,
            paddingBottom: showKpis ? 0 : 0 }}>
            <KpiCard
              label="Realizado (período)"
              value={`R$ ${kpis.realizado.toLocaleString('pt-BR', { maximumFractionDigits:0 })}`}
              accent mono
            />
            <KpiCard
              label="YoY — mesmo período ano anterior"
              value={`R$ ${kpis.realizadoYY.toLocaleString('pt-BR', { maximumFractionDigits:0 })}`}
              sub={kpis.yoyDelta !== null
                ? `${Number(kpis.yoyDelta) > 0 ? '+' : ''}${kpis.yoyDelta}% vs ano ant.`
                : 'sem dados do ano anterior'}
              mono
            />
            <KpiCard
              label="Ticket Médio"
              value={`R$ ${kpis.ticket.toLocaleString('pt-BR', { maximumFractionDigits:0 })}`}
              mono
            />
            <KpiCard label="Qtd. de Vendas" value={kpis.qtd} />
          </div>
        </div>
      </div>

      {/* ── Grid matriz ── */}
      <div style={s.tableWrap}>
        <MatrixGrid
          rows={matrixRows}
          months={months}
          onEdit={(goal, row) => setModal({ mode:'edit', goal, row })}
          onNew={() => setModal({ mode:'new' })}
        />
      </div>

      <SlideOver
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode==='edit' ? (modal.goal?.nome_ref || 'Meta') : 'Nova meta'}
        subtitle="Comercial · Metas"
        showFooter={false}
        initialSize="default"
      >
        {modal && (
          <MetaDetail
            initial={modal.mode==='edit' ? modal.goal : null}
            row={modal.row || null}
            onClose={() => setModal(null)}
            onSave={handleSave}
            vendedores={vendedores}
            unidades={unidades}
            categorias={categorias}
            produtos={produtos}
            equipes={equipes}
          />
        )}
      </SlideOver>
    </div>
  )
}

// ─── Estilos globais ──────────────────────────────────────────────────────────
const s = {
  page:        { minWidth: 0 },
  topBar:      { display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                 marginBottom:20, gap:16, flexWrap:'wrap' },
  breadcrumb:  { fontSize:11, color:'var(--text-muted)', fontWeight:600,
                 textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 },
  title:       { margin:0, fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.4px' },
  tableWrap:   { background:'var(--surface)', borderRadius:12,
                 border:'1px solid var(--border)', overflowX:'auto', overflowY:'hidden',
                 boxShadow:'var(--shadow)' },
  btnPrimary:  { display:'inline-flex', alignItems:'center',
                 padding:'9px 20px', borderRadius:9, border:'none', background:'var(--accent)',
                 color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' },
  btnSecondary:{ padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)',
                 background:'var(--surface)', color:'var(--text-soft)', fontSize:13,
                 fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  overlay:     { position:'fixed', inset:0, zIndex:600, background:'rgba(15,23,42,0.55)',
                 backdropFilter:'blur(3px)', display:'flex', alignItems:'center',
                 justifyContent:'center', padding:20 },
  modal:       { width:'100%', background:'var(--surface)', borderRadius:14,
                 boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' },
  modalHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                 padding:'20px 24px 16px', borderBottom:'1px solid var(--border)' },
  modalSub:    { fontSize:10, color:'var(--text-muted)', fontWeight:700,
                 textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 },
  modalTitle:  { margin:0, fontSize:17, fontWeight:800, color:'var(--text)' },
  closeBtn:    { background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                 padding:'4px', borderRadius:6, lineHeight:1, display:'flex', alignItems:'center' },
  grid2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  input:       { width:'100%', padding:'9px 11px', borderRadius:8, border:'1px solid var(--border)',
                 background:'var(--surface2)', fontSize:13, color:'var(--text)',
                 fontFamily:'var(--font)', outline:'none', boxSizing:'border-box' },
  lbl:         { fontSize:11, fontWeight:700, color:'var(--text-soft)', textTransform:'uppercase',
                 letterSpacing:'0.05em', display:'block', marginBottom:6 },
  err:         { fontSize:11, color:'var(--red)', fontWeight:600, marginTop:3, display:'block' },
}
