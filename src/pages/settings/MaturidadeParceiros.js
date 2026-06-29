import { useState, useMemo } from 'react'
import { usePartnerMaturity, ORIGENS, CONDICOES } from '../../hooks/usePartnerMaturity'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import Button from '../../components/Button'

const EMPTY_PARAM = {
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

function ParamBadge({ ativo }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 20,
      background: ativo ? '#D1FAE5' : '#F3F4F6',
      color: ativo ? '#065F46' : '#374151',
      fontSize: 11, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ativo ? '#10B981' : '#9CA3AF', display: 'inline-block' }} />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function origemLabel(v) {
  return ORIGENS.find(o => o.value === v)?.label || v
}

function condicaoLabel(v) {
  return CONDICOES.find(c => c.value === v)?.label || v
}

export default function MaturidadeParceiros() {
  const { params, loading, save, remove } = usePartnerMaturity()

  const [editando, setEditando]   = useState(null)
  const [slideOpen, setSlideOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [errs, setErrs]           = useState({})
  const [form, setForm]           = useState({ ...EMPTY_PARAM })

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
    setForm(f => ({ ...f, [k]: v }))
    if (errs[k]) setErrs(e => ({ ...e, [k]: '' }))
  }

  async function handleSave() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.peso < 1) e.peso = 'Peso mínimo é 1'
    if (Object.keys(e).length) { setErrs(e); return }
    setSaving(true)
    const row = { ...form, id: editando?.id }
    const res = await save(row)
    setSaving(false)
    if (res.ok) { setSlideOpen(false); setEditando(null) }
  }

  async function handleRemove() {
    if (!editando) return
    if (!window.confirm('Remover este parâmetro?')) return
    await remove(editando.id)
    setSlideOpen(false)
    setEditando(null)
  }

  async function toggleAtivo(p) {
    await save({ ...p, ativo: !p.ativo })
  }

  const needsDays = form.condicao === 'count_gte_days'
  const needsMin  = form.condicao !== 'exists'

  return (
    <SettingsLayout>
      <div style={{ maxWidth: 720 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              Maturidade de Parceiros
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Configure os parâmetros que definem o score de maturidade de cada parceiro.
              {totalPeso > 0 && (
                <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                  Peso total ativo: {totalPeso}
                </span>
              )}
            </p>
          </div>
          <Button size="sm" onClick={openNew}>+ Novo parâmetro</Button>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</div>
        ) : params.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            border: '2px dashed var(--border2)', borderRadius: 12, color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Nenhum parâmetro configurado</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Crie parâmetros para calcular a maturidade dos seus parceiros.
            </div>
            <Button size="sm" onClick={openNew}>+ Criar primeiro parâmetro</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {params.map((p, i) => (
              <div key={p.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border2)',
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: p.ativo ? 1 : 0.6,
                borderLeft: `4px solid ${p.ativo ? 'var(--accent)' : 'var(--border2)'}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--surface-alt)', border: '1px solid var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.nome}</span>
                    <ParamBadge ativo={p.ativo} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {origemLabel(p.origem)} · {condicaoLabel(p.condicao)}
                    {p.condicao !== 'exists' && ` ≥ ${p.valor_min}`}
                    {p.janela_dias && ` · últimos ${p.janela_dias} dias`}
                  </div>
                  {p.descricao && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.descricao}</div>
                  )}
                </div>

                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                  color: p.ativo ? 'var(--accent)' : 'var(--text-muted)',
                  minWidth: 36, textAlign: 'right',
                }}>
                  {p.peso}pts
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="xs" variant="ghost" onClick={() => toggleAtivo(p)}>
                    {p.ativo ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FullPageEdit de criação/edição */}
      {slideOpen && (
        <FullPageEdit
          title={editando ? 'Editar parâmetro' : 'Novo parâmetro'}
          onClose={() => { setSlideOpen(false); setEditando(null) }}
          onSave={handleSave}
          saving={saving}
          onDelete={editando ? handleRemove : null}
        >
          <FPESection title="Identificação">
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
                {ORIGENS.map(o => (
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

            {needsMin && (
              <FPEField label="Quantidade mínima (N)" error={errs.valor_min}>
                <input
                  type="number" min={1}
                  value={form.valor_min}
                  onChange={e => set('valor_min', parseInt(e.target.value) || 1)}
                  style={inputS}
                />
              </FPEField>
            )}

            {needsDays && (
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
      )}
    </SettingsLayout>
  )
}

const inputS = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--surface-alt)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  boxSizing: 'border-box',
}
