import { useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'

// ─── Defaults (espelha mockAcoes.js TIPOS_ACAO) ───────────────────────────────
const DEFAULTS = [
  { id: 1, label: 'Treinamento',  icon: '🎓', color: '#6366F1', bg: '#EDE9FE', text: '#4338CA', slug: 'treinamento' },
  { id: 2, label: 'Evento',       icon: '📅', color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8', slug: 'evento' },
  { id: 3, label: 'Capacitação',  icon: '🚀', color: '#10B981', bg: '#D1FAE5', text: '#065F46', slug: 'capacitacao' },
  { id: 4, label: 'Outros',       icon: '◎',  color: '#6B7280', bg: '#F3F4F6', text: '#374151', slug: 'outros' },
]

const PALETTE = [
  { color: '#6366F1', bg: '#EDE9FE', text: '#4338CA', label: 'Violeta' },
  { color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8', label: 'Azul' },
  { color: '#10B981', bg: '#D1FAE5', text: '#065F46', label: 'Verde' },
  { color: '#F59E0B', bg: '#FEF3C7', text: '#B45309', label: 'Âmbar' },
  { color: '#EF4444', bg: '#FEE2E2', text: '#991B1B', label: 'Vermelho' },
  { color: '#EC4899', bg: '#FCE7F3', text: '#9D174D', label: 'Rosa' },
  { color: '#8B5CF6', bg: '#EDE9FE', text: '#5B21B6', label: 'Roxo' },
  { color: '#6B7280', bg: '#F3F4F6', text: '#374151', label: 'Cinza' },
]

const ICONS = ['🎓','📅','🚀','◎','⭐','🔔','📋','💡','🎯','🏆','🤝','📊','🛠️','🧩','📌','✅']

function uid() { return Date.now() + Math.floor(Math.random() * 9999) }

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

// ─── Modal de criação / edição ────────────────────────────────────────────────
function TipoModal({ tipo, onSave, onClose }) {
  const editando = !!tipo
  const [form, setForm] = useState(tipo || {
    label: '', icon: '🎓',
    color: PALETTE[0].color, bg: PALETTE[0].bg, text: PALETTE[0].text,
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function escolherPaleta(p) { setForm(f => ({ ...f, color: p.color, bg: p.bg, text: p.text })) }

  function salvar() {
    if (!form.label.trim()) return
    const slug = editando ? tipo.slug : slugify(form.label)
    onSave({ ...form, label: form.label.trim(), slug })
  }

  const preview = { label: form.label || 'Prévia', icon: form.icon, bg: form.bg, text: form.text, color: form.color }

  return (
    <div style={ov} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dlg}>
        <div style={dlgH}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {editando ? 'Editar tipo de ação' : 'Novo tipo de ação'}
          </h2>
          <button style={xBtn} onClick={onClose}>✕</button>
        </div>

        <div style={dlgB}>
          {/* Preview */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Prévia
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: preview.bg, color: preview.text,
              border: `1px solid ${preview.color}44`, fontFamily: 'var(--mono)',
            }}>
              {preview.icon} {preview.label}
            </span>
          </div>

          {/* Nome */}
          <div style={fGrp}>
            <label style={lbl}>Nome *</label>
            <input style={inp} value={form.label} maxLength={40}
              placeholder="Ex: Workshop, Webinar…"
              onChange={e => set('label', e.target.value)} />
          </div>

          {/* Ícone */}
          <div style={fGrp}>
            <label style={lbl}>Ícone</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => set('icon', ic)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: `2px solid ${ic === form.icon ? form.color : 'var(--border)'}`,
                    background: ic === form.icon ? form.bg : 'var(--surface2)',
                    cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s',
                  }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div style={fGrp}>
            <label style={lbl}>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETTE.map(p => (
                <button key={p.color} type="button" onClick={() => escolherPaleta(p)}
                  title={p.label}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', border: `3px solid ${p.color === form.color ? p.color : 'transparent'}`,
                    background: p.color, cursor: 'pointer', outline: p.color === form.color ? `2px solid ${p.color}44` : 'none',
                    outlineOffset: 2, transition: 'all 0.1s',
                  }} />
              ))}
            </div>
          </div>
        </div>

        <div style={dlgF}>
          <button style={secBtn} onClick={onClose}>Cancelar</button>
          <button style={{ ...primBtn, opacity: form.label.trim() ? 1 : 0.5 }} onClick={salvar}>
            {editando ? 'Salvar alterações' : 'Criar tipo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export const STORAGE_KEY = 'settings:tipos_acao_v1'

export default function SettingsTiposAcao() {
  const [tipos, setTipos] = useLocalState(STORAGE_KEY, DEFAULTS)
  const [modal, setModal] = useState(null)   // null | 'novo' | {tipo}
  const [confirmar, setConfirmar] = useState(null)

  function salvar(dados) {
    if (dados.id) {
      setTipos(prev => prev.map(t => t.id === dados.id ? dados : t))
    } else {
      setTipos(prev => [...prev, { ...dados, id: uid() }])
    }
    setModal(null)
  }

  function deletar(id) {
    setTipos(prev => prev.filter(t => t.id !== id))
    setConfirmar(null)
  }

  return (
    <div style={pg}>
      <div style={hdr}>
        <div>
          <h1 style={h1}>Tipos de Ações</h1>
          <p style={desc}>Categorias usadas no cadastro de ações comerciais do canal.</p>
        </div>
        <button style={primBtn} onClick={() => setModal('novo')}>+ Novo tipo</button>
      </div>

      <div style={grid}>
        {tipos.map(t => (
          <div key={t.id} style={{ ...card, borderTop: `3px solid ${t.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: t.bg,
                border: `1px solid ${t.color}44`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>
                {t.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{t.slug}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <button style={editBtn} onClick={() => setModal(t)}>Editar</button>
              {!['treinamento','evento','capacitacao','outros'].includes(t.slug) && (
                <button style={delBtn} onClick={() => setConfirmar(t)}>Excluir</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <TipoModal
          tipo={modal === 'novo' ? null : modal}
          onSave={salvar}
          onClose={() => setModal(null)} />
      )}

      {confirmar && (
        <div style={ov} onMouseDown={e => { if (e.target === e.currentTarget) setConfirmar(null) }}>
          <div style={{ ...dlg, maxWidth: 380 }}>
            <div style={dlgH}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Excluir tipo</h2>
              <button style={xBtn} onClick={() => setConfirmar(null)}>✕</button>
            </div>
            <div style={{ padding: '16px 24px', color: 'var(--text-soft)', fontSize: 14 }}>
              Tem certeza que deseja excluir <strong>{confirmar.label}</strong>?
              Ações já cadastradas com esse tipo não serão afetadas.
            </div>
            <div style={dlgF}>
              <button style={secBtn} onClick={() => setConfirmar(null)}>Cancelar</button>
              <button style={{ ...primBtn, background: 'var(--red)' }} onClick={() => deletar(confirmar.id)}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const pg   = { padding: '28px 32px', maxWidth: 900 }
const hdr  = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }
const h1   = { margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text)' }
const desc = { margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }
const card = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
  padding: 16, display: 'flex', flexDirection: 'column', gap: 0,
}

const primBtn = {
  padding: '8px 18px', background: '#6366F1', color: '#fff', border: 'none',
  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
}
const secBtn = {
  padding: '8px 18px', background: 'var(--surface2)', color: 'var(--text-soft)', border: '1px solid var(--border)',
  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
}
const editBtn = {
  flex: 1, padding: '5px 0', background: 'var(--surface2)', color: 'var(--text-soft)',
  border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  fontFamily: 'var(--font)', fontWeight: 500,
}
const delBtn = {
  padding: '5px 10px', background: 'none', color: 'var(--red)', border: '1px solid var(--red)33',
  borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500,
}

const ov  = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const dlg = {
  background: 'var(--surface)', borderRadius: 12, width: '90%', maxWidth: 460,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
}
const dlgH = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '18px 24px 14px', borderBottom: '1px solid var(--border)',
}
const dlgB = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', maxHeight: '65vh' }
const dlgF = {
  padding: '14px 24px', borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'flex-end', gap: 8,
}
const xBtn = {
  background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16,
  cursor: 'pointer', padding: '4px 6px', borderRadius: 6,
}
const fGrp = { display: 'flex', flexDirection: 'column', gap: 6 }
const lbl  = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const inp  = {
  padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)', fontSize: 13,
  fontFamily: 'var(--font)', outline: 'none',
}
