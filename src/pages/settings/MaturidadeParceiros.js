import { useState, useMemo } from 'react'
import { usePartnerMaturity, ORIGENS as ORIGENS_PARCEIROS, CONDICOES } from '../../hooks/usePartnerMaturity'
import { useSellerMaturity, ORIGENS as ORIGENS_VENDEDORES } from '../../hooks/useSellerMaturity'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

// Um só cadastro de parâmetros de maturidade — o campo "escopo" decide se o
// parâmetro vale pra Parceiros (franquias e canais, usePartnerMaturity) ou
// pra Vendedores (contatos canal externos, useSellerMaturity). Cada hook
// continua com sua própria tabela/engine de cálculo (usados em Parceiros.js
// e Vendedores.js) — esta tela só unifica o cadastro/edição dos parâmetros.
const ESCOPOS = [
  { value: 'parceiros',  label: 'Parceiros (franquias e canais)' },
  { value: 'vendedores', label: 'Vendedores (externos)' },
]

const EMPTY_PARAM = {
  escopo:      'parceiros',
  nome:        '',
  descricao:   '',
  origem:      'contacts',
  condicao:    'exists',
  valor_min:   1,
  janela_dias: null,
  peso:        10,
  ativo:       true,
  ordem:       0,
}

function origensDe(escopo) { return escopo === 'vendedores' ? ORIGENS_VENDEDORES : ORIGENS_PARCEIROS }
function origemLabel(escopo, v) { return origensDe(escopo).find(o => o.value === v)?.label || v }
function condicaoLabel(v) { return CONDICOES.find(c => c.value === v)?.label || v }
function escopoLabel(v) { return ESCOPOS.find(e => e.value === v)?.label || v }

