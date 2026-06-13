import { useState, useMemo } from 'react'
import {
  MOCK_PLAYBOOKS, MOCK_FUNNEL_STEPS, MOCK_REFERENCES, MOCK_RESOURCES,
  PB_STORAGE_KEY, PB_STEPS_STORAGE_KEY, PB_REFS_STORAGE_KEY, PB_RESOURCES_STORAGE_KEY,
  STAGE_CFG, RESOURCE_CFG, SEGMENT_OPTIONS, REGION_OPTIONS,
} from '../data/mockPlaybooks'
import { MOCK_FUNIS } from '../data/mockFunis'
import { MOCK_PRODUTOS } from '../data/mockProdutos'
import { useLocalState } from '../hooks/useLocalState'

const USE_PROFILE = 'isv' // 'isv' | 'franquia'

// ─── Markdown renderer ────────────────────────────────────────────────────────
function ri(text, bk = 0) {
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g
  const parts = []; let last = 0, m, k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`${bk}-t${k++}`}>{text.slice(last, m.index)}</span>)
    if (m[1] !== undefined) parts.push(<strong key={`${bk}-b${k++}`}>{m[1]}</strong>)
    else if (m[2] !== undefined) parts.push(<em key={`${bk}-i${k++}`}>{m[2]}</em>)
    else if (m[3] !== undefined) parts.push(<code key={`${bk}-c${k++}`} style={{ fontFamily: 'var(--mono)', fontSize: '0.88em', background: 'var(--surface2)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border)' }}>{m[3]}</code>)
    last = re.lastIndex
  }
  if (last < text.length) parts.push(<span key={`${bk}-e`}>{text.slice(last)}</span>)
  return parts
}

function parseTableRows(rows) {
  const cells = rows.map(r => r.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1))
  return { head: cells[0] || [], body: cells.filter((_, i) => i !== 1).slice(1) }
}

