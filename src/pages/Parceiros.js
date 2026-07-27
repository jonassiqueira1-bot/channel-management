import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useParceiros } from '../hooks/useParceiros'
import { useActions } from '../hooks/useActions'
import { usePartnerMaturity, usePartnerScores, usePartnerHabilitacoes } from '../hooks/usePartnerMaturity'
import { useHabilitacoes } from '../hooks/useHabilitacoes'
import { useSellers } from '../hooks/useSellers'
import { useCompanies } from '../hooks/useCompanies'
import { useOpportunities } from '../hooks/useOpportunities'
import { useProjects } from '../hooks/useProjects'
import { TIPOS_ACAO as TIPOS_ACAO_DEFAULT, STATUS_ACAO } from '../data/mockAcoes'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 75) return '#10B981'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

function scoreBg(pct) {
  if (pct >= 75) return '#D1FAE5'
  if (pct >= 40) return '#FEF3C7'
  return '#FEE2E2'
}

function scoreLabel(pct) {
  if (pct >= 75) return 'Maduro'
  if (pct >= 40) return 'Em desenvolvimento'
  return 'Iniciante'
}

function ScoreBar({ pct }) {
  if (pct === null || pct === undefined) {
    return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Não calculado</span>
  }
  const color = scoreColor(pct)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color }}>
          {pct}%
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
          background: scoreBg(pct), color,
        }}>
          {scoreLabel(pct)}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', width: 120 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 4, transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

function initials(nome) {
  return (nome || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function extractEstado(parceiro) {
  if (parceiro.estado) return parceiro.estado
  if (parceiro.uf) return parceiro.uf
  // extrai estado entre colchetes no nome, ex: "TOTVS SP - [SP]" → "SP"
  const match = (parceiro.nome || '').match(/\[([A-Z]{2})\]/)
  return match ? match[1] : '—'
}

function AvatarCell({ nome, sub }) {
  const ACCENT = 'var(--accent)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: `${ACCENT}18`, border: `1.5px solid ${ACCENT}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: ACCENT, fontFamily: 'var(--mono)', flexShrink: 0,
      }}>
        {initials(nome)}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{nome}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

const STORAGE_KEY_TIPOS = 'settings:tipos_acao_v2'
const EMPTY_ACAO = { titulo: '', tipo: 'treinamento', data_inicio: '', data_fim: '', descricao: '', status: 'agendado' }

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, dia] = d.slice(0, 10).split('-')
  return `${dia}/${m}/${y}`
}