export default function MaturidadeParceiros() {
  const partnerHook = usePartnerMaturity()
  const sellerHook  = useSellerMaturity()

  const params = useMemo(() => [
    ...partnerHook.params.map(p => ({ ...p, escopo: 'parceiros' })),
    ...sellerHook.params.map(p => ({ ...p, escopo: 'vendedores' })),
  ], [partnerHook.params, sellerHook.params])
  const loading = partnerHook.loading || sellerHook.loading

  const [editando, setEditando]   = useState(null)
  const [slideOpen, setSlideOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [errs, setErrs]           = useState({})
  const [form, setForm]           = useState({ ...EMPTY_PARAM })
  const [search, setSearch]       = useState('')

  function hookDoEscopo(escopo) { return escopo === 'vendedores' ? sellerHook : partnerHook }

  const totalPeso = useMemo(
    () => params.filter(p => p.ativo).reduce((s, p) => s + p.peso, 0),
    [params]
  )

  function openNew() {
    setEditando(null)
    setForm({ ...EMPTY_PARAM, ordem: params.length })
    setErrs({})
    setSlideOpen(true)
  }

  function openEdit(p) {
    setEditando(p)
    setForm({ ...EMPTY_PARAM, ...p })
    setErrs({})
    setSlideOpen(true)
  }

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      // Trocar de escopo muda o catálogo de origens — evita salvar uma
      // origem que não existe no hook de destino.
      if (k === 'escopo') next.origem = origensDe(v)[0]?.value || ''
      return next
    })
    if (errs[k]) setErrs(e => ({ ...e, [k]: '' }))
  }

  async function handleSave() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.peso < 1) e.peso = 'Peso mínimo é 1'
    if (Object.keys(e).length) { setErrs(e); return }
    setSaving(true)
    const { escopo, ...paramSemEscopo } = form
    // Se o escopo mudou numa edição existente, o parâmetro precisa migrar de
    // tabela: remove do hook antigo e cria novo no hook do escopo atual.
    if (editando && editando.escopo !== escopo) {
      await hookDoEscopo(editando.escopo).remove(editando.id)
      await hookDoEscopo(escopo).save({ ...paramSemEscopo, id: undefined })
    } else {
      await hookDoEscopo(escopo).save({ ...paramSemEscopo, id: editando?.id })
    }
    setSaving(false)
    setSlideOpen(false)
    setEditando(null)
  }

  async function handleRemove() {
    if (!editando) return
    if (!window.confirm('Remover este parâmetro?')) return
    await hookDoEscopo(editando.escopo).remove(editando.id)
    setSlideOpen(false)
    setEditando(null)
  }

  async function toggleAtivo(p, e) {
    e.stopPropagation()
    await hookDoEscopo(p.escopo).save({ ...p, ativo: !p.ativo })
  }

  const filtered = params.filter(p =>
    !search || (p.nome || '').toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'nome',
      label: 'Parâmetro',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{val}</div>
          {row.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{row.descricao}</div>}
        </div>
      ),
    },
    {
      key: 'escopo',
      label: 'Aplicação',
      render: val => (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: val === 'vendedores' ? '#EFF6FF' : '#F0FDF4',
          color: val === 'vendedores' ? '#1D4ED8' : '#15803D',
        }}>
          {val === 'vendedores' ? 'Vendedores' : 'Parceiros'}
        </span>
      ),
    },
    {
      key: 'origem',
      label: 'Origem',
      render: (val, row) => <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{origemLabel(row.escopo, val)}</span>,
    },
    {
      key: 'condicao',
      label: 'Condição',
      render: (val, row) => (
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
          {condicaoLabel(val)}
          {row.condicao !== 'exists' && ` ≥ ${row.valor_min}`}
          {row.janela_dias && ` · ${row.janela_dias}d`}
        </span>
      ),
    },
    {
      key: 'peso',
      label: 'Peso',
      render: val => (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
          {val}pts
        </span>
      ),
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (val, row) => (
        <button
          onClick={e => toggleAtivo(row, e)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 9px', borderRadius: 20, cursor: 'pointer', border: 'none',
            background: val ? '#D1FAE5' : '#F3F4F6',
            color: val ? '#065F46' : '#374151',
            fontSize: 11, fontWeight: 600,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: val ? '#10B981' : '#9CA3AF', display: 'inline-block' }} />
          {val ? 'Ativo' : 'Inativo'}
        </button>
      ),
    },
  ]

  const rowActions = [
    { label: 'Editar', onClick: (row) => openEdit(row) },
  ]

  if (slideOpen) {
    return (
      <FullPageEdit
        title={editando ? 'Editar parâmetro' : 'Novo parâmetro'}
        breadcrumb={[{ label: 'Maturidade de Parceiros', onClick: () => { setSlideOpen(false); setEditando(null) } }]}
        onCancel={() => { setSlideOpen(false); setEditando(null) }}
        onSave={handleSave}
        saving={saving}
        onDelete={editando ? handleRemove : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Aplicação *" span={2}>
            <select value={form.escopo} onChange={e => set('escopo', e.target.value)} style={inputS}>
              {ESCOPOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Nome *" error={errs.nome} span={2}>
            <input
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Contatos mapeados"
              style={inputS}
            />
          </FPEField>
          <FPEField label="Descrição" span={2}>
            <input
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Breve explicação do que este parâmetro avalia"
              style={inputS}
            />
          </FPEField>
        </FPESection>

        <FPESection title="Regra de avaliação">
          <FPEField label="Origem dos dados" span={2}>
            <select value={form.origem} onChange={e => set('origem', e.target.value)} style={inputS}>
              {origensDe(form.escopo).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FPEField>

          <FPEField label="Condição" span={2}>
            <select value={form.condicao} onChange={e => set('condicao', e.target.value)} style={inputS}>
              {CONDICOES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FPEField>

          {form.condicao !== 'exists' && (
            <FPEField label="Quantidade mínima (N)" error={errs.valor_min}>
              <input
                type="number" min={1}
                value={form.valor_min}
                onChange={e => set('valor_min', parseInt(e.target.value) || 1)}
                style={inputS}
              />
            </FPEField>
          )}

          {form.condicao === 'count_gte_days' && (
            <FPEField label="Janela de dias (X)">
              <input
                type="number" min={1}
                value={form.janela_dias || ''}
                onChange={e => set('janela_dias', parseInt(e.target.value) || null)}
                placeholder="Ex: 90"
                style={inputS}
              />
            </FPEField>
          )}
        </FPESection>

        <FPESection title="Peso e status">
          <FPEField label="Peso (pontos)" error={errs.peso}>
            <input
              type="number" min={1} max={100}
              value={form.peso}
              onChange={e => set('peso', parseInt(e.target.value) || 1)}
              style={inputS}
            />
          </FPEField>

          <FPEField label="Ativo">
            <select value={form.ativo ? 'sim' : 'nao'} onChange={e => set('ativo', e.target.value === 'sim')} style={inputS}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      modulo="maturidade_parceiros"
      title="Maturidade de Parceiros"
      description={`Configure os parâmetros que definem o score de maturidade de Parceiros e Vendedores.${totalPeso > 0 ? `  Peso total ativo: ${totalPeso}pts` : ''}`}
      columns={columns}
      data={filtered}
      keyField="id"
      loading={loading}
      onNew={openNew}
      newLabel="Novo parâmetro"
      rowActions={rowActions}
      onRowClick={openEdit}
      search={search}
      onSearchChange={setSearch}
      emptyLabel="Nenhum parâmetro configurado. Crie parâmetros para calcular a maturidade de Parceiros e Vendedores."
    />
  )
}

const inputS = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--surface-alt)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  boxSizing: 'border-box',
}