function MarkdownRenderer({ content }) {
  const lines = (content || '').split('\n')
  const blocks = []; let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if      (line.startsWith('### ')) { blocks.push({ type: 'h3', text: line.slice(4) }); i++ }
    else if (line.startsWith('## '))  { blocks.push({ type: 'h2', text: line.slice(3) }); i++ }
    else if (line.startsWith('# '))   { blocks.push({ type: 'h1', text: line.slice(2) }); i++ }
    else if (line.startsWith('> ')) {
      const items = []
      while (i < lines.length && lines[i].startsWith('> ')) { items.push(lines[i].slice(2)); i++ }
      blocks.push({ type: 'bq', items })
    } else if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
      const items = []
      while (i < lines.length && (lines[i].startsWith('- [ ]') || lines[i].startsWith('- [x]'))) {
        items.push({ done: lines[i].startsWith('- [x]'), text: lines[i].slice(6) }); i++
      }
      blocks.push({ type: 'checklist', items })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) { items.push(lines[i].slice(2)); i++ }
      blocks.push({ type: 'ul', items })
    } else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++ }
      blocks.push({ type: 'table', rows })
    } else if (line === '---') { blocks.push({ type: 'hr' }); i++ }
    else if (line.trim() === '') { i++ }
    else { blocks.push({ type: 'p', text: line }); i++ }
  }

  return (
    <div style={md.root}>
      {blocks.map((b, bi) => {
        if (b.type === 'h1') return <h1 key={bi} style={md.h1}>{ri(b.text, bi)}</h1>
        if (b.type === 'h2') return <h2 key={bi} style={md.h2}>{ri(b.text, bi)}</h2>
        if (b.type === 'h3') return <h3 key={bi} style={md.h3}>{ri(b.text, bi)}</h3>
        if (b.type === 'p')  return <p  key={bi} style={md.p}>{ri(b.text, bi)}</p>
        if (b.type === 'bq') return (
          <div key={bi} style={md.bq}>
            {b.items.map((it, ii) => <p key={ii} style={{ margin: ii ? '8px 0 0' : 0, lineHeight: 1.65 }}>{ri(it, `${bi}-${ii}`)}</p>)}
          </div>
        )
        if (b.type === 'ul') return (
          <ul key={bi} style={md.ul}>
            {b.items.map((it, ii) => <li key={ii} style={md.li}>{ri(it, `${bi}-${ii}`)}</li>)}
          </ul>
        )
        if (b.type === 'checklist') return (
          <ul key={bi} style={{ ...md.ul, listStyle: 'none', paddingLeft: 4 }}>
            {b.items.map((it, ii) => (
              <li key={ii} style={{ ...md.li, display: 'flex', gap: 8, paddingLeft: 0 }}>
                <span style={{ color: it.done ? '#10B981' : 'var(--border)', flexShrink: 0, marginTop: 2 }}>{it.done ? '☑' : '☐'}</span>
                <span style={{ textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.55 : 1 }}>{ri(it.text, `${bi}-${ii}`)}</span>
              </li>
            ))}
          </ul>
        )
        if (b.type === 'hr') return <hr key={bi} style={md.hr} />
        if (b.type === 'table') {
          const { head, body } = parseTableRows(b.rows)
          return (
            <div key={bi} style={{ overflowX: 'auto', margin: '20px 0' }}>
              <table style={md.table}>
                <thead><tr>{head.map((c, ci) => <th key={ci} style={md.th}>{ri(c, `${bi}-h${ci}`)}</th>)}</tr></thead>
                <tbody>{body.map((row, ri2) => (
                  <tr key={ri2}>{row.map((c, ci) => (
                    <td key={ci} style={{ ...md.td, background: ri2 % 2 === 1 ? 'var(--surface2)' : 'transparent' }}>{ri(c, `${bi}-r${ri2}c${ci}`)}</td>
                  ))}</tr>
                ))}</tbody>
              </table>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, saveLabel = 'Salvar', valid = true, children }) {
  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.box}>
        <div style={m.header}>
          <span style={m.title}>{title}</span>
          <button onClick={onClose} style={m.close}>✕</button>
        </div>
        <div style={m.body}>{children}</div>
        <div style={m.footer}>
          <button onClick={onClose} style={m.cancelBtn}>Cancelar</button>
          <button onClick={onSave} style={{ ...m.saveBtn, opacity: valid ? 1 : 0.45, pointerEvents: valid ? 'auto' : 'none' }}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={m.lbl}>{label}</div>
      {children}
    </div>
  )
}

// ─── New / Edit Playbook modal ────────────────────────────────────────────────
const EMPTY_PB = { title: '', segment: 'SaaS / ISV', description: '', funil_id: '', produto_id: '' }

function PlaybookModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { funil_id: '', produto_id: '', ...initial } : EMPTY_PB)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal title={initial?.id ? 'Editar Playbook' : 'Novo Playbook'} onClose={onClose}
      onSave={() => onSave(form)} valid={form.title.trim().length > 0}>
      <Field label="Título">
        <input value={form.title} onChange={e => set('title', e.target.value)}
          style={m.inp} placeholder="Ex: Canal NG Pro — Vendas para SaaS/ISV" />
      </Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="Segmento">
            <select value={form.segment} onChange={e => set('segment', e.target.value)} style={m.inp}>
              {SEGMENT_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Funil (opcional)">
            <select value={form.funil_id} onChange={e => set('funil_id', e.target.value)} style={m.inp}>
              <option value="">— Nenhum —</option>
              {MOCK_FUNIS.map(f => <option key={f.id} value={String(f.id)}>{f.nome}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <Field label="Produto (opcional)">
        <select value={form.produto_id} onChange={e => set('produto_id', e.target.value)} style={m.inp}>
          <option value="">— Nenhum —</option>
          {MOCK_PRODUTOS.map(p => <option key={p.id} value={String(p.id)}>{p.nome}</option>)}
        </select>
      </Field>
      <Field label="Descrição">
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} style={{ ...m.inp, resize: 'vertical' }} />
      </Field>
    </Modal>
  )
}

// ─── Step modal ───────────────────────────────────────────────────────────────
const EMPTY_STEP = { stage: 'prospeccao', title: '', content: '' }

function StepModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_STEP)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <Modal title={initial?.id ? 'Editar etapa' : 'Adicionar etapa'} onClose={onClose}
      onSave={() => onSave(form)} valid={form.title.trim().length > 0}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Etapa">
          <select value={form.stage} onChange={e => set('stage', e.target.value)} style={m.inp}>
            {Object.entries(STAGE_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </Field>
        <div style={{ flex: 1 }}>
          <Field label="Título">
            <input value={form.title} onChange={e => set('title', e.target.value)} style={m.inp} placeholder="Ex: Identificando o Parceiro Ideal" />
          </Field>
        </div>
      </div>
      <Field label="Conteúdo (Markdown)">
        <textarea value={form.content} onChange={e => set('content', e.target.value)}
          rows={12} style={{ ...m.inp, fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', lineHeight: 1.6 }}
          placeholder={'## Título da seção\n\nConteúdo em Markdown...'} />
      </Field>
    </Modal>
  )
}

// ─── Reference modal ──────────────────────────────────────────────────────────
const EMPTY_REF = { company_name: '', logo_initials: '', logo_color: '#6366F1', region: 'Sudeste', summary: '', is_public: true, results: [{ label: '', value: '' }] }

function ReferenceModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_REF)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setResult = (i, k, v) => setForm(f => { const r = [...f.results]; r[i] = { ...r[i], [k]: v }; return { ...f, results: r } })
  return (
    <Modal title={initial?.id ? 'Editar cliente de referência' : 'Novo cliente de referência'} onClose={onClose}
      onSave={() => onSave(form)} valid={form.company_name.trim().length > 0}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="Empresa"><input value={form.company_name} onChange={e => set('company_name', e.target.value)} style={m.inp} placeholder="Ex: FinCorp Sistemas" /></Field>
        </div>
        <div style={{ width: 90 }}>
          <Field label="Sigla"><input value={form.logo_initials} onChange={e => set('logo_initials', e.target.value)} style={m.inp} maxLength={3} placeholder="FC" /></Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="Região">
            <select value={form.region} onChange={e => set('region', e.target.value)} style={m.inp}>
              {REGION_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 2 }}>
          <Field label="Resumo (1 linha)"><input value={form.summary} onChange={e => set('summary', e.target.value)} style={m.inp} placeholder="Ex: MRR cresceu 38% em 4 meses." /></Field>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={m.lbl}>Resultados</span>
          <button onClick={() => setForm(f => ({ ...f, results: [...f.results, { label: '', value: '' }] }))}
            style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Adicionar</button>
        </div>
        {form.results.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input value={r.label} onChange={e => setResult(i, 'label', e.target.value)} style={{ ...m.inp, flex: 1 }} placeholder="Rótulo" />
            <input value={r.value} onChange={e => setResult(i, 'value', e.target.value)} style={{ ...m.inp, flex: 1 }} placeholder="Valor" />
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} />
        <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Visível para franquias</span>
      </label>
    </Modal>
  )
}