// ─── Aba Visão Geral ──────────────────────────────────────────────────────────
function TabVisaoGeral({ parceiro, scoreData, params }) {
  const score_pct = scoreData?.score_pct ?? null
  const detalhes  = scoreData?.detalhes  ?? {}

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Estado',     value: extractEstado(parceiro) },
          { label: 'Status',     value: parceiro.situacao || parceiro.status || 'ativo' },
          { label: 'Maturidade', value: score_pct !== null ? `${score_pct}%` : '—', color: score_pct !== null ? scoreColor(score_pct) : undefined },
        ].map(k => (
          <div key={k.label} style={{
            flex: '1 1 80px', background: 'var(--surface-alt)',
            border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--mono)', color: k.color || 'var(--text)' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Score por parâmetro */}
      {params.filter(p => p.ativo).length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
            Score de Maturidade
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {params.filter(p => p.ativo).map(p => {
              const d = detalhes[p.id] || {}
              const ok = d.atingido
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: ok ? '#D1FAE511' : '#FEE2E211',
                  border: `1px solid ${ok ? '#10B98133' : '#EF444433'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, color: ok ? '#10B981' : '#EF4444' }}>{ok ? '✓' : '✗'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.nome}</div>
                      {p.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.descricao}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {d.valor !== undefined && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>{d.valor} reg.</span>
                    )}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: ok ? '#10B981' : '#9CA3AF' }}>
                      {ok ? `+${p.peso}` : `0/${p.peso}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba Ações ────────────────────────────────────────────────────────────────
function TabAcoes({ parceiro, acoes, onSaveAcao }) {
  const [tiposRaw] = useLocalState(STORAGE_KEY_TIPOS, [])
  const tiposMap = useMemo(() => {
    const base = { ...TIPOS_ACAO_DEFAULT }
    tiposRaw.forEach(t => { base[t.slug || t.id] = t })
    return base
  }, [tiposRaw])

  const acoesParceiro = useMemo(
    () => (acoes || []).filter(a => a.empresa_id === parceiro?.id).sort((a, b) => (b.data_inicio || '').localeCompare(a.data_inicio || '')),
    [acoes, parceiro?.id]
  )

  const [form, setForm] = useState({ ...EMPTY_ACAO })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [errs, setErrs] = useState({})

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); if (errs[k]) setErrs(e => ({ ...e, [k]: '' })) }

  async function handleSave() {
    const e = {}
    if (!form.titulo.trim()) e.titulo = 'Título obrigatório'
    if (!form.data_inicio) e.data_inicio = 'Data obrigatória'
    if (Object.keys(e).length) { setErrs(e); return }
    setSaving(true)
    await onSaveAcao({ ...form, empresa_id: parceiro.id, empresa_nome: parceiro.nome })
    setSaving(false)
    setForm({ ...EMPTY_ACAO })
    setShowForm(false)
    setErrs({})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Formulário de nova ação */}
      {showForm ? (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Nova Ação</div>
          <FormGrid cols={2}>
            <FormField label="Título *" style={{ gridColumn: 'span 2' }}>
              <input className="so-field" value={form.titulo} onChange={e => set('titulo', e.target.value)}
                placeholder="Ex: Treinamento de vendas" style={{ borderColor: errs.titulo ? 'var(--red)' : undefined }} />
              {errs.titulo && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errs.titulo}</div>}
            </FormField>
            <FormField label="Tipo">
              <select className="so-field" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {Object.entries(tiposMap).filter(([,v]) => v.uso !== 'tarefa').map(([k, v]) => (
                  <option key={k} value={k}>{v.icon || ''} {v.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_ACAO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
            <FormField label="Data início *">
              <input className="so-field" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)}
                style={{ borderColor: errs.data_inicio ? 'var(--red)' : undefined }} />
              {errs.data_inicio && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{errs.data_inicio}</div>}
            </FormField>
            <FormField label="Data fim">
              <input className="so-field" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
            </FormField>
            <FormField label="Descrição" style={{ gridColumn: 'span 2' }}>
              <textarea className="so-field" value={form.descricao} onChange={e => set('descricao', e.target.value)}
                rows={2} placeholder="Detalhes da ação..." style={{ resize: 'vertical' }} />
            </FormField>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...EMPTY_ACAO }); setErrs({}) }}>Cancelar</Button>
            <Button size="sm" loading={saving} onClick={handleSave}>Salvar ação</Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <Button size="sm" onClick={() => setShowForm(true)}>+ Nova ação</Button>
        </div>
      )}

      {/* Lista de ações */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {acoesParceiro.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma ação registrada para este parceiro.
          </div>
        ) : acoesParceiro.map(a => {
          const tipoCfg = tiposMap[a.tipo] || { icon: '◎', color: '#6B7280', bg: '#F3F4F6', label: a.tipo }
          const stsCfg  = STATUS_ACAO[a.status] || { label: a.status, color: '#9CA3AF', bg: '#F3F4F6', text: '#374151' }
          return (
            <div key={a.id} style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--surface-alt)', border: '1px solid var(--border2)',
              borderLeft: `4px solid ${tipoCfg.color || '#6B7280'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.titulo}</div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: stsCfg.bg, color: stsCfg.text, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {stsCfg.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {tipoCfg.icon} {tipoCfg.label} · {fmtDate(a.data_inicio)}{a.data_fim && a.data_fim !== a.data_inicio ? ` → ${fmtDate(a.data_fim)}` : ''}
              </div>
              {a.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{a.descricao}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Aba Histórico de Score ───────────────────────────────────────────────────
function TabHistorico({ history, params }) {
  if (history.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 32, textAlign: 'center' }}>
        Nenhum score calculado ainda.<br />Clique em "↻ Calcular scores" na tela de Parceiros.
      </div>
    )
  }

  const maxScore = Math.max(...history.map(h => h.score_pct), 1)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Gráfico de barras */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Evolução do Score
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100, padding: '0 4px' }}>
          {history.slice(-20).map((h, i) => {
            const pct = h.score_pct
            const barH = Math.max(8, Math.round((pct / 100) * 100))
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <div title={`${fmtDate(h.calculado_em)}: ${pct}%`} style={{
                  width: '100%', height: barH, background: scoreColor(pct),
                  borderRadius: '3px 3px 0 0', transition: 'height 0.3s',
                }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--mono)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 32, overflow: 'hidden' }}>
                  {fmtDate(h.calculado_em).slice(0, 5)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Linha do tempo */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Linha do Tempo
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...history].reverse().map((h, i) => {
            const prev = history[history.length - 2 - i]
            const delta = prev != null ? Math.round(h.score_pct - prev.score_pct) : null
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--surface-alt)', border: '1px solid var(--border2)',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: scoreBg(h.score_pct),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, fontFamily: 'var(--mono)', color: scoreColor(h.score_pct),
                }}>
                  {Math.round(h.score_pct)}%
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{scoreLabel(h.score_pct)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(h.calculado_em)}</div>
                </div>
                {delta !== null && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    color: delta > 0 ? '#10B981' : delta < 0 ? '#EF4444' : '#9CA3AF',
                  }}>
                    {delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '—'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── SlideOver principal ──────────────────────────────────────────────────────
// ─── Aba Habilitações ─────────────────────────────────────────────────────────
function TabHabilitacoes({ parceiro_id }) {
  const { habilitacoes }                         = useHabilitacoes()
  const { linkedIds, link, unlink, loading }     = usePartnerHabilitacoes(parceiro_id)
  const [search, setSearch]                      = useState('')

  const filtered = (habilitacoes || []).filter(h =>
    !search || (h.nome || '').toLowerCase().includes(search.toLowerCase())
  )

  const linked   = filtered.filter(h => linkedIds.has(String(h.id)))
  const unlinked = filtered.filter(h => !linkedIds.has(String(h.id)))

  function Section({ title, items, isLinked }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(h => (
            <div key={h.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', borderRadius: 8,
              background: isLinked ? '#D1FAE511' : 'var(--surface-alt)',
              border: `1px solid ${isLinked ? '#10B98133' : 'var(--border2)'}`,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{h.nome}</div>
                {h.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{h.descricao}</div>}
              </div>
              <button
                onClick={() => isLinked ? unlink(h.id) : link(h.id)}
                style={{
                  flexShrink: 0, marginLeft: 12,
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: isLinked ? '#FEE2E2' : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                  color: isLinked ? '#DC2626' : 'var(--accent)',
                  transition: 'opacity 0.15s',
                }}
              >
                {isLinked ? 'Remover' : 'Vincular'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Busca */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <input
          className="so-field"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar habilitação..."
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Carregando...
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <Section title={`Vinculadas (${linked.length})`} items={linked} isLinked={true} />
          <Section title={`Disponíveis (${unlinked.length})`} items={unlinked} isLinked={false} />
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {search ? 'Nenhuma habilitação encontrada.' : 'Nenhuma habilitação cadastrada em Configurações.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ label }) {
  if (!label) return null
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function EmptyTab({ text }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
      {text}
    </div>
  )
}

// ─── Aba Contatos (editável) ───────────────────────────────────────────────────
function TabContatos({ parceiro_id }) {
  const { sellers, loading, save } = useSellers()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', role: 'seller' })
  const [saving, setSaving] = useState(false)

  const contatos = (sellers || []).filter(s => s.franquia_id === parceiro_id)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    await save({ ...form, franquia_id: parceiro_id })
    setSaving(false)
    setForm({ nome: '', email: '', telefone: '', role: 'seller' })
    setShowForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {showForm ? (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Novo Contato</div>
          <FormGrid cols={2}>
            <FormField label="Nome *" style={{ gridColumn: 'span 2' }}>
              <input className="so-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do contato" />
            </FormField>
            <FormField label="E-mail">
              <input className="so-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com" />
            </FormField>
            <FormField label="Telefone">
              <input className="so-field" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </FormField>
            <FormField label="Cargo / Papel" style={{ gridColumn: 'span 2' }}>
              <select className="so-field" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="seller">Vendedor</option>
                <option value="franchise_manager">Gestor de Franquia</option>
                <option value="pre_sales">Pré-vendas</option>
                <option value="project_manager">Gerente de Projetos</option>
              </select>
            </FormField>
          </FormGrid>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" loading={saving} onClick={handleSave}>Salvar contato</Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <Button size="sm" onClick={() => setShowForm(true)}>+ Novo contato</Button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <EmptyTab text="Carregando..." />
        ) : contatos.length === 0 ? (
          <EmptyTab text="Nenhum contato vinculado a este parceiro." />
        ) : contatos.map(c => (
          <div key={c.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.nome}</div>
              <StatusPill label={c.status} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {c.role} {c.email ? `· ${c.email}` : ''} {c.telefone ? `· ${c.telefone}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Aba Empresas (somente visualização) ───────────────────────────────────────
function TabEmpresas({ parceiro_id }) {
  const { companies, loading } = useCompanies()
  const vinculadas = (companies || []).filter(c => c.franquia_ar_id === parceiro_id)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {loading ? (
        <EmptyTab text="Carregando..." />
      ) : vinculadas.length === 0 ? (
        <EmptyTab text="Nenhuma empresa vinculada a este parceiro." />
      ) : vinculadas.map(c => (
        <div key={c.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.razao || c.nome_fantasia}</div>
            <StatusPill label={c.status} />
          </div>
          {c.cnpj && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.cnpj}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Aba Oportunidades (somente visualização) ──────────────────────────────────
function TabOportunidades({ parceiro_id }) {
  const { companies }      = useCompanies()
  const { opps, loading }  = useOpportunities()

  const empresaIds = new Set((companies || []).filter(c => c.franquia_ar_id === parceiro_id).map(c => c.id))
  const lista = (opps || []).filter(o => empresaIds.has(o.empresa_id))

  function fmtMoeda(v) {
    if (v == null) return '—'
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {loading ? (
        <EmptyTab text="Carregando..." />
      ) : lista.length === 0 ? (
        <EmptyTab text="Nenhuma oportunidade vinculada a este parceiro." />
      ) : lista.map(o => (
        <div key={o.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{o.titulo}</div>
            <StatusPill label={o.situacao} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {fmtMoeda(o.valor_total ?? o.valor)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Aba Projetos (somente visualização) ───────────────────────────────────────
function TabProjetos({ parceiro_id }) {
  const { companies }        = useCompanies()
  const { projetos, loading } = useProjects()

  const empresaIds = new Set((companies || []).filter(c => c.franquia_ar_id === parceiro_id).map(c => c.id))
  const lista = (projetos || []).filter(p => empresaIds.has(p.company_id))

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {loading ? (
        <EmptyTab text="Carregando..." />
      ) : lista.length === 0 ? (
        <EmptyTab text="Nenhum projeto vinculado a este parceiro." />
      ) : lista.map(p => (
        <div key={p.id} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.produto_nome || p.nome || 'Projeto'}</div>
            <StatusPill label={p.status || p.phase} />
          </div>
          {p.company_nome && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{p.company_nome}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── SlideOver principal ──────────────────────────────────────────────────────
function ParceirSlideOver({ open, parceiro, scoreData, params, history, acoes, onSaveAcao, onClose }) {
  const [tab, setTab] = useState('visao')

  useEffect(() => { if (open) setTab('visao') }, [open])

  const acoesParceiro = (acoes || []).filter(a => a.empresa_id === parceiro?.id)
  const { linkedIds } = usePartnerHabilitacoes(parceiro?.id || null)

  if (!parceiro) return null

  const TABS = [
    { key: 'visao',          label: 'Visão Geral' },
    { key: 'acoes',          label: 'Ações',          badge: acoesParceiro.length || undefined },
    { key: 'contatos',       label: 'Contatos' },
    { key: 'oportunidades',  label: 'Oportunidades' },
    { key: 'projetos',       label: 'Projetos' },
    { key: 'empresas',       label: 'Empresas' },
    { key: 'habilitacoes',   label: 'Habilitações',   badge: linkedIds.size || undefined },
    { key: 'historico',      label: 'Histórico',      badge: history.length || undefined },
  ]

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={parceiro.nome}
      subtitle={parceiro.segmento || parceiro.tipo || extractEstado(parceiro)}
      defaultWidth="50vw"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'visao'         && <TabVisaoGeral    parceiro={parceiro} scoreData={scoreData} params={params} />}
      {tab === 'acoes'         && <TabAcoes         parceiro={parceiro} acoes={acoes} onSaveAcao={onSaveAcao} />}
      {tab === 'contatos'      && <TabContatos      parceiro_id={parceiro.id} />}
      {tab === 'oportunidades' && <TabOportunidades parceiro_id={parceiro.id} />}
      {tab === 'projetos'      && <TabProjetos      parceiro_id={parceiro.id} />}
      {tab === 'empresas'      && <TabEmpresas      parceiro_id={parceiro.id} />}
      {tab === 'habilitacoes'  && <TabHabilitacoes  parceiro_id={parceiro.id} />}
      {tab === 'historico'     && <TabHistorico     history={history} params={params} />}
    </SlideOver>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Parceiros() {
  const { parceiros, loading: loadingP } = useParceiros()
  const { acoes, save: saveAcao }        = useActions()
  const { params, loading: loadingParams } = usePartnerMaturity()
  const { scores, calculating, calculate, getHistory } = usePartnerScores(parceiros, params)

  const [selected, setSelected]     = useState(null)
  const [slideOpen, setSlideOpen]   = useState(false)
  const [history, setHistory]       = useState([])
  const [search, setSearch]         = useLocalState('browse:parceiros:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:parceiros:filters', {})

  async function openParceiro(p) {
    setSelected(p)
    setSlideOpen(true)
    const h = await getHistory(p.id)
    setHistory(h)
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = (data) => {
    const scoreList      = data.map(p => p.score_pct ?? null).filter(s => s !== null)
    const mediaScore     = scoreList.length ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length) : null
    const baixasMaturidade = scoreList.filter(s => s < 50).length
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {[
          { label: 'Total de Parceiros', value: data.length, color: 'var(--accent)' },
          { label: 'Maturidade Média',   value: mediaScore !== null ? `${mediaScore}%` : '—', color: mediaScore !== null ? scoreColor(mediaScore) : 'var(--text-muted)' },
          { label: 'Score < 50%',        value: baixasMaturidade, color: baixasMaturidade > 0 ? '#EF4444' : '#10B981' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 10, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: 'var(--shadow)', borderTop: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          loading={calculating}
          onClick={calculate}
          style={{ marginBottom: 2 }}
        >
          {calculating ? 'Calculando…' : '↻ Calcular scores'}
        </Button>
      </div>
    )
  }

  // ── Enriquecer e filtrar parceiros ────────────────────────────────────────
  const parceirosComScore = useMemo(() => {
    return parceiros
      .map(p => ({
        ...p,
        score_pct: scores[p.id]?.score_pct ?? null,
      }))
      .filter(p => {
        // activeFilters vem do BrowseLayout como arrays por chave: { situacao: ['ativo'], ... }
        const srArr = activeFilters.score_range || []
        if (srArr.length > 0) {
          const s = p.score_pct
          const pass = srArr.some(sr => {
            if (sr === 'sem_score') return s === null
            if (sr === 'critico')   return s !== null && s < 40
            if (sr === 'medio')     return s !== null && s >= 40 && s < 75
            if (sr === 'maduro')    return s !== null && s >= 75
            return false
          })
          if (!pass) return false
        }
        // busca simples
        if (search) {
          const q = search.toLowerCase()
          const match = (p.nome || '').toLowerCase().includes(q) ||
                        (p.estado || p.uf || '').toLowerCase().includes(q) ||
                        (p.segmento || p.tipo || '').toLowerCase().includes(q)
          if (!match) return false
        }
        // filtro de estado (array)
        const estadoArr = activeFilters.estado || []
        if (estadoArr.length > 0 && !estadoArr.includes(extractEstado(p))) return false
        // filtro de situacao (array)
        const situacaoArr = activeFilters.situacao || []
        if (situacaoArr.length > 0) {
          const s = p.situacao || p.status || 'ativo'
          if (!situacaoArr.includes(s)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.score_pct === null && b.score_pct === null) return 0
        if (a.score_pct === null) return 1
        if (b.score_pct === null) return -1
        return a.score_pct - b.score_pct
      })
  }, [parceiros, scores, activeFilters, search])

  // ── columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'nome',
      label: 'Parceiro',
      render: (val, row) => <AvatarCell nome={val} sub={row.segmento || row.tipo || ''} />,
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (val, row) => (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-soft)' }}>
          {extractEstado(row)}
        </span>
      ),
    },
    {
      key: 'situacao',
      label: 'Status',
      render: (val, row) => {
        const s = val || row.status || 'ativo'
        const ok = s === 'ativo'
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 9px', borderRadius: 20,
            background: ok ? '#D1FAE5' : '#F3F4F6',
            color: ok ? '#065F46' : '#374151',
            fontSize: 11, fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#10B981' : '#9CA3AF', display: 'inline-block' }} />
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        )
      },
    },
    {
      key: 'score_pct',
      label: 'Maturidade',
      render: (val) => <ScoreBar pct={val} />,
    },
  ]

  // ── filters ───────────────────────────────────────────────────────────────
  const estados = [...new Set(parceiros.map(p => extractEstado(p)).filter(e => e !== '—'))].sort()

  const filters = [
    {
      key: 'situacao',
      label: 'Status',
      options: [
        { value: 'ativo',    label: 'Ativo'    },
        { value: 'inativo',  label: 'Inativo'  },
        { value: 'suspenso', label: 'Suspenso' },
      ],
    },
    {
      key: 'estado',
      label: 'Estado',
      options: estados.map(e => ({ value: e, label: e })),
    },
    {
      key: 'score_range',
      label: 'Maturidade',
      options: [
        { value: 'critico',   label: '< 40% — Iniciante'           },
        { value: 'medio',     label: '40–74% — Em desenvolvimento'  },
        { value: 'maduro',    label: '≥ 75% — Maduro'              },
        { value: 'sem_score', label: 'Não calculado'               },
      ],
    },
  ]

  return (
    <>
      <BrowseLayout
        modulo="parceiros"
        storageKey="parceiros"
        kpis={kpis}
        kpisLabel="Visão Geral"
        columns={columns}
        data={parceirosComScore}
        keyField="id"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        onRowClick={openParceiro}
        emptyState={
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Nenhum parceiro encontrado</div>
            <div style={{ fontSize: 13 }}>Cadastre parceiros em Configurações → Parceiros.</div>
          </div>
        }
      />

      <ParceirSlideOver
        open={slideOpen}
        parceiro={selected}
        scoreData={selected ? scores[selected.id] : null}
        params={params}
        history={history}
        acoes={acoes}
        onSaveAcao={saveAcao}
        onClose={() => { setSlideOpen(false); setSelected(null) }}
      />
    </>
  )
}
