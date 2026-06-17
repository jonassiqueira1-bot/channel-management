/**
 * Configuração de Campos — Layout Editor
 * 3 painéis: Campos disponíveis | Editor drag-drop | Pré-visualização ao vivo
 * Auto-save via useLocalState (sem botão Salvar)
 */

import { useState, useMemo, useRef } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { FIELDS_SEED, LAYOUT_SEED } from '../../data/formSeeds'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  Lock, Plus, X, Pencil, GripVertical, ChevronUp,
  ChevronDown, Trash2, Check, Eye, EyeOff, Search,
  Type, AlignLeft, Hash, Calendar, ToggleLeft, List,
} from 'lucide-react'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit } from '../../components/ui'

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACCENT = '#6366F1'
const SIDEBAR_ID = '__sidebar__'

const ENTIDADES = [
  { id: 'companies',     label: 'Empresas',       emoji: '🏢' },
  { id: 'opportunities', label: 'Oportunidades',  emoji: '📈' },
  { id: 'projects',      label: 'Projetos',       emoji: '🗂' },
  { id: 'products',      label: 'Produtos',       emoji: '📦' },
  { id: 'contracts',     label: 'Contratos',      emoji: '📄' },
  { id: 'payments',      label: 'Pagamentos',     emoji: '💳' },
  { id: 'actions',       label: 'Ações',          emoji: '⚡' },
  { id: 'sellers',       label: 'Vendedores',     emoji: '👤' },
]

const TIPOS = [
  { id: 'text',     label: 'Texto curto',    Icon: Type },
  { id: 'textarea', label: 'Texto longo',    Icon: AlignLeft },
  { id: 'number',   label: 'Número',         Icon: Hash },
  { id: 'date',     label: 'Data',           Icon: Calendar },
  { id: 'select',   label: 'Lista',          Icon: List },
  { id: 'boolean',  label: 'Sim / Não',      Icon: ToggleLeft },
]

const TIPO_META = {
  text:     { color: '#2563EB', bg: '#EFF6FF' },
  textarea: { color: '#7C3AED', bg: '#F5F3FF' },
  number:   { color: '#059669', bg: '#ECFDF5' },
  date:     { color: '#C2410C', bg: '#FFF7ED' },
  select:   { color: '#86198F', bg: '#FDF4FF' },
  boolean:  { color: '#166534', bg: '#F0FDF4' },
}

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPlacedIds(layout, entity) {
  const secs = layout[entity]?.sections || []
  const ids = new Set()
  secs.forEach(sec => sec.rows.forEach(row => row.forEach(id => { if (id) ids.add(id) })))
  return ids
}

function TipoBadge({ tipo }) {
  const t = TIPOS.find(x => x.id === tipo)
  const m = TIPO_META[tipo] || { color: 'var(--text-muted)', bg: 'var(--surface2)' }
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
      background: m.bg, color: m.color, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
      {t?.label || tipo}
    </span>
  )
}

