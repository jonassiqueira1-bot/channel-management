import { useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'

// ─── Mock seeds ───────────────────────────────────────────────────────────────
const SEEDS = [
  { id: 1, nome: 'Franquia Norte',      situacao: 'ativo' },
  { id: 2, nome: 'Franquia Sul',        situacao: 'ativo' },
  { id: 3, nome: 'Franquia Nordeste',   situacao: 'ativo' },
  { id: 4, nome: 'Franquia Centro-Oeste', situacao: 'inativo' },
]

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

// ─── Badge ────────────────────────────────────────────────────────────────────
function SituacaoBadge({ situacao }) {
  const ativo = situacao === 'ativo'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
      background: ativo ? '#D1FAE5' : '#F1F5F9',
      color:      ativo ? '#065F46' : '#475569',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ativo ? '#10B981' : '#9A9590' }} />
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function FranquiaModal({ initial, onClose, onSave, onDelete, existentes }) {
  const [nome, setNome]         = useState(initial?.nome || '')
  const [situacao, setSituacao] = useState(initial?.situacao || 'ativo')
  const [confirmDel, setConfirmDel] = useState(false)

  const nomeErr = nome.trim().length === 0
    ? null
    : existentes.some(f => f.id !== initial?.id && f.nome.trim().toLowerCase() === nome.trim().toLowerCase())
      ? 'Já existe uma franquia com este nome'
      : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim() || nomeErr) return
    onSave({ ...(initial || {}), nome: nome.trim(), situacao })
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>{initial ? 'Editar franquia' : 'Nova franquia'}</div>
            <div style={s.subtitle}>Campos obrigatórios marcados com *</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={s.body}>

            {/* Nome */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Nome da Franquia <span style={{ color: 'var(--red)' }}>*</span></label>
              <input
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Franquia Norte"
                style={{ ...s.input, ...(nomeErr ? { border: '1px solid var(--red)' } : {}) }}
              />
              {nomeErr && <span style={s.err}>{nomeErr}</span>}
            </div>

            {/* Situação — toggle visual */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Situação</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { value: 'ativo',   label: 'Ativa',   color: '#10B981', bg: '#ECFDF5', border: '#10B981' },
                  { value: 'inativo', label: 'Inativa', color: '#9A9590', bg: '#F1F5F9', border: '#CBD5E1' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSituacao(opt.value)}
                    style={{
                      flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      border: situacao === opt.value ? `2px solid ${opt.border}` : '2px solid var(--border)',
                      background: situacao === opt.value ? opt.bg : 'var(--surface)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: situacao === opt.value ? opt.color : 'var(--text-muted)',
                    }}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* franquia_id hint */}
            {initial && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>
                franquia_id: <span style={{ color: 'var(--accent)' }}>{initial.id}</span>
                <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>— usado como FK em empresas.franquia_id</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={s.footer}>
            {initial ? (
              confirmDel ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>Confirmar exclusão?</span>
                  <button type="button" style={{ ...s.btn, color: 'var(--red)', borderColor: 'rgba(220,38,38,0.3)' }}
                    onClick={() => onDelete(initial.id)}>Excluir</button>
                  <button type="button" style={s.btn} onClick={() => setConfirmDel(false)}>Cancelar</button>
                </div>
              ) : (
                <button type="button"
                  style={{ ...s.btn, color: 'var(--red)', borderColor: 'rgba(220,38,38,0.2)' }}
                  onClick={() => setConfirmDel(true)}>
                  Excluir franquia
                </button>
              )
            ) : <div />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={s.btn} onClick={onClose}>Cancelar</button>
              <button type="submit"
                disabled={!nome.trim() || !!nomeErr}
                style={{ ...s.btnPrimary, opacity: (!nome.trim() || !!nomeErr) ? 0.5 : 1, cursor: (!nome.trim() || !!nomeErr) ? 'not-allowed' : 'pointer' }}>
                {initial ? 'Salvar alterações' : 'Criar franquia'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Franquias() {
  const [franquias, setFranquias] = useLocalState('settings:franquias_v1', SEEDS)
  const [modal, setModal]         = useState(null) // null | 'new' | franquia obj
  const [search, setSearch]       = useState('')

  const filtered = franquias.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase())
  )
  const totalAtivas   = franquias.filter(f => f.situacao === 'ativo').length
  const totalInativas = franquias.filter(f => f.situacao === 'inativo').length

  function handleSave(data) {
    if (data.id && franquias.some(f => f.id === data.id)) {
      setFranquias(prev => prev.map(f => f.id === data.id ? { ...f, ...data } : f))
    } else {
      setFranquias(prev => [...prev, { ...data, id: uid() }])
    }
    setModal(null)
  }

  function handleDelete(id) {
    setFranquias(prev => prev.filter(f => f.id !== id))
    setModal(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Page header */}
      <div style={pg.header}>
        <div>
          <h2 style={pg.title}>Franquias</h2>
          <p style={pg.desc}>
            Gerencie as franquias disponíveis. Cada franquia pode ser vinculada a empresas via{' '}
            <code style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '1px 5px', borderRadius: 4 }}>franquia_id</code>.
          </p>
        </div>
        <button style={pg.btnNew} onClick={() => setModal('new')}>+ Nova franquia</button>
      </div>

      {/* KPI strip */}
      <div style={pg.kpis}>
        <div style={pg.kpi}>
          <span style={pg.kpiVal}>{franquias.length}</span>
          <span style={pg.kpiLbl}>Total</span>
        </div>
        <div style={{ ...pg.kpi, borderTopColor: '#10B981' }}>
          <span style={pg.kpiVal}>{totalAtivas}</span>
          <span style={pg.kpiLbl}>Ativas</span>
        </div>
        <div style={pg.kpi}>
          <span style={{ ...pg.kpiVal, color: 'var(--text-muted)' }}>{totalInativas}</span>
          <span style={pg.kpiLbl}>Inativas</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={pg.toolbar}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 10, fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar franquia…"
            style={pg.searchInput}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>
          {filtered.length} {filtered.length === 1 ? 'franquia' : 'franquias'}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
        {filtered.length === 0 ? (
          <div style={pg.empty}>
            <span style={{ fontSize: 28, opacity: 0.18 }}>⬡</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {search ? 'Nenhuma franquia encontrada.' : 'Nenhuma franquia cadastrada ainda.'}
            </span>
            {!search && (
              <button onClick={() => setModal('new')} style={{ ...pg.btnNew, marginTop: 4 }}>+ Nova franquia</button>
            )}
          </div>
        ) : (
          <table style={pg.table}>
            <thead>
              <tr>
                <th style={pg.th}>Nome</th>
                <th style={pg.th}>Situação</th>
                <th style={{ ...pg.th, width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onClick={() => setModal(f)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={pg.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={pg.avatar}>{f.nome.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{f.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                          id: {f.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={pg.td}><SituacaoBadge situacao={f.situacao} /></td>
                  <td style={{ ...pg.td, textAlign: 'right' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setModal(f) }}
                      style={pg.btnEdit}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <FranquiaModal
          initial={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          existentes={franquias}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ACCENT = '#6366F1'

const pg = {
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '28px 32px 16px', borderBottom: '1px solid var(--border)' },
  title:     { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.3px' },
  desc:      { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' },
  btnNew:    { background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 },
  kpis:      { display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' },
  kpi:       { flex: 1, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12, borderRight: '1px solid var(--border)', borderTop: '3px solid var(--border)' },
  kpiVal:    { fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 },
  kpiLbl:    { fontSize: 12, color: 'var(--text-muted)' },
  toolbar:   { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px', borderBottom: '1px solid var(--border)' },
  searchInput: { paddingLeft: 32, paddingRight: 12, height: 34, fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', width: 260, outline: 'none' },
  table:     { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th:        { padding: '8px 12px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' },
  td:        { padding: '12px 12px', fontSize: 13, verticalAlign: 'middle' },
  avatar:    { width: 34, height: 34, borderRadius: 9, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--mono)', flexShrink: 0, border: '1px solid rgba(99,102,241,0.18)' },
  empty:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 220, background: 'var(--surface2)', borderRadius: 12, border: '1px dashed var(--border2)', marginTop: 16 },
  btnEdit:   { fontSize: 11.5, fontWeight: 600, color: ACCENT, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font)' },
}

const s = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, backdropFilter: 'blur(2px)' },
  modal:     { background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  title:     { fontSize: 15, fontWeight: 800, color: 'var(--text)' },
  subtitle:  { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  closeBtn:  { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 },
  body:      { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 },
  fieldGroup:{ display: 'flex', flexDirection: 'column', gap: 6 },
  label:     { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' },
  input:     { padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  err:       { fontSize: 11, color: 'var(--red)', marginTop: 2 },
  footer:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 },
  btn:       { fontSize: 13, color: 'var(--text-soft)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary:{ fontSize: 13, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 8, padding: '7px 18px', fontFamily: 'var(--font)', transition: 'opacity 0.15s' },
}
