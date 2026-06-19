import { useState, useCallback } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import SettingsLayout from '../../components/ui/SettingsLayout'

/* ─── Constants ─────────────────────────────────────────── */

const OBJETIVOS = [
  'Atração de Leads',
  'Upgrade de Módulo',
  'Sazonal',
  'Fidelização',
  'Lançamento de Produto',
  'Reativação',
]

const STATUS_OPTIONS = [
  { value: 'draft',  label: 'Rascunho', color: '#94A3B8', bg: '#F1F5F9' },
  { value: 'active', label: 'Ativa',    color: '#10B981', bg: '#ECFDF5' },
  { value: 'paused', label: 'Pausada',  color: '#F59E0B', bg: '#FFFBEB' },
]

const EMPTY_FORM = {
  name: '',
  objective: '',
  description: '',
  materials: [''],
  pontua_metas: false,
  start_date: '',
  end_date: '',
  status: 'draft',
}

const STEPS = [
  { label: 'Identificação',       desc: 'Nome, objetivo e descrição' },
  { label: 'Materiais e Regras',  desc: 'Links e configurações' },
  { label: 'Período e Ativação',  desc: 'Datas e status inicial' },
]

function uid() { return Math.random().toString(36).slice(2, 10) }

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/* ─── Status badge ───────────────────────────────────────── */
function StatusBadge({ value }) {
  const opt = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0]
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: opt.bg, color: opt.color, whiteSpace: 'nowrap',
    }}>
      {opt.label}
    </span>
  )
}

