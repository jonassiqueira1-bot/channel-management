import { useState, useMemo } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useFaturas } from '../hooks/useFaturas'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import Badge from '../components/Badge'

const ACCENT = 'var(--accent)'

function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('T')[0].split('-')
  return `${dd}/${m}/${y.slice(2)}`
}

const STATUS_FATURA = {
  gerada:    { label: 'Gerada',    variant: 'info' },
  enviada:   { label: 'Enviada',   variant: 'warning' },
  paga:      { label: 'Paga',      variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'danger' },
}
const CADENCIA_LABEL   = { avulsa: 'Avulsa', recorrente: 'Recorrente' }
const ORIGEM_LABEL     = { parceiro: 'Parceiro', cliente_direto: 'Cliente direto' }

const FILTERS_DEF = [
  { key: 'status',          label: 'Status',    options: Object.entries(STATUS_FATURA).map(([k, v]) => ({ value: k, label: v.label })) },
  { key: 'cadencia',        label: 'Cadência',  options: Object.entries(CADENCIA_LABEL).map(([k, v]) => ({ value: k, label: v })) },
  { key: 'origem_cobranca', label: 'Origem',    options: Object.entries(ORIGEM_LABEL).map(([k, v]) => ({ value: k, label: v })) },
]

export default function TabFaturas() {
  const { faturas, save, bulkSetStatus, remove } = useFaturas()

  const [search,           setSearch]           = useLocalState('faturas:search', '')
  const [filtroStatus,     setFiltroStatus]     = useLocalState('faturas:filtroStatus', '')
  const [filtroCadencia,   setFiltroCadencia]   = useLocalState('faturas:filtroCadencia', '')
  const [filtroOrigem,     setFiltroOrigem]     = useLocalState('faturas:filtroOrigem', '')

  const [detalhe, setDetalhe] = useState(null)

  const hoje = new Date().toISOString().slice(0, 10)

  const lista = useMemo(() => {
    const q = search.toLowerCase()
    return faturas.filter(f => {
      if (filtroStatus   && f.status          !== filtroStatus)   return false
      if (filtroCadencia && f.cadencia        !== filtroCadencia) return false
      if (filtroOrigem   && f.origem_cobranca !== filtroOrigem)   return false
      if (q && !f.numero.toLowerCase().includes(q) &&
               !(f.company_nome || '').toLowerCase().includes(q) &&
               !(f.contract_numero || '').toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''))
  }, [faturas, search, filtroStatus, filtroCadencia, filtroOrigem])

  const activeFilters = {
    status:          filtroStatus   ? [filtroStatus]   : [],
    cadencia:        filtroCadencia ? [filtroCadencia] : [],
    origem_cobranca: filtroOrigem   ? [filtroOrigem]   : [],
  }
  function handleFilterChange(f) {
    setFiltroStatus(f.status?.[0] || '')
    setFiltroCadencia(f.cadencia?.[0] || '')
    setFiltroOrigem(f.origem_cobranca?.[0] || '')
  }

  async function handleSaveDetalhe(updated) {
    await save(updated)
    setDetalhe(null)
  }

  const kpisNode = (data) => {
    const total     = data.length
    const valor     = data.reduce((s, f) => s + (f.amount_total || 0), 0)
    const pagas     = data.filter(f => f.status === 'paga').length
    const emAberto  = data.filter(f => f.status === 'gerada' || f.status === 'enviada')
      .reduce((s, f) => s + (f.amount_total || 0), 0)
    const vencidas  = data.filter(f => f.status !== 'paga' && f.status !== 'cancelada' && f.due_date && f.due_date < hoje).length
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 0' }}>
        {[
          { label: 'Faturas',      value: total,             color: 'var(--text)' },
          { label: 'Pagas',        value: pagas,              color: '#10B981' },
          { label: 'Valor total',  value: fmtMoeda(valor),    color: ACCENT,    mono: true },
          { label: 'Em aberto',    value: fmtMoeda(emAberto), color: '#D97706', mono: true },
          { label: 'Vencidas',     value: vencidas,           color: vencidas > 0 ? '#EF4444' : 'var(--text-muted)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)',
            borderTop: `2px solid ${k.color}`, borderRadius: 10, padding: '14px 20px',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
            <span style={{ fontSize: k.mono ? 16 : 24, fontWeight: 800, color: k.color,
              fontFamily: k.mono ? 'var(--mono)' : 'var(--font)', letterSpacing: k.mono ? '-0.02em' : '-0.03em' }}>
              {k.value}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</span>
          </div>
        ))}
      </div>
    )
  }

  const columns = [
    {
      key: 'numero', label: 'Fatura / Empresa',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ACCENT}18`,
            color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, fontFamily: 'var(--mono)', flexShrink: 0,
            border: `1px solid ${ACCENT}30` }}>
            {(row.company_nome || '?').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{val}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {row.company_nome} {row.contract_numero && `· ${row.contract_numero}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'itens', label: 'Produtos',
      render: (v) => (v || []).length
        ? <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{v.map(i => i.nome).join(', ')}</span>
        : <span style={{ color: 'var(--border2)', fontSize: 11 }}>—</span>,
    },
    { key: 'competencia', label: 'Competência', render: v => <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)' }}>{fmtData(v)}</span> },
    {
      key: 'due_date', label: 'Vencimento',
      render: (v, row) => {
        const atras = row.status !== 'paga' && row.status !== 'cancelada' && v && v < hoje
        return <span style={{ fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap', color: atras ? '#EF4444' : 'var(--text-soft)' }}>{atras ? '⚠ ' : ''}{fmtData(v)}</span>
      },
    },
    { key: 'amount_total', label: 'Valor', render: v => <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{fmtMoeda(v)}</span> },
    { key: 'cadencia', label: 'Cadência', render: v => <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{CADENCIA_LABEL[v] || v}</span> },
    { key: 'origem_cobranca', label: 'Origem', render: v => <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{ORIGEM_LABEL[v] || v}</span> },
    { key: 'status', label: 'Status', render: v => <Badge status={v} variant={STATUS_FATURA[v]?.variant}>{STATUS_FATURA[v]?.label || v}</Badge> },
  ]

  return (
    <>
      <BrowseLayout
        modulo="faturas"
        data={lista}
        columns={columns}
        keyField="id"
        storageKey="faturas_browse"
        kpis={kpisNode}
        kpisLabel="Indicadores"
        search={search}
        onSearchChange={setSearch}
        filters={FILTERS_DEF}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        bulkActions={[
          { label: 'Alterar Status ▾', type: 'dropdown', options:
            Object.entries(STATUS_FATURA).map(([key, cfg]) => ({
              label: cfg.label,
              onClick: ids => bulkSetStatus(ids, key),
            }))
          },
          { label: 'Excluir', onClick: ids => {
            if (window.confirm(`Excluir ${ids.length} fatura(s)?`))
              ids.forEach(id => remove(id))
          }},
        ]}
        onRowClick={f => setDetalhe(f)}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>🧾</span>
            <span>Nenhuma fatura gerada ainda</span>
            <span style={{ fontSize: 12 }}>Faturas são geradas automaticamente ao ativar um contrato</span>
          </div>
        }
      />

      {detalhe && (
        <SlideOver open title={`Fatura ${detalhe.numero}`} onClose={() => setDetalhe(null)} defaultWidth="480">
          <FormGrid>
            <FormSection title="Cobrança">
              <FormField label="Empresa"><div>{detalhe.company_nome || '—'}</div></FormField>
              <FormField label="Contrato"><div>{detalhe.contract_numero || '—'}</div></FormField>
              <FormField label="Produtos">
                <div>{(detalhe.itens || []).map(i => `${i.nome} — ${fmtMoeda(i.valor)}`).join(' · ') || '—'}</div>
              </FormField>
              <FormField label="Valor total"><div>{fmtMoeda(detalhe.amount_total)}</div></FormField>
              <FormField label="Competência"><div>{fmtData(detalhe.competencia)}</div></FormField>
              <FormField label="Vencimento"><div>{fmtData(detalhe.due_date)}</div></FormField>
              <FormField label="Cadência"><div>{CADENCIA_LABEL[detalhe.cadencia] || detalhe.cadencia}</div></FormField>
              <FormField label="Origem da cobrança"><div>{ORIGEM_LABEL[detalhe.origem_cobranca] || detalhe.origem_cobranca}</div></FormField>
            </FormSection>
            <FormSection title="Status">
              <FormField label="Status">
                <select value={detalhe.status} onChange={e => setDetalhe({ ...detalhe, status: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 7,
                    border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13 }}>
                  {Object.entries(STATUS_FATURA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </FormField>
            </FormSection>
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 0' }}>
            <button onClick={() => setDetalhe(null)} style={{ padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
            <button onClick={() => handleSaveDetalhe(detalhe)} style={{ padding: '8px 16px', borderRadius: 8,
              border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Salvar
            </button>
          </div>
        </SlideOver>
      )}
    </>
  )
}