// ─── Preview de campo individual ───────────────────────────────────────────────
function PreviewField({ field }) {
  if (!field) return null
  const { field_type, label, is_required, options } = field
  const inputBase = {
    width: '100%', boxSizing: 'border-box', padding: '7px 10px',
    borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text-muted)',
    fontSize: 12, fontFamily: 'var(--font)', pointerEvents: 'none',
  }

  let control
  if (field_type === 'textarea') {
    control = (
      <div style={{ ...inputBase, minHeight: 60, color: 'var(--border2)', fontSize: 11, fontStyle: 'italic' }}>
        Texto longo…
      </div>
    )
  } else if (field_type === 'select') {
    control = (
      <div style={{ ...inputBase, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--border2)', fontSize: 11, fontStyle: 'italic' }}>
          {options?.[0] || 'Selecione…'}
        </span>
        <span style={{ color: 'var(--border2)', fontSize: 10 }}>▾</span>
      </div>
    )
  } else if (field_type === 'boolean') {
    control = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 18, borderRadius: 9, background: 'var(--border2)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Não</span>
      </div>
    )
  } else if (field_type === 'date') {
    control = (
      <div style={{ ...inputBase, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--border2)', fontSize: 11, fontStyle: 'italic' }}>dd/mm/aaaa</span>
        <Calendar size={11} color="var(--border2)" strokeWidth={1.75} />
      </div>
    )
  } else if (field_type === 'number') {
    control = (
      <div style={{ ...inputBase, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--border2)', fontSize: 11, fontStyle: 'italic' }}>0,00</span>
      </div>
    )
  } else {
    control = (
      <div style={{ ...inputBase, color: 'var(--border2)', fontSize: 11, fontStyle: 'italic' }}>
        {label}…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', gap: 3, alignItems: 'center' }}>
        {label}
        {is_required && <span style={{ color: 'var(--red)', fontWeight: 900 }}>*</span>}
      </label>
      {control}
    </div>
  )
}

// ─── Painel de pré-visualização ────────────────────────────────────────────────
function PreviewPanel({ sections, fieldById, entityLabel }) {
  return (
    <div style={{
      width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)',
      background: 'var(--surface)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header preview */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>
          Pré-visualização
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{entityLabel}</div>
      </div>

      {/* Conteúdo simulado */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {sections.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 40 }}>
            Nenhuma seção configurada
          </div>
        )}
        {sections.map(sec => (
          <div key={sec.id} style={{
            border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            background: 'var(--surface)',
          }}>
            {/* Título da seção */}
            <div style={{
              padding: '8px 14px', background: 'var(--surface2)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 3, height: 12, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{sec.label}</span>
            </div>
            {/* Campos */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sec.rows.map((row, ri) => {
                const left  = fieldById[row[0]]
                const right = fieldById[row[1]]
                if (!left && !right) return null
                return (
                  <div key={ri} style={{ display: 'flex', gap: 10 }}>
                    {left  ? <PreviewField field={left}  /> : <div style={{ flex: 1 }} />}
                    {right ? <PreviewField field={right} /> : <div style={{ flex: 1 }} />}
                  </div>
                )
              })}
              {sec.rows.every(r => !r[0] && !r[1]) && (
                <div style={{ fontSize: 11, color: 'var(--border2)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                  Seção vazia
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Card arrastável da sidebar de campos disponíveis ─────────────────────────
function SidebarFieldCard({ field, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar:${field.id}`,
    data: { type: 'sidebar', fieldId: field.id },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{
        padding: '8px 10px', borderRadius: 8, cursor: 'grab', userSelect: 'none',
        border: `1px solid ${isDragOverlay ? ACCENT : 'var(--border)'}`,
        background: isDragOverlay ? 'var(--surface)' : 'var(--surface2)',
        opacity: isDragging && !isDragOverlay ? 0.3 : 1,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: isDragOverlay ? '0 8px 24px rgba(99,102,241,0.15)' : 'none',
        transition: 'opacity 0.12s',
      }}>
      <GripVertical size={12} color="var(--border2)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {field.label}
        </div>
        <TipoBadge tipo={field.field_type} />
      </div>
    </div>
  )
}

// ─── Painel esquerdo: campos disponíveis ───────────────────────────────────────
function AvailableFieldsPanel({ sidebarFields, onNewField, onEditField, onDeleteField }) {
  const { isOver, setNodeRef } = useDroppable({ id: SIDEBAR_ID })
  const [search, setSearch] = useState('')

  const filtered = sidebarFields.filter(f =>
    f.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={setNodeRef} style={{
      width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
      background: isOver ? `${ACCENT}06` : 'var(--surface)',
      display: 'flex', flexDirection: 'column', transition: 'background 0.15s',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Campos disponíveis
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} strokeWidth={1.75} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar campo…"
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 28, paddingRight: 8,
              paddingTop: 7, paddingBottom: 7, fontSize: 12, borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Drop zone hint */}
      {isOver && (
        <div style={{ margin: '8px 10px 0', padding: '8px', borderRadius: 8, background: `${ACCENT}12`,
          border: `1.5px dashed ${ACCENT}`, fontSize: 11, fontWeight: 600, color: ACCENT, textAlign: 'center' }}>
          Soltar para remover do formulário
        </div>
      )}

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--border2)', fontStyle: 'italic', textAlign: 'center', marginTop: 16 }}>
            {search ? 'Nenhum resultado' : 'Todos os campos estão no formulário'}
          </div>
        )}
        {filtered.map(f => (
          <div key={f.id} style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SidebarFieldCard field={f} />
            </div>
            {!f.is_system && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => onEditField(f)} title="Editar" style={cs.iconBtn}
                  onMouseEnter={e => e.currentTarget.style.color = ACCENT}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Pencil size={10} strokeWidth={1.75} />
                </button>
                <button onClick={() => onDeleteField(f.id)} title="Excluir campo" style={cs.iconBtn}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Trash2 size={10} strokeWidth={1.75} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={onNewField} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px', borderRadius: 8, border: `1.5px dashed ${ACCENT}`,
          background: 'var(--accent-glow)', color: ACCENT, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.12s',
        }}>
          <Plus size={13} strokeWidth={2} /> Novo campo
        </button>
      </div>
    </div>
  )
}

// ─── Slot com campo posicionado ────────────────────────────────────────────────
function PlacedFieldCard({ field, slotId, onRemove, onEdit, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed:${slotId}`,
    data: { type: 'placed', slotId, fieldId: field.id },
  })
  const [hovered, setHovered] = useState(false)

  return (
    <div ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: isDragging && !isDragOverlay ? 0.2 : 1,
        background: isDragOverlay ? 'var(--surface)' : hovered ? 'var(--surface)' : '#F8FAFC',
        border: `1.5px solid ${isDragOverlay ? ACCENT : hovered ? ACCENT : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 9,
        boxShadow: isDragOverlay ? `0 8px 24px rgba(99,102,241,0.18)` : hovered ? `0 0 0 3px ${ACCENT}18` : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        minWidth: 0, transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}>

      <div style={{ flexShrink: 0, display: 'flex', opacity: hovered ? 1 : 0.4, transition: 'opacity 0.15s' }}>
        {field.is_system
          ? <Lock size={11} color="var(--text-muted)" strokeWidth={1.75} />
          : <span {...attributes} {...listeners} style={{ display:'flex', cursor:'grab' }}>
              <GripVertical size={13} color={hovered ? ACCENT : 'var(--border2)'} strokeWidth={1.75} />
            </span>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {field.label}
          </span>
          {field.is_required && (
            <span style={{ color: 'var(--red)', fontSize: 11, fontWeight: 900, lineHeight: 1, flexShrink:0 }}>*</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 2, alignItems: 'center' }}>
          <TipoBadge tipo={field.field_type} />
          {field.is_system && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: '#FEF3C7', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sistema
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {!field.is_system && (
          <button onClick={() => onEdit(field)} title="Editar" style={cs.iconBtn}
            onMouseEnter={e => e.currentTarget.style.color = ACCENT}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <Pencil size={11} strokeWidth={1.75} />
          </button>
        )}
        <button onClick={() => onRemove(slotId)} title="Remover do formulário" style={cs.iconBtn}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <X size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ─── Slot droppável ────────────────────────────────────────────────────────────
function DropSlot({ slotId, field, onRemove, onEdit, onAdd }) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot:${slotId}` })
  const isEmpty = !field
  const [hov, setHov] = useState(false)

  return (
    <div ref={setNodeRef} style={{
      flex: 1, minWidth: 0,
      border: `2px dashed ${isOver ? ACCENT : isEmpty && hov ? ACCENT : isEmpty ? 'var(--border2)' : 'transparent'}`,
      borderRadius: 10,
      transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
      background: isOver ? `${ACCENT}08` : isEmpty && hov ? `${ACCENT}05` : 'transparent',
      boxShadow: isOver ? `0 0 0 4px ${ACCENT}14` : 'none',
      minHeight: 80,
    }}>
      {isEmpty ? (
        <button
          onClick={onAdd}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: '100%', height: '100%', minHeight: 80, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: isOver || hov ? ACCENT : 'var(--border2)',
            userSelect: 'none', padding: '12px 16px',
            transition: 'color 0.15s',
          }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            border: `1.5px dashed ${isOver || hov ? ACCENT : 'var(--border2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.15s, background 0.15s',
            background: isOver || hov ? `${ACCENT}10` : 'transparent',
          }}>
            <Plus size={13} color={isOver || hov ? ACCENT : 'var(--border2)'} strokeWidth={2} />
          </div>
          <span style={{ fontSize: 11, fontWeight: isOver || hov ? 700 : 400 }}>
            {isOver ? 'Soltar aqui' : 'Adicionar campo'}
          </span>
        </button>
      ) : (
        <PlacedFieldCard field={field} slotId={slotId} onRemove={onRemove} onEdit={onEdit} />
      )}
    </div>
  )
}

// ─── Modal: criar / editar campo ─────────────────────────────────────────────
function FieldModal({ initial, entity, allFields, onClose, onSave }) {
  const isEdit = !!initial
  const [label, setLabel]   = useState(initial?.label || '')
  const [key, setKey]       = useState(initial?.field_key || '')
  const [tipo, setTipo]     = useState(initial?.field_type || 'text')
  const [opts, setOpts]     = useState((initial?.options || []).join('\n'))
  const [req, setReq]       = useState(initial?.is_required || false)
  const [keyManual, setKeyManual] = useState(isEdit)
  const [errs, setErrs]     = useState({})

  function autoKey(v) {
    return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)
  }

  function handleLabel(v) {
    setLabel(v); setErrs(e => ({ ...e, label:null }))
    if (!keyManual) setKey(autoKey(v))
  }

  function validate() {
    const e = {}
    if (!label.trim()) e.label = 'Nome obrigatório'
    if (!key.trim()) e.key = 'Chave obrigatória'
    else if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) e.key = 'Apenas letras minúsculas, números e _'
    else {
      const dup = allFields.find(f => f.field_key === key && f.entity === entity && f.id !== initial?.id)
      if (dup) e.key = 'Chave já existe nesta entidade'
    }
    return e
  }

  function submit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrs(errs); return }
    onSave({
      ...(initial || {}),
      entity, label: label.trim(), field_key: key,
      field_type: tipo,
      options: tipo === 'select' ? opts.split('\n').map(o=>o.trim()).filter(Boolean) : [],
      is_required: req, is_system: false,
    })
  }

  return (
    <div style={cs.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...cs.modal, maxWidth: 500 }}>
        <div style={cs.mhead}>
          <div>
            <div style={cs.msub}>Config. de Campos · {ENTIDADES.find(e=>e.id===entity)?.label}</div>
            <h2 style={cs.mtitle}>{isEdit ? 'Editar campo' : 'Novo campo'}</h2>
          </div>
          <button onClick={onClose} style={cs.closeBtn}><X size={16} strokeWidth={1.75}/></button>
        </div>

        <form onSubmit={submit}>
          <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={cs.fg}>
              <label style={cs.lbl}>Nome do campo *</label>
              <input autoFocus style={{ ...cs.inp, ...(errs.label?{borderColor:'var(--red)'}:{}) }}
                value={label} onChange={e => handleLabel(e.target.value)}
                placeholder="Ex: Setor, Score, Data de Assinatura…" />
              {errs.label && <span style={cs.err}>{errs.label}</span>}
            </div>

            <div style={cs.fg}>
              <label style={cs.lbl}>
                Chave (field_key) *
                <span style={{ marginLeft:6, fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4,
                  background:'var(--accent-glow)', color:'var(--accent)', letterSpacing:0, textTransform:'none' }}>
                  snake_case
                </span>
              </label>
              <input style={{ ...cs.inp, fontFamily:'var(--mono)', fontSize:12, ...(errs.key?{borderColor:'var(--red)'}:{}) }}
                value={key}
                onChange={e => { setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')); setKeyManual(true); setErrs(v=>({...v,key:null})) }}
                placeholder="campo_customizado" />
              {errs.key
                ? <span style={cs.err}>{errs.key}</span>
                : <span style={{ fontSize:10, color:'var(--text-muted)' }}>Identificador único — não pode ser alterado depois</span>
              }
            </div>

            <div style={cs.fg}>
              <label style={cs.lbl}>Tipo de campo</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {TIPOS.map(t => {
                  const m = TIPO_META[t.id] || {}
                  const sel = tipo === t.id
                  const TIcon = t.Icon
                  return (
                    <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                      style={{ padding:'10px 8px', borderRadius:8, cursor:'pointer', textAlign:'left',
                        border:`2px solid ${sel ? (m.color||ACCENT) : 'var(--border)'}`,
                        background: sel ? (m.bg||'var(--accent-glow)') : 'var(--surface2)',
                        display:'flex', alignItems:'center', gap:7, transition:'all 0.12s' }}>
                      <TIcon size={13} color={sel ? (m.color||ACCENT) : 'var(--text-muted)'} strokeWidth={1.75}/>
                      <span style={{ fontSize:11, fontWeight:700, color: sel ? (m.color||ACCENT) : 'var(--text)' }}>
                        {t.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {tipo === 'select' && (
              <div style={cs.fg}>
                <label style={cs.lbl}>Opções <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(uma por linha)</span></label>
                <textarea rows={4} style={{ ...cs.inp, resize:'vertical', fontFamily:'var(--mono)', fontSize:12, lineHeight:1.6 }}
                  value={opts} onChange={e => setOpts(e.target.value)}
                  placeholder={'Opção 1\nOpção 2\nOpção 3'} />
              </div>
            )}

            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" checked={req} onChange={e => setReq(e.target.checked)}
                style={{ width:15, height:15, accentColor:ACCENT, cursor:'pointer' }} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Campo obrigatório</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>O formulário não pode ser salvo sem este campo preenchido</div>
              </div>
            </label>
          </div>

          <div style={cs.mfoot}>
            <div style={{ flex:1 }}/>
            <button type="button" onClick={onClose} style={cs.btnSec}>Cancelar</button>
            <button type="submit" style={cs.btnPri}>{isEdit ? 'Salvar' : 'Criar campo'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: renomear seção ─────────────────────────────────────────────────────
function SectionNameModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial || '')
  return (
    <div style={cs.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...cs.modal, maxWidth:380 }}>
        <div style={cs.mhead}>
          <h2 style={cs.mtitle}>Nome da seção</h2>
          <button onClick={onClose} style={cs.closeBtn}><X size={16}/></button>
        </div>
        <div style={{ padding:'18px 24px' }}>
          <input autoFocus style={cs.inp} value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && name.trim()) { onSave(name.trim()); onClose() } }}
            placeholder="Ex: Informações Financeiras" />
        </div>
        <div style={cs.mfoot}>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={cs.btnSec}>Cancelar</button>
          <button onClick={() => { if(name.trim()) { onSave(name.trim()); onClose() } }} style={cs.btnPri}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm delete ────────────────────────────────────────────────────────────
function ConfirmDeleteModal({ onClose, onConfirm }) {
  return (
    <div style={cs.overlay} onClick={onClose}>
      <div style={{ ...cs.modal, maxWidth:360 }} onClick={e => e.stopPropagation()}>
        <div style={cs.mhead}>
          <h2 style={{ ...cs.mtitle, color:'var(--red)' }}>Excluir campo</h2>
          <button onClick={onClose} style={cs.closeBtn}><X size={16}/></button>
        </div>
        <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ margin:0, fontSize:13, color:'var(--text-soft)', lineHeight:1.6 }}>
            O campo será removido permanentemente. Dados já salvos em registros existentes não serão apagados.
          </p>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button style={cs.btnSec} onClick={onClose}>Cancelar</button>
            <button style={{ ...cs.btnPri, background:'var(--red)' }} onClick={onConfirm}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Editor interno (DnD 3 colunas) ───────────────────────────────────────────
function EntityEditor({ entity, fields, setFields, layout, setLayout }) {
  const [showPreview, setShowPreview] = useLocalState('settings:forms_preview', true)
  const [fieldModal,  setFieldModal]  = useState(null)
  const [secModal,    setSecModal]    = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [activeDrag,  setActiveDrag]  = useState(null)
  const [pendingSlot, setPendingSlot] = useState(null)
  const [savedFlash,  setSavedFlash]  = useState(false)
  const flashTimer = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const entityFields  = useMemo(() => fields.filter(f => f.entity === entity), [fields, entity])
  const fieldById     = useMemo(() => Object.fromEntries(fields.map(f => [f.id, f])), [fields])
  const placedIds     = useMemo(() => getPlacedIds(layout, entity), [layout, entity])
  const sidebarFields = useMemo(() => entityFields.filter(f => !placedIds.has(f.id)), [entityFields, placedIds])
  const sections      = layout[entity]?.sections || []
  const entityLabel   = ENTIDADES.find(e => e.id === entity)?.label || ''

  function flashSaved() {
    clearTimeout(flashTimer.current)
    setSavedFlash(true)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800)
  }

  // ── Helpers de layout ──────────────────────────────────────────────────────
  function updateLayout(fn) {
    setLayout(prev => {
      const next = { ...prev }
      next[entity] = { ...prev[entity], sections: fn([...(prev[entity]?.sections||[])]) }
      return next
    })
    flashSaved()
  }

  function parseSlot(slotId) {
    const [secId, row, col] = slotId.split(':')
    return { secId, rowIdx: Number(row), col: Number(col) }
  }

  function getSlotValue(secs, slotId) {
    const { secId, rowIdx, col } = parseSlot(slotId)
    const sec = secs.find(s => s.id === secId)
    return sec?.rows?.[rowIdx]?.[col] ?? null
  }

  function setSlotValue(secs, slotId, value) {
    const { secId, rowIdx, col } = parseSlot(slotId)
    return secs.map(sec => {
      if (sec.id !== secId) return sec
      const rows = sec.rows.map((row, ri) => {
        if (ri !== rowIdx) return row
        const r = [...row]
        r[col] = value
        return r
      })
      return { ...sec, rows }
    })
  }

  function removeFieldFromLayout(secs, fieldId) {
    return secs.map(sec => ({
      ...sec,
      rows: sec.rows.map(row => row.map(id => id === fieldId ? null : id))
    }))
  }

  // ── DnD ────────────────────────────────────────────────────────────────────
  function onDragStart({ active }) {
    setActiveDrag(active.data.current)
  }

  function onDragEnd({ active, over }) {
    setActiveDrag(null)
    if (!over) return

    const aData  = active.data.current
    const overId = over.id

    // Soltar na sidebar → remover do layout
    if (overId === SIDEBAR_ID && aData.type === 'placed') {
      updateLayout(secs => setSlotValue(secs, aData.slotId, null))
      return
    }

    if (!overId.startsWith('slot:')) return
    const targetSlotId = overId.replace('slot:', '')

    updateLayout(secs => {
      let next = [...secs]
      if (aData.type === 'sidebar') {
        next = setSlotValue(next, targetSlotId, aData.fieldId)
        return next
      }
      if (aData.type === 'placed') {
        const srcVal = getSlotValue(next, aData.slotId)
        const dstVal = getSlotValue(next, targetSlotId)
        next = setSlotValue(next, aData.slotId, dstVal)
        next = setSlotValue(next, targetSlotId, srcVal)
        return next
      }
      return next
    })
  }

  // ── Ações de seção ─────────────────────────────────────────────────────────
  function addSection() {
    updateLayout(secs => [
      ...secs,
      { id: `sec_${uid()}`, label: 'Nova seção', rows: [[null, null]] }
    ])
  }

  function renameSection(secId, name) {
    updateLayout(secs => secs.map(s => s.id === secId ? { ...s, label: name } : s))
  }

  function deleteSection(secId) {
    updateLayout(secs => secs.filter(s => s.id !== secId))
  }

  function moveSection(secId, dir) {
    updateLayout(secs => {
      const i = secs.findIndex(s => s.id === secId)
      if (i + dir < 0 || i + dir >= secs.length) return secs
      const next = [...secs]
      ;[next[i], next[i+dir]] = [next[i+dir], next[i]]
      return next
    })
  }

  function addRow(secId) {
    updateLayout(secs => secs.map(s => s.id === secId
      ? { ...s, rows: [...s.rows, [null, null]] }
      : s
    ))
  }

  function removeRow(secId, rowIdx) {
    updateLayout(secs => secs.map(s => {
      if (s.id !== secId) return s
      const rows = s.rows.filter((_, i) => i !== rowIdx)
      return { ...s, rows: rows.length ? rows : [[null, null]] }
    }))
  }

  function handleRemoveFromSlot(slotId) {
    updateLayout(secs => setSlotValue(secs, slotId, null))
  }

  // ── CRUD de campos ─────────────────────────────────────────────────────────
  function handleSaveField(data) {
    if (data.id && fields.some(f => f.id === data.id)) {
      setFields(prev => prev.map(f => f.id === data.id ? { ...f, ...data } : f))
    } else {
      const newId = `cf_${uid()}`
      const newField = { ...data, id: newId }
      setFields(prev => [...prev, newField])
      if (pendingSlot) {
        updateLayout(secs => setSlotValue(secs, pendingSlot, newId))
      }
    }
    setFieldModal(null)
    setPendingSlot(null)
    flashSaved()
  }

  function handleDeleteField(id) {
    setFields(prev => prev.filter(f => f.id !== id))
    updateLayout(secs => removeFieldFromLayout(secs, id))
    setConfirmDel(null)
  }

  const overlayField = useMemo(() => {
    if (!activeDrag) return null
    return fieldById[activeDrag.fieldId] || null
  }, [activeDrag, fieldById])

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* ── Sub-toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {savedFlash && (
          <span style={{ fontSize:12, color:'var(--green)', fontWeight:600, display:'flex', alignItems:'center', gap:5, animation:'fadeIn 0.2s ease' }}>
            <Check size={13} color="var(--green)" strokeWidth={2.5} /> Salvo
          </span>
        )}
        <button
          onClick={() => setShowPreview(v => !v)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background: showPreview ? 'var(--accent-glow)' : 'var(--surface)', color: showPreview ? ACCENT : 'var(--text-muted)', fontSize:12, fontWeight:700, fontFamily:'var(--font)', cursor:'pointer', transition:'all 0.15s' }}>
          {showPreview ? <EyeOff size={13} strokeWidth={1.75}/> : <Eye size={13} strokeWidth={1.75}/>}
          {showPreview ? 'Ocultar prévia' : 'Pré-visualizar'}
        </button>
      </div>

      {/* ── Layout 3 colunas ── */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0, height:'100%' }}>

          {/* ═══ Coluna 1: Campos disponíveis ═══ */}
          <AvailableFieldsPanel
            sidebarFields={sidebarFields}
            onNewField={() => setFieldModal('new')}
            onEditField={f => setFieldModal(f)}
            onDeleteField={id => setConfirmDel(id)}
          />

          {/* ═══ Coluna 2: Editor ═══ */}
          <div style={{ flex:1, overflowY:'auto', padding:'28px 32px 72px', display:'flex', flexDirection:'column', gap:32, background:'var(--surface2)' }}>

            {sections.map((sec, secIdx) => (
              <div key={sec.id} style={{
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:14, overflow:'hidden',
                boxShadow:'0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
              }}>
                {/* Cabeçalho da seção */}
                <div style={{
                  display:'flex', alignItems:'center', gap:8, padding:'12px 18px',
                  background:'var(--surface2)', borderBottom:'1px solid var(--border)',
                }}>
                  <div style={{ width:3, height:14, borderRadius:2, background:ACCENT, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:13, fontWeight:700, color:'var(--text)', letterSpacing:'-0.1px' }}>
                    {sec.label}
                  </span>
                  <button onClick={() => setSecModal({ secId: sec.id, current: sec.label })}
                    title="Renomear seção" style={cs.secBtn}>
                    <Pencil size={12} strokeWidth={1.75}/>
                  </button>
                  <button onClick={() => moveSection(sec.id, -1)}
                    disabled={secIdx === 0} title="Mover para cima"
                    style={{ ...cs.secBtn, opacity: secIdx===0 ? 0.3 : 1 }}>
                    <ChevronUp size={13} strokeWidth={2}/>
                  </button>
                  <button onClick={() => moveSection(sec.id, 1)}
                    disabled={secIdx === sections.length-1} title="Mover para baixo"
                    style={{ ...cs.secBtn, opacity: secIdx===sections.length-1 ? 0.3 : 1 }}>
                    <ChevronDown size={13} strokeWidth={2}/>
                  </button>
                  <button onClick={() => deleteSection(sec.id)} title="Excluir seção"
                    style={{ ...cs.secBtn }}
                    onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                    <Trash2 size={12} strokeWidth={1.75}/>
                  </button>
                </div>

                {/* Grid de slots */}
                <div style={{ padding:'18px 22px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                  {sec.rows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{ display:'flex', gap:14, alignItems:'stretch' }}>
                      <DropSlot
                        slotId={`${sec.id}:${rowIdx}:0`}
                        field={fieldById[row[0]] || null}
                        onRemove={handleRemoveFromSlot}
                        onEdit={f => setFieldModal(f)}
                        onAdd={() => { setPendingSlot(`${sec.id}:${rowIdx}:0`); setFieldModal('new') }}
                      />
                      <DropSlot
                        slotId={`${sec.id}:${rowIdx}:1`}
                        field={fieldById[row[1]] || null}
                        onRemove={handleRemoveFromSlot}
                        onEdit={f => setFieldModal(f)}
                        onAdd={() => { setPendingSlot(`${sec.id}:${rowIdx}:1`); setFieldModal('new') }}
                      />
                      <button onClick={() => removeRow(sec.id, rowIdx)}
                        title="Remover linha"
                        style={{ ...cs.secBtn, flexShrink:0, alignSelf:'center' }}
                        onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                        <X size={12} strokeWidth={2}/>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addRow(sec.id)}
                    style={{ alignSelf:'flex-start', fontSize:11, fontWeight:600, color:ACCENT,
                      background:'none', border:'none', cursor:'pointer', padding:'4px 0',
                      fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:4 }}>
                    <Plus size={12} strokeWidth={2}/> Adicionar linha
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addSection} style={{
              width:'100%', padding:'12px', borderRadius:10, cursor:'pointer',
              border:`2px dashed ${ACCENT}`, background:'var(--accent-glow)',
              color:ACCENT, fontSize:13, fontWeight:700, fontFamily:'var(--font)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              transition:'all 0.15s',
            }}>
              <Plus size={14} strokeWidth={2}/> Adicionar seção
            </button>
          </div>

          {/* ═══ Coluna 3: Pré-visualização ═══ */}
          {showPreview && (
            <PreviewPanel
              sections={sections}
              fieldById={fieldById}
              entityLabel={entityLabel}
            />
          )}
        </div>

        {/* ── Drag overlay ── */}
        <DragOverlay dropAnimation={null}>
          {overlayField && activeDrag?.type === 'sidebar' && (
            <SidebarFieldCard field={overlayField} isDragOverlay />
          )}
          {overlayField && activeDrag?.type === 'placed' && (
            <PlacedFieldCard
              field={overlayField}
              slotId={activeDrag.slotId}
              onRemove={() => {}} onEdit={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Modais ── */}
      {fieldModal && (
        <FieldModal
          initial={fieldModal === 'new' ? null : fieldModal}
          entity={entity}
          allFields={fields}
          onClose={() => { setFieldModal(null); setPendingSlot(null) }}
          onSave={handleSaveField}
        />
      )}

      {secModal && (
        <SectionNameModal
          initial={secModal.current || ''}
          onClose={() => setSecModal(null)}
          onSave={name => {
            if (secModal.secId) renameSection(secModal.secId, name)
          }}
        />
      )}

      {confirmDel && (
        <ConfirmDeleteModal
          onClose={() => setConfirmDel(null)}
          onConfirm={() => handleDeleteField(confirmDel)}
        />
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsForms() {
  const [fields,  setFields]  = useLocalState('settings:form_fields_v2',  FIELDS_SEED)
  const [layout,  setLayout]  = useLocalState('settings:form_layout_v2',  LAYOUT_SEED)
  const [editando, setEditando] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = ENTIDADES.filter(e => !search || e.label.toLowerCase().includes(search.toLowerCase()))

  if (editando) {
    const ent = editando
    const totalFields = fields.filter(f => f.entity === ent.id).length
    const totalSecs   = layout[ent.id]?.sections?.length || 0
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Configuração de Campos', onClick: () => setEditando(null) }]}
        title={`${ent.emoji} ${ent.label}`}
        subtitle={`${totalFields} campo${totalFields !== 1 ? 's' : ''} · ${totalSecs} seção${totalSecs !== 1 ? 'ões' : ''} · Auto-salvo`}
        onSave={() => setEditando(null)}
        saveLabel="Concluir"
        onCancel={() => setEditando(null)}
      >
        <EntityEditor
          entity={ent.id}
          fields={fields}
          setFields={setFields}
          layout={layout}
          setLayout={setLayout}
        />
      </FullPageEdit>
    )
  }

  return (
    <SettingsLayout
      title="Configuração de Campos"
      description="Configure os campos e layout dos formulários de cada entidade do sistema."
      columns={[
        { key: 'label', label: 'Entidade', render: (v, row) => (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{row.emoji}</span>
            <span style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{v}</span>
          </div>
        )},
        { key: 'id', label: 'Campos', width: 110, render: (v) => {
          const n = fields.filter(f => f.entity === v).length
          return <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{n} campo{n !== 1 ? 's' : ''}</span>
        }},
        { key: 'id', label: 'Seções', width: 110, render: (v) => {
          const n = layout[v]?.sections?.length || 0
          return <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{n} seção{n !== 1 ? 'ões' : ''}</span>
        }},
      ]}
      data={filtered}
      keyField="id"
      emptyLabel="Nenhuma entidade encontrada."
      rowActions={[
        { label: 'Editar campos', onClick: row => setEditando(row) },
      ]}
      search={search}
      onSearchChange={setSearch}
    />
  )
}

const cs = {
  overlay:  { position:'fixed', inset:0, background:'rgba(15,23,42,0.52)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:700, padding:20 },
  modal:    { width:'100%', background:'var(--surface)', borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' },
  mhead:    { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)' },
  msub:     { fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 },
  mtitle:   { margin:0, fontSize:17, fontWeight:800, color:'var(--text)' },
  mfoot:    { display:'flex', alignItems:'center', padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface2)', gap:10 },
  closeBtn: { background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, borderRadius:6, lineHeight:1, display:'flex', alignItems:'center' },
  fg:       { display:'flex', flexDirection:'column', gap:6 },
  lbl:      { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' },
  inp:      { padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
  err:      { fontSize:11, color:'var(--red)', fontWeight:600 },
  btnPri:   { padding:'9px 20px', borderRadius:9, border:'none', background:ACCENT, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' },
  btnSec:   { padding:'9px 18px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-soft)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  iconBtn:  { background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'3px', borderRadius:5, display:'flex', alignItems:'center', transition:'color 0.12s' },
  secBtn:   { background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'4px 5px', borderRadius:6, display:'flex', alignItems:'center', transition:'color 0.12s' },
}