/* ─── Progress bar ───────────────────────────────────────── */
function WizardProgress({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '24px 32px 0', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
      {STEPS.map((s, i) => {
        const done    = i < step
        const current = i === step
        const last    = i === STEPS.length - 1
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: last ? 0 : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
                background: done ? ACCENT : current ? ACCENT : 'var(--surface3)',
                color: done || current ? '#fff' : 'var(--text-muted)',
                border: current ? `2px solid ${ACCENT}` : done ? `2px solid ${ACCENT}` : '2px solid var(--border2)',
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: current ? ACCENT : done ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 1 }}>{s.desc}</div>
              </div>
            </div>
            {!last && (
              <div style={{
                flex: 1, height: 2, marginTop: 13, marginLeft: 8, marginRight: 8,
                background: done ? ACCENT : 'var(--border2)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step 1 — Identificação ─────────────────────────────── */
function Step1({ form, onChange, errors }) {
  return (
    <div style={wz.body}>
      <div style={wz.fieldGroup}>
        <Label text="Nome da Campanha" required />
        <input
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="Ex: Campanha de Verão 2026"
          style={{ ...wz.input, ...(errors.name ? { border: '1px solid var(--red)' } : {}) }}
        />
        {errors.name && <span style={wz.err}>{errors.name}</span>}
      </div>

      <div style={wz.fieldGroup}>
        <Label text="Objetivo" required />
        <select
          value={form.objective}
          onChange={e => onChange('objective', e.target.value)}
          style={{ ...wz.input, ...(errors.objective ? { border: '1px solid var(--red)' } : {}) }}
        >
          <option value="">Selecione o objetivo...</option>
          {OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {errors.objective && <span style={wz.err}>{errors.objective}</span>}
      </div>

      <div style={wz.fieldGroup}>
        <Label text="Descrição" />
        <textarea
          value={form.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Descreva brevemente o objetivo desta campanha para os canais parceiros..."
          rows={4}
          style={{ ...wz.input, resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.6 }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.description.length} / 500 caracteres</span>
      </div>
    </div>
  )
}

/* ─── Step 2 — Materiais e Regras ────────────────────────── */
function Step2({ form, onChange }) {
  function addMaterial() { onChange('materials', [...form.materials, '']) }
  function updateMaterial(i, v) {
    const next = [...form.materials]
    next[i] = v
    onChange('materials', next)
  }
  function removeMaterial(i) {
    onChange('materials', form.materials.filter((_, idx) => idx !== i))
  }

  return (
    <div style={wz.body}>
      <div style={wz.fieldGroup}>
        <Label text="Links de Materiais de Apoio" />
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Adicione URLs de arquivos, pastas compartilhadas ou assets da campanha (PDFs, artes, apresentações).
        </p>
        {form.materials.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={m}
              onChange={e => updateMaterial(i, e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ ...wz.input, flex: 1, marginBottom: 0 }}
            />
            {form.materials.length > 1 && (
              <button type="button" onClick={() => removeMaterial(i)} style={wz.btnRemove}>✕</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addMaterial} style={wz.btnAdd}>+ Adicionar link</button>
      </div>

      <div style={{ ...wz.fieldGroup, marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pontuação Especial nas Metas</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Ativar para que ações desta campanha pontuem de forma diferenciada no ranking de metas.
            </div>
          </div>
          <Toggle value={form.pontua_metas} onChange={v => onChange('pontua_metas', v)} />
        </div>
      </div>
    </div>
  )
}

/* ─── Step 3 — Período e Ativação ────────────────────────── */
function Step3({ form, onChange, errors }) {
  return (
    <div style={wz.body}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={wz.fieldGroup}>
          <Label text="Data de Início" required />
          <input
            type="date"
            value={form.start_date}
            onChange={e => onChange('start_date', e.target.value)}
            style={{ ...wz.input, ...(errors.start_date ? { border: '1px solid var(--red)' } : {}) }}
          />
          {errors.start_date && <span style={wz.err}>{errors.start_date}</span>}
        </div>
        <div style={wz.fieldGroup}>
          <Label text="Data de Término" />
          <input
            type="date"
            value={form.end_date}
            onChange={e => onChange('end_date', e.target.value)}
            min={form.start_date || undefined}
            style={wz.input}
          />
        </div>
      </div>

      <div style={{ ...wz.fieldGroup, marginTop: 24 }}>
        <Label text="Status Inicial" />
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('status', opt.value)}
              style={{
                flex: 1, padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                border: form.status === opt.value ? `2px solid ${opt.color}` : '2px solid var(--border)',
                background: form.status === opt.value ? opt.bg : 'var(--surface)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: form.status === opt.value ? opt.color : 'var(--text-muted)' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                {opt.value === 'draft'  && 'Salvar sem publicar ainda'}
                {opt.value === 'active' && 'Publicar imediatamente'}
                {opt.value === 'paused' && 'Criar já pausada'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Toggle ─────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: value ? ACCENT : 'var(--border2)', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

/* ─── Label ──────────────────────────────────────────────── */
function Label({ text, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
      {text}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
    </label>
  )
}

/* ─── Wizard modal ───────────────────────────────────────── */
function CampanhaWizard({ initial, onClose, onSave }) {
  const [step, setStep]   = useState(0)
  const [form, setForm]   = useState(initial || { ...EMPTY_FORM })
  const [errors, setErrs] = useState({})

  const update = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), [])

  function validate() {
    const e = {}
    if (step === 0) {
      if (!form.name.trim())     e.name      = 'Informe o nome da campanha'
      if (!form.objective)       e.objective  = 'Selecione um objetivo'
    }
    if (step === 2) {
      if (!form.start_date)      e.start_date = 'Informe a data de início'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate()) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
    setErrs({})
  }
  function back() { setStep(s => Math.max(s - 1, 0)); setErrs({}) }

  function handleSave(status) {
    if (!validate()) return
    onSave({ ...form, status, id: form.id || uid() })
  }

  const isLast = step === STEPS.length - 1

  return (
    <div style={wz.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={wz.modal}>

        {/* Header */}
        <div style={wz.header}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
              {initial ? 'Editar Campanha' : 'Nova Campanha'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Passo {step + 1} de {STEPS.length} — {STEPS[step].label}
            </div>
          </div>
          <button onClick={onClose} style={wz.closeBtn}>✕</button>
        </div>

        {/* Progress */}
        <WizardProgress step={step} />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {step === 0 && <Step1 form={form} onChange={update} errors={errors} />}
          {step === 1 && <Step2 form={form} onChange={update} />}
          {step === 2 && <Step3 form={form} onChange={update} errors={errors} />}
        </div>

        {/* Footer */}
        <div style={wz.footer}>
          <button type="button" onClick={() => handleSave('draft')} style={wz.btnDraft}>
            Salvar como Rascunho
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button type="button" onClick={back} style={wz.btnBack}>← Voltar</button>
            )}
            {!isLast ? (
              <button type="button" onClick={next} style={wz.btnPrimary}>Próximo →</button>
            ) : (
              <button type="button" onClick={() => handleSave(form.status)} style={{ ...wz.btnPrimary, background: '#10B981' }}>
                ✓ Publicar Campanha
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
const SEEDS = [
  {
    id: 'c1', name: 'Campanha de Verão 2026', objective: 'Sazonal',
    description: 'Incentivo especial para captação de novos leads no período de verão.',
    start_date: '2026-01-01', end_date: '2026-02-28', status: 'active',
    materials: ['https://drive.google.com/arts-verao'], pontua_metas: true,
  },
  {
    id: 'c2', name: 'Upgrade Pro Q1', objective: 'Upgrade de Módulo',
    description: 'Campanha para conversão de clientes Basic para plano Pro.',
    start_date: '2026-03-01', end_date: '2026-03-31', status: 'draft',
    materials: [''], pontua_metas: false,
  },
]

export default function Campanhas() {
  const [campanhas, setCampanhas] = useLocalState('settings:campanhas_v1', SEEDS)
  const [wizard, setWizard]       = useState(null) // null | 'new' | campaign obj
  const [search, setSearch]       = useState('')

  function handleSave(c) {
    setCampanhas(prev => {
      const exists = prev.find(x => x.id === c.id)
      return exists ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev]
    })
    setWizard(null)
  }

  function handleDelete(id) {
    setCampanhas(prev => prev.filter(c => c.id !== id))
  }

  const filtered = campanhas.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.objective.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <SettingsLayout
        title="Campanhas de Incentivo"
        description="Crie e gerencie campanhas para motivar e engajar seus canais parceiros."
        columns={[
          {
            key: 'name',
            label: 'Campanha',
            render: (v, row) => (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div>
                {row.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.description}
                  </div>
                )}
              </div>
            ),
          },
          { key: 'objective', label: 'Objetivo', priority: 2 },
          {
            key: 'start_date',
            label: 'Período',
            priority: 3,
            render: (v, row) => (
              <span style={{ fontFamily: 'var(--mono)', whiteSpace: 'nowrap', fontSize: 12 }}>
                {fmtDate(v)}{row.end_date ? ` → ${fmtDate(row.end_date)}` : ''}
              </span>
            ),
          },
          { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
          {
            key: 'pontua_metas',
            label: 'Metas',
            priority: 2,
            render: (v) => (
              <span style={{ fontSize: 11, color: v ? '#10B981' : 'var(--border2)', fontWeight: 700 }}>
                {v ? '✓ Sim' : '—'}
              </span>
            ),
          },
        ]}
        data={filtered}
        onNew={() => setWizard('new')}
        newLabel="+ Nova Campanha"
        rowActions={[
          { label: 'Editar', onClick: row => setWizard(row) },
          { label: 'Excluir', danger: true, onClick: row => handleDelete(row.id) },
        ]}
        emptyLabel="Nenhuma campanha cadastrada ainda."
        search={search}
        onSearchChange={setSearch}
      />

      {wizard && (
        <CampanhaWizard
          initial={wizard === 'new' ? null : wizard}
          onClose={() => setWizard(null)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

/* ─── Styles ─────────────────────────────────────────────── */

const ACCENT = 'var(--accent)'

const pg = {
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '28px 32px 16px', borderBottom: '1px solid var(--border)',
  },
  title: { fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.3px' },
  desc:  { fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' },
  btnNew: {
    background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
  },
  search: {
    padding: '7px 12px', fontSize: 12.5, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text)', fontFamily: 'var(--font)', width: 240,
    outline: 'none',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: { padding: '8px 12px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 12px', fontSize: 12.5, verticalAlign: 'middle' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 240, background: 'var(--surface2)', borderRadius: 12, border: '1px dashed var(--border2)', marginTop: 16 },
  btnAction: { fontSize: 11.5, fontWeight: 600, color: ACCENT, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font)' },
}

const wz = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 500, backdropFilter: 'blur(2px)',
  },
  modal: {
    background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 640,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
  },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 },
  body:     { padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column' },
  input: {
    padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  err:      { fontSize: 11, color: 'var(--red)', marginTop: 4 },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', borderTop: '1px solid var(--border)',
    background: 'var(--surface2)', flexShrink: 0,
  },
  btnDraft:   { fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnBack:    { fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)',  background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary: { fontSize: 13, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnAdd:     { fontSize: 12, fontWeight: 600, color: ACCENT, background: 'none', border: `1px dashed ${ACCENT}55`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 4 },
  btnRemove:  { fontSize: 13, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', flexShrink: 0 },
}