// ─── Resource modal ───────────────────────────────────────────────────────────
const EMPTY_RES = { title: '', description: '', type: 'link', url: '', file_size: '', tags: [] }

function ResourceModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_RES)
  const [tagInput, setTagInput] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }
  return (
    <Modal title={initial?.id ? 'Editar material' : 'Novo material'} onClose={onClose}
      onSave={() => onSave(form)} valid={form.title.trim().length > 0 && form.url.trim().length > 0}>
      <Field label="Título"><input value={form.title} onChange={e => set('title', e.target.value)} style={m.inp} placeholder="Ex: Deck Institucional 2026" /></Field>
      <Field label="Descrição"><input value={form.description} onChange={e => set('description', e.target.value)} style={m.inp} placeholder="Breve descrição do material" /></Field>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 140 }}>
          <Field label="Tipo">
            <select value={form.type} onChange={e => set('type', e.target.value)} style={m.inp}>
              {Object.entries(RESOURCE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="URL / Link"><input value={form.url} onChange={e => set('url', e.target.value)} style={m.inp} placeholder="https://..." /></Field>
        </div>
      </div>
      <Field label={`Tags (Enter para adicionar)`}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface2)', padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {form.tags.map((t, i) => (
            <span key={i} style={{ background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: 10, padding: '1px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              {t}
              <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
            placeholder={form.tags.length === 0 ? 'ex: institucional, proposta' : ''}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: 'var(--font)', color: 'var(--text)', minWidth: 80, flex: 1 }} />
        </div>
      </Field>
    </Modal>
  )
}

