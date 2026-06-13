import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'

// Unidades = empresas cadastradas como tipo 'parceiro'
// Em produção: SELECT * FROM empresas WHERE organization_id = ? AND tipo = 'parceiro'

const STATUS_MAP = {
  ativo:      { label: 'Ativo',      color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  negociacao: { label: 'Negociação', color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  inativo:    { label: 'Inativo',    color: '#9A9590',       bg: 'var(--surface3)',  text: 'var(--text-muted)' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.inativo
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function fmtMRR(v) {
  return v ? `R$ ${v.toLocaleString('pt-BR')}` : '—'
}

export default function Unidades() {
  const allUnidades = useMemo(() => MOCK_EMPRESAS.filter(e => e.tipo === 'parceiro'), [])

  const [search, setSearch]           = useLocalState('unidades:search', '')
  const [filterStatus, setFilterStatus] = useLocalState('unidades:filterStatus', '')
  const [filterSeg, setFilterSeg]     = useLocalState('unidades:filterSeg', '')
  const [sortBy, setSortBy]           = useLocalState('unidades:sortBy', 'razao')

  const segmentos = useMemo(() => [...new Set(allUnidades.map(u => u.segmento).filter(Boolean))].sort(), [allUnidades])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allUnidades
      .filter(u => {
        if (filterStatus && u.status !== filterStatus) return false
        if (filterSeg && u.segmento !== filterSeg) return false
        if (q && !(u.razao?.toLowerCase().includes(q) || u.fantasia?.toLowerCase().includes(q) || u.cidade?.toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'mrr') return b.mrr - a.mrr
        if (sortBy === 'criado') return new Date(b.criado) - new Date(a.criado)
        return a.razao?.localeCompare?.(b.razao) ?? 0
      })
  }, [allUnidades, search, filterStatus, filterSeg, sortBy])

  const totalMRR = allUnidades.reduce((s, u) => s + (u.mrr || 0), 0)
  const ativos   = allUnidades.filter(u => u.status === 'ativo').length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>Clientes</span>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>›</span>
          <span style={{ fontSize:11, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>Unidades</span>
        </div>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', margin:0 }}>Unidades</h1>
        <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:13 }}>
          Parceiros cadastrados em Empresas com tipo <strong style={{ color:'var(--purple-text)' }}>Parceiro</strong>
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        <KpiCard label="Total de Unidades" value={allUnidades.length} />
        <KpiCard label="Unidades Ativas"   value={ativos} color="var(--green-text)" />
        <KpiCard label="MRR Total"         value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} mono />
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input
          style={s.search}
          placeholder="Buscar unidade, cidade…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={s.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="negociacao">Negociação</option>
          <option value="inativo">Inativo</option>
        </select>
        {segmentos.length > 0 && (
          <select style={s.select} value={filterSeg} onChange={e => setFilterSeg(e.target.value)}>
            <option value="">Todos os segmentos</option>
            {segmentos.map(sg => <option key={sg} value={sg}>{sg}</option>)}
          </select>
        )}
        <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="razao">A-Z</option>
          <option value="mrr">Maior MRR</option>
          <option value="criado">Mais recente</option>
        </select>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          {filtered.length} de {allUnidades.length} unidades
        </span>
      </div>

      {/* Nota informativa */}
      <div style={{ background:'var(--purple-bg)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:13 }}>ℹ️</span>
        <span style={{ fontSize:12, color:'var(--purple-text)' }}>
          Esta lista é derivada automaticamente do cadastro de <strong>Empresas</strong>. Para adicionar ou editar uma unidade, acesse o cadastro de Empresas e defina o tipo como <strong>Parceiro</strong>.
        </span>
      </div>

      {/* Tabela */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Unidade</th>
              <th style={s.th}>Segmento</th>
              <th style={s.th}>Localização</th>
              <th style={s.th}>Franquia AR</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign:'right' }}>MRR</th>
              <th style={s.th}>Responsável</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>
                  Nenhuma unidade encontrada
                </td>
              </tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={s.avatar}>{(u.fantasia || u.razao).slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{u.fantasia || u.razao}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{u.cnpj}</div>
                    </div>
                  </div>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize:12, color:'var(--text-soft)' }}>{u.segmento || '—'}</span>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize:12, color:'var(--text-soft)' }}>{u.cidade}/{u.uf}</span>
                </td>
                <td style={s.td}>
                  {u.franquia_ar_id ? (
                    <span style={{ fontSize:12, color:'var(--purple-text)', fontWeight:500 }}>{u.franquia_ar_nome}</span>
                  ) : (
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td style={s.td}><StatusBadge status={u.status} /></td>
                <td style={{ ...s.td, textAlign:'right', fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:'var(--text)' }}>
                  {fmtMRR(u.mrr)}
                </td>
                <td style={s.td}>
                  <span style={{ fontSize:12, color:'var(--text-soft)' }}>{u.responsavel || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, mono }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 20px' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'var(--mono)' }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: color || 'var(--text)', fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</div>
    </div>
  )
}

const s = {
  search: {
    padding:'7px 12px', borderRadius:'var(--radius)', border:'1px solid var(--border)',
    background:'var(--surface)', fontSize:13, color:'var(--text)', outline:'none', width:220,
    fontFamily:'var(--font)',
  },
  select: {
    padding:'7px 10px', borderRadius:'var(--radius)', border:'1px solid var(--border)',
    background:'var(--surface)', fontSize:12, color:'var(--text)', outline:'none', cursor:'pointer',
    fontFamily:'var(--font)',
  },
  tableWrap: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:'var(--radius-lg)', overflow:'hidden',
  },
  table: { width:'100%', borderCollapse:'collapse' },
  th: {
    padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600,
    color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em',
    fontFamily:'var(--mono)', borderBottom:'1px solid var(--border)', background:'var(--surface2)',
  },
  tr: { borderBottom:'1px solid var(--border2)', transition:'background 0.1s' },
  td: { padding:'12px 14px', verticalAlign:'middle' },
  avatar: {
    width:32, height:32, borderRadius:8, background:'var(--purple-bg)',
    color:'var(--purple-text)', display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0,
    border:'1px solid rgba(124,58,237,0.15)',
  },
}
