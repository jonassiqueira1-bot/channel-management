import { useState } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

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

function TipoBadge({ label, icon, bg, text, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: bg, color: text, border: `1px solid ${color}44`, fontFamily: 'var(--mono)',
    }}>
      {icon} {label}
    </span>
  )
}

export const STORAGE_KEY = 'settings:tipos_acao_v1'

export default function SettingsTiposAcao() {
  const [tipos, setTipos] = useLocalState(STORAGE_KEY, DEFAULTS)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')

  function abrirNovo() {
    const p = PALETTE[0]
    setForm({ label: '', icon: '🎓', color: p.color, bg: p.bg, text: p.text })
    setEditando('novo')
  }

  function abrirEdicao(tipo) {
    setForm({ ...tipo })
    setEditando(tipo)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function escolherPaleta(p) { setForm(f => ({ ...f, color: p.color, bg: p.bg, text: p.text })) }

  function handleSave() {
    if (!form.label.trim()) return
    if (editando !== 'novo') {
      setTipos(prev => prev.map(t => t.id === editando.id ? { ...form, id: editando.id, slug: editando.slug } : t))
    } else {
      setTipos(prev => [...prev, { ...form, id: uid(), slug: slugify(form.label) }])
    }
    setEditando(null)
  }

  function handleDelete(id) {
    setTipos(prev => prev.filter(t => t.id !== id))
    setEditando(null)
  }

  if (editando) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Tipos de Ações', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Novo Tipo de Ação' : `Editar: ${editando.label}`}
        subtitle="Categorias usadas no cadastro de ações comerciais"
        onSave={handleSave}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Prévia">
            <TipoBadge label={form.label || 'Prévia'} icon={form.icon} bg={form.bg} text={form.text} color={form.color} />
          </FPEField>
          <FPEField label="Nome" required>
            <input className="fpe-field" value={form.label} maxLength={40}
              placeholder="Ex: Workshop, Webinar…"
              onChange={e => set('label', e.target.value)} />
          </FPEField>
        </FPESection>

        <FPESection title="Aparência">
          <FPEField label="Ícone">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => set('icon', ic)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, cursor: 'pointer', fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${ic === form.icon ? form.color : 'var(--border)'}`,
                    background: ic === form.icon ? form.bg : 'var(--surface2)',
                  }}>
                  {ic}
                </button>
              ))}
            </div>
          </FPEField>
          <FPEField label="Cor">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {PALETTE.map(p => (
                <button key={p.color} type="button" onClick={() => escolherPaleta(p)} title={p.label}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: p.color, cursor: 'pointer',
                    border: `3px solid ${p.color === form.color ? p.color : 'transparent'}`,
                    outline: p.color === form.color ? `2px solid ${p.color}44` : 'none',
                    outlineOffset: 2,
                  }} />
              ))}
            </div>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Tipos de Ações"
      description="Categorias usadas no cadastro de ações comerciais do canal."
      columns={[
        { key: 'label', label: 'Tipo', render: (v, row) => <TipoBadge label={row.label} icon={row.icon} bg={row.bg} text={row.text} color={row.color} /> },
        { key: 'slug',  label: 'Slug', muted: true, priority: 2 },
      ]}
      data={tipos.filter(t => !busca || t.label.toLowerCase().includes(busca.toLowerCase()))}
      keyField="id"
      emptyLabel="Nenhum tipo cadastrado."
      onNew={abrirNovo}
      newLabel="+ Novo tipo"
      rowActions={[
        { label: 'Editar',  onClick: abrirEdicao },
        { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
      ]}
      search={busca}
      onSearchChange={setBusca}
    />
  )
}