// ─── Detail: Funnel Steps Panel ───────────────────────────────────────────────
function FunnelStepsPanel({ steps, isISV, onAddStep, onEditStep, onDeleteStep }) {
  const [open, setOpen] = useState(new Set(['prospeccao']))
  const toggle = k => setOpen(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })

  const byStage = useMemo(() => {
    const map = {}
    Object.keys(STAGE_CFG).forEach(k => { map[k] = steps.filter(s => s.stage === k) })
    return map
  }, [steps])

  return (
    <div style={dp.panel}>
      <div style={dp.panelHeader}>
        <h2 style={dp.panelTitle}>Atividades por Etapa</h2>
        <p style={dp.panelSub}>Roteiros, scripts e critérios estruturados por fase do funil.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(STAGE_CFG).map(([key, cfg]) => {
          const stageSteps = byStage[key] || []
          const isOpen = open.has(key)
          return (
            <div key={key} style={{ border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
              {/* Accordion header */}
              <button onClick={() => toggle(key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: isOpen ? 'var(--accent-glow)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', transition: 'background 0.15s' }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isOpen ? 'var(--accent)' : 'var(--text)', letterSpacing: '-0.2px' }}>{cfg.label}</div>
                  {stageSteps.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{stageSteps[0].title}</div>
                  )}
                </div>
                {stageSteps.length === 0 && isISV && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '2px 8px' }}>Sem conteúdo</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: 13, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>›</span>
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border2)' }}>
                  {stageSteps.length === 0 ? (
                    <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>{cfg.icon}</div>
                      <div style={{ fontSize: 13, marginBottom: 12 }}>Nenhuma atividade definida para {cfg.label}</div>
                      {isISV && (
                        <button onClick={() => onAddStep(key)} style={dp.addBtn}>+ Adicionar conteúdo</button>
                      )}
                    </div>
                  ) : (
                    stageSteps.map(step => (
                      <div key={step.id} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border2)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' }}>{step.title}</h3>
                          {isISV && (
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={() => onEditStep(step)} style={dp.editBtn}>✎ Editar</button>
                              <button onClick={() => onDeleteStep(step.id)} style={dp.deleteBtn}>✕</button>
                            </div>
                          )}
                        </div>
                        <MarkdownRenderer content={step.content} />
                      </div>
                    ))
                  )}
                  {stageSteps.length > 0 && isISV && (
                    <div style={{ padding: '10px 20px' }}>
                      <button onClick={() => onAddStep(key)} style={dp.ghostAddBtn}>+ Adicionar outra atividade</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Detail: References Panel ─────────────────────────────────────────────────
function ReferencesPanel({ refs, isISV, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return refs.filter(r => r.company_name.toLowerCase().includes(q) || (r.region || '').toLowerCase().includes(q) || (r.summary || '').toLowerCase().includes(q))
  }, [refs, search])

  return (
    <div style={dp.panel}>
      <div style={dp.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={dp.panelTitle}>Clientes de Referência</h2>
            <p style={dp.panelSub}>{refs.length} caso{refs.length !== 1 ? 's' : ''} de sucesso associado{refs.length !== 1 ? 's' : ''} a este playbook.</p>
          </div>
          {isISV && <button onClick={onAdd} style={dp.primaryBtn}>+ Adicionar</button>}
        </div>
        {refs.length > 0 && (
          <div style={{ position: 'relative', marginTop: 14 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa ou região…"
              style={{ ...dp.searchInput, paddingLeft: 30 }} />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={dp.empty}>
          <div style={dp.emptyIcon}>🏆</div>
          <div style={dp.emptyTitle}>{refs.length === 0 ? 'Nenhum caso cadastrado ainda' : 'Nenhum resultado encontrado'}</div>
          {refs.length === 0 && isISV && <button onClick={onAdd} style={dp.addBtn}>+ Adicionar primeiro caso</button>}
        </div>
      ) : (
        <div style={dp.refList}>
          {filtered.map(ref => (
            <div key={ref.id} style={dp.refCard}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: ref.logo_color + '22', color: ref.logo_color, border: `1px solid ${ref.logo_color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, fontFamily: 'var(--mono)', letterSpacing: '-0.5px' }}>
                  {ref.logo_initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{ref.company_name}</span>
                    <span style={dp.regionPill}>{ref.region}</span>
                    {!ref.is_public && isISV && <span style={{ fontSize: 10, color: '#9CA3AF' }} title="Apenas ISV">🔒</span>}
                  </div>
                  {ref.summary && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{ref.summary}</p>}
                  {ref.results?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {ref.results.filter(r => r.label).map((r, i) => (
                        <div key={i} style={dp.resultKpi}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>{r.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{r.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isISV && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => onEdit(ref)} style={dp.editBtn}>✎</button>
                    <button onClick={() => onDelete(ref.id)} style={dp.deleteBtn}>✕</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail: Resources Panel ──────────────────────────────────────────────────
function ResourcesPanel({ resources, isISV, onAdd, onEdit, onDelete }) {
  const [copied, setCopied] = useState(null)
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return resources.filter(r => r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q)))
  }, [resources, search])

  function copyLink(id) { setCopied(id); setTimeout(() => setCopied(null), 1800) }

  return (
    <div style={dp.panel}>
      <div style={dp.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={dp.panelTitle}>Materiais e Apoio</h2>
            <p style={dp.panelSub}>{resources.length} material(is) disponível(is) neste playbook.</p>
          </div>
          {isISV && <button onClick={onAdd} style={dp.primaryBtn}>+ Adicionar</button>}
        </div>
        {resources.length > 0 && (
          <div style={{ position: 'relative', marginTop: 14 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar materiais…"
              style={{ ...dp.searchInput, paddingLeft: 30 }} />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={dp.empty}>
          <div style={dp.emptyIcon}>📂</div>
          <div style={dp.emptyTitle}>{resources.length === 0 ? 'Nenhum material cadastrado ainda' : 'Nenhum resultado encontrado'}</div>
          {resources.length === 0 && isISV && <button onClick={onAdd} style={dp.addBtn}>+ Adicionar primeiro material</button>}
        </div>
      ) : (
        <div style={dp.resGrid}>
          {filtered.map(res => {
            const cfg = RESOURCE_CFG[res.type] || RESOURCE_CFG.outro
            return (
              <div key={res.id} style={dp.resCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cfg.icon}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10 }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35, marginBottom: 4 }}>{res.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>{res.description}</div>
                {res.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {res.tags.map(t => <span key={t} style={dp.tag}>{t}</span>)}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border2)' }}>
                  {res.file_size && res.file_size !== '—' && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 'auto' }}>{res.file_size}</span>}
                  {isISV && (
                    <>
                      <button onClick={() => onEdit(res)} style={dp.resBtn}>✎</button>
                      <button onClick={() => onDelete(res.id)} style={{ ...dp.resBtn, color: 'var(--red)', borderColor: 'var(--red)' }}>✕</button>
                    </>
                  )}
                  <button onClick={() => copyLink(res.id)}
                    style={{ ...dp.resBtn, ...(copied === res.id ? { background: '#D1FAE5', color: '#065F46', borderColor: '#10B981' } : {}) }}>
                    {copied === res.id ? '✓ Copiado' : '⎘ Copiar'}
                  </button>
                  <a href={res.url} target="_blank" rel="noreferrer"
                    style={{ ...dp.resBtn, background: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'transparent', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    ↗ Abrir
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Detail View ─────────────────────────────────────────────────────────────
const DETAIL_SECTIONS = [
  { id: 'funnel',    icon: '🎯', label: 'Atividades por Etapa' },
  { id: 'refs',      icon: '🏆', label: 'Clientes de Referência' },
  { id: 'resources', icon: '📂', label: 'Materiais e Apoio' },
]

const SEGMENT_COLORS = {
  'SaaS / ISV': { bg: '#EEF2FF', color: '#4338CA' },
  'Saúde':      { bg: '#D1FAE5', color: '#065F46' },
  'Indústria':  { bg: '#FEF3C7', color: '#92400E' },
  'Varejo':     { bg: '#DBEAFE', color: '#1E40AF' },
  'Educação':   { bg: '#EDE9FE', color: '#5B21B6' },
  'Serviços':   { bg: '#F3F4F6', color: '#374151' },
  'Agronegócio':{ bg: '#D1FAE5', color: '#065F46' },
  'Outro':      { bg: '#F3F4F6', color: '#374151' },
}

function PlaybookDetail({ playbook, steps, refs, resources, isISV, onBack, onEditPlaybook,
  onAddStep, onEditStep, onDeleteStep, onAddRef, onEditRef, onDeleteRef,
  onAddResource, onEditResource, onDeleteResource }) {
  const [section, setSection] = useState('funnel')
  const segColor = SEGMENT_COLORS[playbook.segment] || SEGMENT_COLORS['Outro']
  const stepsCount    = steps.length
  const refsCount     = refs.length
  const resourceCount = resources.length

  return (
    <div style={dv.wrap}>
      {/* ── Top bar ── */}
      <div style={dv.topBar}>
        <button onClick={onBack} style={dv.backBtn}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
          <span>Playbooks</span>
        </button>
        <div style={dv.topCenter}>
          <span style={{ ...dv.segBadge, background: segColor.bg, color: segColor.color }}>{playbook.segment}</span>
          <h1 style={dv.topTitle}>{playbook.title}</h1>
        </div>
        {isISV && (
          <button onClick={onEditPlaybook} style={dv.editBtn}>✎ Editar</button>
        )}
      </div>

      {/* ── 2-column layout ── */}
      <div style={dv.body}>
        {/* Internal sidebar */}
        <aside style={dv.sidebar}>
          <div style={dv.sbInner}>
            {DETAIL_SECTIONS.map(sec => {
              const count = sec.id === 'funnel' ? stepsCount : sec.id === 'refs' ? refsCount : resourceCount
              return (
                <button key={sec.id}
                  style={{ ...dv.sbItem, ...(section === sec.id ? dv.sbItemActive : {}) }}
                  onClick={() => setSection(sec.id)}>
                  <span style={{ fontSize: 14 }}>{sec.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{sec.label}</span>
                  {count > 0 && (
                    <span style={{ ...dv.sbCount, ...(section === sec.id ? dv.sbCountActive : {}) }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Content area */}
        <main style={dv.content}>
          {section === 'funnel' && (
            <FunnelStepsPanel steps={steps} isISV={isISV} onAddStep={onAddStep} onEditStep={onEditStep} onDeleteStep={onDeleteStep} />
          )}
          {section === 'refs' && (
            <ReferencesPanel refs={refs} isISV={isISV} onAdd={onAddRef} onEdit={onEditRef} onDelete={onDeleteRef} />
          )}
          {section === 'resources' && (
            <ResourcesPanel resources={resources} isISV={isISV} onAdd={onAddResource} onEdit={onEditResource} onDelete={onDeleteResource} />
          )}
        </main>
      </div>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────
function PlaybookList({ playbooks, steps, refs, resources, isISV, onOpen, onNew }) {
  const [search, setSearch] = useState('')
  const [filterSegment, setFilterSegment] = useState('Todos')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return playbooks.filter(pb => {
      if (filterSegment !== 'Todos' && pb.segment !== filterSegment) return false
      if (q && !pb.title.toLowerCase().includes(q) && !(pb.description || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [playbooks, search, filterSegment])

  return (
    <div style={lv.wrap}>
      {/* Header */}
      <div style={lv.header}>
        <div>
          <div style={lv.breadcrumb}>
            <span>Operação</span>
            <span style={{ color: 'var(--border)' }}>›</span>
            <span>Playbooks</span>
          </div>
          <h1 style={lv.title}>Playbooks</h1>
        </div>
        {isISV && (
          <button onClick={onNew} style={lv.newBtn}>+ Novo Playbook</button>
        )}
      </div>

      {/* Toolbar */}
      <div style={lv.toolbar}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar playbook…"
            style={{ ...lv.searchInput, paddingLeft: 30 }} />
        </div>
        <select value={filterSegment} onChange={e => setFilterSegment(e.target.value)} style={lv.select}>
          <option value="Todos">Todos os segmentos</option>
          {SEGMENT_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} playbook{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={lv.empty}>
          <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 16 }}>☰</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            {playbooks.length === 0 ? 'Nenhum playbook criado ainda' : 'Nenhum resultado encontrado'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {playbooks.length === 0 && isISV ? 'Crie o primeiro playbook para começar.' : 'Tente ajustar os filtros de busca.'}
          </div>
          {playbooks.length === 0 && isISV && (
            <button onClick={onNew} style={{ ...lv.newBtn, marginTop: 20 }}>+ Novo Playbook</button>
          )}
        </div>
      ) : (
        <div style={lv.grid}>
          {filtered.map(pb => {
            const segColor = SEGMENT_COLORS[pb.segment] || SEGMENT_COLORS['Outro']
            const stepsCount    = steps.filter(s => s.playbook_id === pb.id).length
            const refsCount     = refs.filter(r => r.playbook_id === pb.id).length
            const resourceCount = resources.filter(r => r.playbook_id === pb.id).length

            return (
              <button key={pb.id} onClick={() => onOpen(pb)} style={lv.card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <span style={{ ...lv.segBadge, background: segColor.bg, color: segColor.color }}>{pb.segment}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                    v{new Date(pb.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
                <h3 style={lv.cardTitle}>{pb.title}</h3>
                {pb.description && (
                  <p style={lv.cardDesc}>{pb.description}</p>
                )}
                <div style={lv.cardStats}>
                  <span style={lv.stat}><span style={{ opacity: 0.6 }}>🎯</span> {stepsCount} etapas</span>
                  <span style={lv.stat}><span style={{ opacity: 0.6 }}>🏆</span> {refsCount} referências</span>
                  <span style={lv.stat}><span style={{ opacity: 0.6 }}>📂</span> {resourceCount} materiais</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function Playbooks() {
  const isISV = USE_PROFILE === 'isv'

  const [playbooks, setPlaybooks] = useLocalState(PB_STORAGE_KEY,           MOCK_PLAYBOOKS)
  const [steps,     setSteps]     = useLocalState(PB_STEPS_STORAGE_KEY,     MOCK_FUNNEL_STEPS)
  const [refs,      setRefs]      = useLocalState(PB_REFS_STORAGE_KEY,      MOCK_REFERENCES)
  const [resources, setResources] = useLocalState(PB_RESOURCES_STORAGE_KEY, MOCK_RESOURCES)

  const [selectedPb, setSelectedPb] = useState(null)
  const [modal, setModal] = useState(null) // null | { type, data? }

  const now = () => new Date().toISOString()
  const tid = 't1'

  // Filtered by selected playbook
  const pbSteps     = useMemo(() => steps.filter(s => s.playbook_id === selectedPb?.id),    [steps, selectedPb])
  const pbRefs      = useMemo(() => refs.filter(r => r.playbook_id === selectedPb?.id),      [refs, selectedPb])
  const pbResources = useMemo(() => resources.filter(r => r.playbook_id === selectedPb?.id), [resources, selectedPb])

  function savePlaybook(form) {
    const t = now()
    if (form.id) {
      setPlaybooks(prev => prev.map(p => p.id === form.id ? { ...p, ...form, updated_at: t } : p))
      if (selectedPb?.id === form.id) setSelectedPb(p => ({ ...p, ...form, updated_at: t }))
    } else {
      const nb = { ...form, id: `pb-${Date.now()}`, tenant_id: tid, created_by: 'Você', created_at: t, updated_at: t }
      setPlaybooks(prev => [...prev, nb])
    }
    setModal(null)
  }

  function saveStep(form) {
    const t = now()
    if (form.id) {
      setSteps(prev => prev.map(s => s.id === form.id ? { ...s, ...form, updated_at: t } : s))
    } else {
      const ns = { ...form, id: `fs-${Date.now()}`, playbook_id: selectedPb.id, tenant_id: tid, sort_order: steps.length + 1, created_at: t, updated_at: t }
      setSteps(prev => [...prev, ns])
    }
    setModal(null)
  }

  function saveRef(form) {
    const t = now()
    const cleanResults = (form.results || []).filter(r => r.label.trim())
    if (form.id) {
      setRefs(prev => prev.map(r => r.id === form.id ? { ...r, ...form, results: cleanResults, updated_at: t } : r))
    } else {
      const nr = { ...form, id: `ref-${Date.now()}`, playbook_id: selectedPb.id, tenant_id: tid, results: cleanResults, created_at: t, updated_at: t }
      setRefs(prev => [...prev, nr])
    }
    setModal(null)
  }

  function deleteRef(id) {
    if (window.confirm('Remover este cliente de referência?')) setRefs(prev => prev.filter(r => r.id !== id))
  }

  function saveResource(form) {
    const t = now()
    if (form.id) {
      setResources(prev => prev.map(r => r.id === form.id ? { ...r, ...form, updated_at: t } : r))
    } else {
      const nr = { ...form, id: `res-${Date.now()}`, playbook_id: selectedPb.id, tenant_id: tid, sort_order: resources.length + 1, created_at: t, updated_at: t }
      setResources(prev => [...prev, nr])
    }
    setModal(null)
  }

  function deleteStep(id) {
    if (window.confirm('Remover esta atividade?')) setSteps(prev => prev.filter(s => s.id !== id))
  }

  function deleteResource(id) {
    if (window.confirm('Remover este material?')) setResources(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {selectedPb ? (
        <PlaybookDetail
          playbook={selectedPb}
          steps={pbSteps}
          refs={pbRefs}
          resources={pbResources}
          isISV={isISV}
          onBack={() => setSelectedPb(null)}
          onEditPlaybook={() => setModal({ type: 'playbook', data: selectedPb })}
          onAddStep={stage => setModal({ type: 'step', data: { stage } })}
          onEditStep={step => setModal({ type: 'step', data: step })}
          onDeleteStep={deleteStep}
          onAddRef={() => setModal({ type: 'ref' })}
          onEditRef={ref => setModal({ type: 'ref', data: ref })}
          onDeleteRef={deleteRef}
          onAddResource={() => setModal({ type: 'resource' })}
          onEditResource={res => setModal({ type: 'resource', data: res })}
          onDeleteResource={deleteResource}
        />
      ) : (
        <PlaybookList
          playbooks={playbooks}
          steps={steps}
          refs={refs}
          resources={resources}
          isISV={isISV}
          onOpen={setSelectedPb}
          onNew={() => setModal({ type: 'playbook' })}
        />
      )}

      {/* Modais */}
      {modal?.type === 'playbook' && (
        <PlaybookModal initial={modal.data} onSave={savePlaybook} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'step' && (
        <StepModal
          initial={modal.data?.id ? modal.data : { ...EMPTY_STEP, stage: modal.data?.stage || 'prospeccao' }}
          onSave={saveStep} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'ref' && (
        <ReferenceModal initial={modal.data} onSave={saveRef} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'resource' && (
        <ResourceModal initial={modal.data} onSave={saveResource} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// List view
const lv = {
  wrap:        { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header:      { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 24px 16px', flexShrink: 0, borderBottom: '1px solid var(--border2)' },
  breadcrumb:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  title:       { margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' },
  newBtn:      { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  toolbar:     { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderBottom: '1px solid var(--border2)', flexWrap: 'wrap', flexShrink: 0 },
  searchInput: { height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box' },
  select:      { height: 36, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
  empty:       { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' },
  grid:        { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, alignContent: 'start' },
  card:        { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '18px 20px', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', gap: 0, transition: 'box-shadow 0.15s, border-color 0.15s' },
  cardTitle:   { margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.35 },
  cardDesc:    { margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55, flex: 1 },
  cardStats:   { display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border2)', marginTop: 'auto' },
  stat:        { fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 },
  segBadge:    { display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '-0.1px' },
}

// Detail view
const dv = {
  wrap:        { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  topBar:      { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border2)', flexShrink: 0, background: 'var(--surface)' },
  backBtn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font)', flexShrink: 0, whiteSpace: 'nowrap' },
  topCenter:   { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  segBadge:    { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0 },
  topTitle:    { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  editBtn:     { padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  body:        { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:     { width: 220, flexShrink: 0, borderRight: '1px solid var(--border2)', background: 'var(--surface)', overflowY: 'auto' },
  sbInner:     { padding: '16px 0' },
  sbItem:      { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--font)', borderLeft: '2px solid transparent', transition: 'all 0.12s', textAlign: 'left' },
  sbItemActive:{ color: 'var(--accent)', background: 'var(--accent-glow)', borderLeft: '2px solid var(--accent)' },
  sbCount:     { fontSize: 11, fontWeight: 600, background: 'var(--surface2)', color: 'var(--text-muted)', borderRadius: 10, padding: '1px 7px', border: '1px solid var(--border)' },
  sbCountActive:{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid transparent' },
  content:     { flex: 1, overflowY: 'auto', minWidth: 0 },
}

// Detail panels shared
const dp = {
  panel:       { maxWidth: 820, padding: '28px 32px 48px' },
  panelHeader: { marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border2)' },
  panelTitle:  { margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' },
  panelSub:    { margin: 0, fontSize: 13, color: 'var(--text-muted)' },
  primaryBtn:  { padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  addBtn:      { padding: '7px 16px', background: 'none', border: '1px dashed var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 4 },
  ghostAddBtn: { padding: '5px 10px', background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', opacity: 0.75 },
  editBtn:     { padding: '5px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 },
  deleteBtn:   { padding: '5px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--red)', borderColor: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0, opacity: 0.7 },
  searchInput: { height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box' },
  empty:       { padding: '48px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyIcon:   { fontSize: 40, opacity: 0.3 },
  emptyTitle:  { fontSize: 14, color: 'var(--text-muted)' },
  refList:     { display: 'flex', flexDirection: 'column', gap: 12 },
  refCard:     { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '16px 18px' },
  regionPill:  { fontSize: 11, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 7px' },
  resultKpi:   { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', minWidth: 90 },
  resGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  resCard:     { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '16px 16px', display: 'flex', flexDirection: 'column' },
  resBtn:      { padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' },
  tag:         { padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
}

// Modal
const m = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, backdropFilter: 'blur(2px)' },
  box:       { background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  title:     { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  close:     { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 },
  body:      { padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  footer:    { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 },
  lbl:       { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 5 },
  inp:       { width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' },
  cancelBtn: { padding: '7px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' },
  saveBtn:   { padding: '7px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
}

const md = {
  root:  { fontSize: 14, color: 'var(--text)', lineHeight: 1.7, fontFamily: 'var(--font)' },
  h1:    { fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 18px', letterSpacing: '-0.4px', lineHeight: 1.25 },
  h2:    { fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '28px 0 10px', letterSpacing: '-0.2px', paddingBottom: 6, borderBottom: '1px solid var(--border2)' },
  h3:    { fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '20px 0 8px', letterSpacing: '-0.1px' },
  p:     { margin: '0 0 12px', color: 'var(--text-soft)', lineHeight: 1.75 },
  bq:    { background: 'var(--accent-glow)', borderLeft: '3px solid var(--accent)', borderRadius: '0 8px 8px 0', padding: '12px 16px', margin: '16px 0', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.65 },
  ul:    { margin: '0 0 14px', paddingLeft: 20 },
  li:    { marginBottom: 5, color: 'var(--text-soft)', lineHeight: 1.65 },
  hr:    { border: 'none', borderTop: '1px solid var(--border2)', margin: '24px 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:    { padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border)' },
  td:    { padding: '9px 12px', border: '1px solid var(--border)', color: 'var(--text-soft)', verticalAlign: 'top' },
}
