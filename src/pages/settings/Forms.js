/**
 * Configuração de Campos — Form Builder
 * 3 painéis: Biblioteca de campos | Canvas (seções/linhas, drag-drop) | Inspector
 * Auto-save via useLocalState (sem botão Salvar)
 */

import { useState, useMemo, useRef } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useAuditLog } from '../../hooks/useAuditLog'
import { FIELDS_SEED, LAYOUT_SEED } from '../../data/formSeeds'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  Lock, Plus, X, GripVertical, ChevronUp,
  ChevronDown, ChevronRight, Trash2, Check, Search, Copy,
  Type, AlignLeft, Hash, Calendar, ToggleLeft, List, Link2,
  Rows, Layers, SlidersHorizontal,
} from 'lucide-react'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit } from '../../components/ui'

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACCENT = 'var(--accent)'
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

// Tipos agrupados por categoria — biblioteca de campos organizada como em
// Airtable/ClickUp, não uma lista solta.
const TIPO_CATEGORIAS = [
  {
    label: 'Básico',
    tipos: [
      { id: 'text',     label: 'Texto curto', Icon: Type },
      { id: 'textarea', label: 'Texto longo', Icon: AlignLeft },
      { id: 'number',   label: 'Número',      Icon: Hash },
    ],
  },
  {
    label: 'Data & seleção',
    tipos: [
      { id: 'date',    label: 'Data',      Icon: Calendar },
      { id: 'select',  label: 'Lista',     Icon: List },
      { id: 'boolean', label: 'Sim / Não', Icon: ToggleLeft },
    ],
  },
  {
    label: 'Relacionamento',
    tipos: [
      { id: 'lookup', label: 'Referência', Icon: Link2 },
    ],
  },
]
const TIPOS = TIPO_CATEGORIAS.flatMap(c => c.tipos)

const TIPO_META = {
  text:     { color: '#2563EB' },
  textarea: { color: 'var(--accent)' },
  number:   { color: '#059669' },
  date:     { color: '#C2410C' },
  select:   { color: '#86198F' },
  boolean:  { color: '#166534' },
  lookup:   { color: '#0369A1' },
}

// Cadastros disponíveis como referência
const LOOKUP_TARGETS = [
  { id: 'companies',     label: 'Empresas' },
  { id: 'contacts',      label: 'Contatos / Canais' },
  { id: 'products',      label: 'Produtos' },
  { id: 'opportunities', label: 'Oportunidades' },
  { id: 'contracts',     label: 'Contratos' },
  { id: 'sellers',       label: 'Usuários / Vendedores' },
  { id: 'tenant_branches', label: 'Filiais' },
  { id: 'parceiros',       label: 'Parceiros' },
]

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPlacedIds(layout, entity) {
  const secs = layout[entity]?.sections || []
  const ids = new Set()
  secs.forEach(sec => sec.rows.forEach(row => row.forEach(id => { if (id) ids.add(id) })))
  return ids
}

function tipoIcon(tipo) {
  return TIPOS.find(t => t.id === tipo)?.Icon || Type
}

// ─── Ícone de tipo — discreto, sem pílula colorida ────────────────────────────
function TipoIcon({ tipo, size = 12 }) {
  const Icon = tipoIcon(tipo)
  const m = TIPO_META[tipo] || { color: 'var(--text-muted)' }
  return <Icon size={size} color={m.color} strokeWidth={1.75} style={{ flexShrink: 0 }} />
}

// ─── Card arrastável da biblioteca de campos ──────────────────────────────────
function SidebarFieldCard({ field, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar:${field.id}`,
    data: { type: 'sidebar', fieldId: field.id },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{
        padding: '6px 8px', borderRadius: 6, cursor: 'grab', userSelect: 'none',
        border: `1px solid ${isDragOverlay ? ACCENT : 'var(--border)'}`,
        background: isDragOverlay ? 'var(--surface)' : 'var(--surface2)',
        opacity: isDragging && !isDragOverlay ? 0.3 : 1,
        display: 'flex', alignItems: 'center', gap: 7,
        boxShadow: isDragOverlay ? '0 8px 24px rgba(99,102,241,0.15)' : 'none',
        transition: 'opacity 0.12s, border-color 0.12s',
      }}>
      <GripVertical size={11} color="var(--border2)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <TipoIcon tipo={field.field_type} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>
        {field.label}
      </div>
    </div>
  )
}

// ─── Painel esquerdo: biblioteca de campos ────────────────────────────────────
function FieldLibraryPanel({ sidebarFields, onNewField, onDeleteField, selectedId, onSelect }) {
  const { isOver, setNodeRef } = useDroppable({ id: SIDEBAR_ID })
  const [search, setSearch] = useState('')
  const [collapsedCats, setCollapsedCats] = useState(() => new Set())

  const filtered = sidebarFields.filter(f =>
    f.label.toLowerCase().includes(search.toLowerCase())
  )

  // Agrupado por categoria de tipo (a mesma do seletor no Inspector) — sem
  // isso, formulários com 50+ campos customizados viram uma lista solta
  // impossível de escanear.
  const grupos = TIPO_CATEGORIAS
    .map(cat => ({ ...cat, campos: filtered.filter(f => cat.tipos.some(t => t.id === f.field_type)) }))
    .filter(g => g.campos.length > 0)

  function toggleCat(label) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  return (
    <div ref={setNodeRef} style={{
      width: 210, flexShrink: 0, borderRight: '1px solid var(--border)',
      background: isOver ? `${ACCENT}06` : 'var(--surface)',
      display: 'flex', flexDirection: 'column', transition: 'background 0.15s',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
          Biblioteca de campos
        </div>
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

      {isOver && (
        <div style={{ margin: '8px 10px 0', padding: '8px', borderRadius: 8, background: `${ACCENT}12`,
          border: `1.5px dashed ${ACCENT}`, fontSize: 11, fontWeight: 600, color: ACCENT, textAlign: 'center' }}>
          Soltar para remover do formulário
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--border2)', fontStyle: 'italic', textAlign: 'center', marginTop: 16 }}>
            {search ? 'Nenhum resultado' : 'Todos os campos estão no formulário'}
          </div>
        )}
        {grupos.map(g => {
          const isCollapsed = collapsedCats.has(g.label)
          return (
            <div key={g.label}>
              <button onClick={() => toggleCat(g.label)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 2px 5px', fontFamily: 'var(--font)' }}>
                {isCollapsed ? <ChevronRight size={11} color="var(--text-muted)" strokeWidth={2} /> : <ChevronDown size={11} color="var(--text-muted)" strokeWidth={2} />}
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {g.label} <span style={{ fontWeight: 500 }}>({g.campos.length})</span>
                </span>
              </button>
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {g.campos.map(f => (
                    <div key={f.id}
                      onClick={() => onSelect(f)}
                      style={{ display: 'flex', gap: 4, alignItems: 'stretch', cursor: 'pointer',
                        borderRadius: 6, outline: selectedId === f.id ? `2px solid ${ACCENT}` : 'none', outlineOffset: -1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <SidebarFieldCard field={f} />
                      </div>
                      {!f.is_system && (
                        <button onClick={e => { e.stopPropagation(); onDeleteField(f.id) }} title="Excluir campo" style={cs.iconBtn}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                          <Trash2 size={11} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

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
function PlacedFieldCard({ field, slotId, onRemove, onSelect, isSelected, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed:${slotId}`,
    data: { type: 'placed', slotId, fieldId: field.id },
  })
  const [hovered, setHovered] = useState(false)

  return (
    <div ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(field, slotId)}
      style={{
        opacity: isDragging && !isDragOverlay ? 0.2 : 1,
        background: isDragOverlay ? 'var(--surface)' : isSelected ? 'var(--accent-glow)' : hovered ? 'var(--surface)' : '#F8FAFC',
        border: `1.5px solid ${isDragOverlay ? ACCENT : isSelected ? ACCENT : hovered ? 'var(--border-med, var(--border))' : 'var(--border)'}`,
        borderRadius: 8, padding: '7px 10px',
        display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
        boxShadow: isDragOverlay ? `0 8px 24px rgba(99,102,241,0.18)` : isSelected ? `0 0 0 3px ${ACCENT}18` : 'none',
        minWidth: 0, transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}>

      <div style={{ flexShrink: 0, display: 'flex', opacity: hovered ? 1 : 0.5, transition: 'opacity 0.15s' }}>
        {field.is_system
          ? <Lock size={11} color="var(--text-muted)" strokeWidth={1.75} />
          : <span {...attributes} {...listeners} onClick={e => e.stopPropagation()} style={{ display: 'flex', cursor: 'grab' }}>
              <GripVertical size={13} color={hovered ? ACCENT : 'var(--border2)'} strokeWidth={1.75} />
            </span>
        }
      </div>

      <TipoIcon tipo={field.field_type} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontSize: 12, fontWeight: isSelected ? 800 : 600, color: 'var(--text)', wordBreak: 'break-word' }}>
          {field.label}
        </span>
        {field.is_required && (
          <span style={{ color: 'var(--red)', fontSize: 12, fontWeight: 900, lineHeight: 1, flexShrink: 0 }}>*</span>
        )}
      </div>

      <button onClick={e => { e.stopPropagation(); onRemove(slotId) }} title="Remover do formulário" style={cs.iconBtn}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Slot droppável ────────────────────────────────────────────────────────────
function DropSlot({ slotId, field, onRemove, onSelect, selectedSlotId, onAdd }) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot:${slotId}` })
  const isEmpty = !field
  const [hov, setHov] = useState(false)

  return (
    <div ref={setNodeRef} style={{
      flex: 1, minWidth: 0,
      border: `1.5px dashed ${isOver ? ACCENT : isEmpty && hov ? ACCENT : isEmpty ? 'var(--border2)' : 'transparent'}`,
      borderRadius: 7,
      transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
      background: isOver ? `${ACCENT}08` : isEmpty && hov ? `${ACCENT}05` : 'transparent',
      boxShadow: isOver ? `0 0 0 3px ${ACCENT}14` : 'none',
      minHeight: 44,
    }}>
      {isEmpty ? (
        <button
          onClick={onAdd}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: '100%', height: '100%', minHeight: 44, display: 'flex', flexDirection: 'row',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: isOver || hov ? ACCENT : 'var(--border2)',
            userSelect: 'none', padding: '6px 10px',
            transition: 'color 0.15s',
          }}>
          <Plus size={11} color={isOver || hov ? ACCENT : 'var(--border2)'} strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: isOver || hov ? 700 : 400 }}>
            {isOver ? 'Soltar aqui' : 'Campo'}
          </span>
        </button>
      ) : (
        <PlacedFieldCard field={field} slotId={slotId} onRemove={onRemove}
          onSelect={onSelect} isSelected={selectedSlotId === slotId} />
      )}
    </div>
  )
}

// ─── Inspector — painel de propriedades do campo selecionado ─────────────────
function Inspector({ mode, field, entity, allFields, onClose, onSave, onDelete, onDuplicate }) {
  const isEdit = mode === 'edit'
  const [label, setLabel]         = useState(field?.label || '')
  const [key, setKey]             = useState(field?.field_key || '')
  const [tipo, setTipo]           = useState(field?.field_type || 'text')
  const [opts, setOpts]           = useState((field?.options || []).join('\n'))
  const [req, setReq]             = useState(field?.is_required || false)
  const [helpText, setHelpText]   = useState(field?.help_text || '')
  const [lookupTarget, setLookupTarget] = useState(field?.lookup_target || '')
  const [keyManual, setKeyManual] = useState(isEdit)
  const [errs, setErrs]           = useState({})
  const isSystem = !!field?.is_system

  function autoKey(v) {
    return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
  }

  function handleLabel(v) {
    setLabel(v); setErrs(e => ({ ...e, label: null }))
    if (!keyManual) setKey(autoKey(v))
  }

  function validate() {
    const e = {}
    if (!label.trim()) e.label = 'Nome obrigatório'
    if (!key.trim()) e.key = 'Chave obrigatória'
    else if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) e.key = 'Apenas letras minúsculas, números e _'
    else {
      const dup = allFields.find(f => f.field_key === key && f.entity === entity && f.id !== field?.id)
      if (dup) e.key = 'Chave já existe nesta entidade'
    }
    if (tipo === 'lookup' && !lookupTarget) e.lookup = 'Selecione o cadastro de referência'
    return e
  }

  function submit(e) {
    e.preventDefault()
    if (isSystem) return
    const errsFound = validate()
    if (Object.keys(errsFound).length) { setErrs(errsFound); return }
    onSave({
      ...(field || {}),
      entity, label: label.trim(), field_key: key,
      field_type: tipo,
      options: tipo === 'select' ? opts.split('\n').map(o => o.trim()).filter(Boolean) : [],
      lookup_target: tipo === 'lookup' ? lookupTarget : null,
      is_required: req, help_text: helpText.trim(), is_system: false,
    })
  }

  if (mode === 'empty') {
    return (
      <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center' }}>
        <SlidersHorizontal size={22} color="var(--border2)" strokeWidth={1.5} />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Selecione um campo no formulário ou na biblioteca para ver e editar suas propriedades.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <SlidersHorizontal size={13} color="var(--text-muted)" strokeWidth={1.75} />
        <div style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          {isEdit ? 'Propriedades do campo' : 'Novo campo'}
        </div>
        {isEdit && !isSystem && (
          <button type="button" onClick={() => onDuplicate(field)} title="Duplicar campo" style={cs.iconBtn}
            onMouseEnter={e => e.currentTarget.style.color = ACCENT}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <Copy size={13} strokeWidth={1.75} />
          </button>
        )}
        <button type="button" onClick={onClose} title="Fechar" style={cs.iconBtn}>
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>

      {isSystem ? (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)', fontSize: 11.5, color: 'var(--text-muted)' }}>
            <Lock size={12} strokeWidth={1.75} /> Campo do sistema — não pode ser editado ou excluído.
          </div>
          <PropRow label="Nome" value={field.label} />
          <PropRow label="Chave" value={field.field_key} mono />
          <PropRow label="Tipo" value={TIPOS.find(t => t.id === field.field_type)?.label || field.field_type} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cs.fg}>
            <label style={cs.lbl}>Nome do campo *</label>
            <input autoFocus style={{ ...cs.inp, ...(errs.label ? { borderColor: 'var(--red)' } : {}) }}
              value={label} onChange={e => handleLabel(e.target.value)}
              placeholder="Ex: Setor, Score, Data de Assinatura…" />
            {errs.label && <span style={cs.err}>{errs.label}</span>}
          </div>

          <div style={cs.fg}>
            <label style={cs.lbl}>Chave (field_key) *</label>
            <input style={{ ...cs.inp, fontFamily: 'var(--mono)', fontSize: 12, ...(errs.key ? { borderColor: 'var(--red)' } : {}) }}
              value={key}
              onChange={e => { setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setKeyManual(true); setErrs(v => ({ ...v, key: null })) }}
              placeholder="campo_customizado" />
            {errs.key
              ? <span style={cs.err}>{errs.key}</span>
              : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Identificador único — não pode ser alterado depois</span>
            }
          </div>

          <div style={cs.fg}>
            <label style={cs.lbl}>Tipo de campo</label>
            {TIPO_CATEGORIAS.map(cat => (
              <div key={cat.label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                  {cat.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {cat.tipos.map(t => {
                    const m = TIPO_META[t.id] || {}
                    const sel = tipo === t.id
                    const TIcon = t.Icon
                    return (
                      <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                        style={{ padding: '8px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${sel ? (m.color || ACCENT) : 'var(--border)'}`,
                          background: sel ? `${(m.color || ACCENT)}12` : 'var(--surface2)',
                          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.12s' }}>
                        <TIcon size={13} color={sel ? (m.color || ACCENT) : 'var(--text-muted)'} strokeWidth={1.75} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: sel ? (m.color || ACCENT) : 'var(--text)' }}>
                          {t.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {tipo === 'select' && (
            <div style={cs.fg}>
              <label style={cs.lbl}>Opções <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(uma por linha)</span></label>
              <textarea rows={4} style={{ ...cs.inp, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6 }}
                value={opts} onChange={e => setOpts(e.target.value)}
                placeholder={'Opção 1\nOpção 2\nOpção 3'} />
            </div>
          )}

          {tipo === 'lookup' && (
            <div style={cs.fg}>
              <label style={cs.lbl}>Cadastro referenciado *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {LOOKUP_TARGETS.map(t => {
                  const sel = lookupTarget === t.id
                  return (
                    <button key={t.id} type="button" onClick={() => setLookupTarget(t.id)}
                      style={{ padding: '8px 10px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                        border: `1.5px solid ${sel ? '#0369A1' : 'var(--border)'}`,
                        background: sel ? '#E0F2FE' : 'var(--surface2)',
                        display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.12s' }}>
                      <Link2 size={12} color={sel ? '#0369A1' : 'var(--text-muted)'} strokeWidth={1.75} />
                      <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? '#0369A1' : 'var(--text)' }}>
                        {t.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!lookupTarget && <span style={cs.err}>Selecione o cadastro de referência</span>}
            </div>
          )}

          <div style={cs.fg}>
            <label style={cs.lbl}>Texto de ajuda <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <textarea rows={2} style={{ ...cs.inp, resize: 'vertical' }}
              value={helpText} onChange={e => setHelpText(e.target.value)}
              placeholder="Explica o que preencher aqui — aparece abaixo do campo no formulário" />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={req} onChange={e => setReq(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: ACCENT, cursor: 'pointer', marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Campo obrigatório</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>O formulário não pode ser salvo sem este campo preenchido</div>
            </div>
          </label>
        </div>
      )}

      {!isSystem && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {isEdit && (
            <button type="button" onClick={() => onDelete(field.id)} style={{ ...cs.iconBtn, color: 'var(--red)' }} title="Excluir campo">
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="submit" style={cs.btnPri}>{isEdit ? 'Salvar' : 'Criar campo'}</button>
        </div>
      )}
    </form>
  )
}

function PropRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</div>
    </div>
  )
}

// ─── Confirm delete ────────────────────────────────────────────────────────────
function ConfirmDeleteModal({ onClose, onConfirm }) {
  return (
    <div style={cs.overlay} onClick={onClose}>
      <div style={{ ...cs.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={cs.mhead}>
          <h2 style={{ ...cs.mtitle, color: 'var(--red)' }}>Excluir campo</h2>
          <button onClick={onClose} style={cs.closeBtn}><X size={16} /></button>
        </div>
        <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6 }}>
            O campo será removido permanentemente. Dados já salvos em registros existentes não serão apagados.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button style={cs.btnSec} onClick={onClose}>Cancelar</button>
            <button style={{ ...cs.btnPri, background: 'var(--red)' }} onClick={onConfirm}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Editor interno (3 colunas: biblioteca | canvas | inspector) ──────────────
function EntityEditor({ entity, fields, setFields, layout, setLayout }) {
  const [selected,    setSelected]    = useState(null) // { field, slotId? } ou null
  const [pendingSlot, setPendingSlot] = useState(null)
  const [creating,    setCreating]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [activeDrag,  setActiveDrag]  = useState(null)
  const [savedFlash,  setSavedFlash]  = useState(false)
  const [collapsed,   setCollapsed]   = useState(() => new Set())
  const [canvasSearch, setCanvasSearch] = useState('')
  const flashTimer = useRef(null)
  const { registrar: log } = useAuditLog()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const entityFields  = useMemo(() => fields.filter(f => f.entity === entity), [fields, entity])
  const fieldById     = useMemo(() => Object.fromEntries(fields.map(f => [f.id, f])), [fields])
  const placedIds     = useMemo(() => getPlacedIds(layout, entity), [layout, entity])
  const sidebarFields = useMemo(() => entityFields.filter(f => !placedIds.has(f.id)), [entityFields, placedIds])
  const sections      = layout[entity]?.sections || []

  const q = canvasSearch.trim().toLowerCase()
  function sectionMatches(sec) {
    if (!q) return true
    if (sec.label.toLowerCase().includes(q)) return true
    return sec.rows.some(row => row.some(id => fieldById[id]?.label.toLowerCase().includes(q)))
  }
  const visibleSections = sections.filter(sectionMatches)

  function flashSaved() {
    clearTimeout(flashTimer.current)
    setSavedFlash(true)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800)
  }

  // ── Helpers de layout ──────────────────────────────────────────────────────
  function updateLayout(fn) {
    setLayout(prev => {
      const next = { ...prev }
      next[entity] = { ...prev[entity], sections: fn([...(prev[entity]?.sections || [])]) }
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
      rows: sec.rows.map(row => row.map(id => id === fieldId ? null : id)),
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
      { id: `sec_${uid()}`, label: 'Nova seção', rows: [[null, null]] },
    ])
  }

  function renameSection(secId, name) {
    updateLayout(secs => secs.map(s => s.id === secId ? { ...s, label: name } : s))
  }

  function deleteSection(secId) {
    updateLayout(secs => secs.filter(s => s.id !== secId))
  }

  function duplicateSection(secId) {
    updateLayout(secs => {
      const sec = secs.find(s => s.id === secId)
      if (!sec) return secs
      const idx = secs.findIndex(s => s.id === secId)
      const clone = {
        id: `sec_${uid()}`,
        label: `${sec.label} (cópia)`,
        // Duplica a estrutura (linhas/colunas), não os campos — evita o mesmo
        // campo aparecer em dois lugares do formulário ao mesmo tempo.
        rows: sec.rows.map(row => row.map(() => null)),
      }
      const next = [...secs]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }

  function moveSection(secId, dir) {
    updateLayout(secs => {
      const i = secs.findIndex(s => s.id === secId)
      if (i + dir < 0 || i + dir >= secs.length) return secs
      const next = [...secs]
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
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
    setSelected(sel => sel?.slotId === slotId ? null : sel)
  }

  function toggleCollapse(secId) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(secId) ? next.delete(secId) : next.add(secId)
      return next
    })
  }
  function collapseAll() { setCollapsed(new Set(sections.map(s => s.id))) }
  function expandAll() { setCollapsed(new Set()) }

  // ── CRUD de campos ─────────────────────────────────────────────────────────
  function syncCustomFieldsStore(entryFn) {
    try {
      const metaKey = `entity_custom_fields:${entity}`
      const prev = JSON.parse(localStorage.getItem(metaKey) || '[]')
      localStorage.setItem(metaKey, JSON.stringify(entryFn(prev)))
    } catch {}
  }

  function handleSaveField(data) {
    const isEdit = data.id && fields.some(f => f.id === data.id)
    if (isEdit) {
      setFields(prev => prev.map(f => f.id === data.id ? { ...f, ...data } : f))
      syncCustomFieldsStore(prev => {
        const entry = { id: data.id, field_key: data.field_key, label: data.label, field_type: data.field_type, options: data.options || [], is_required: data.is_required || false, help_text: data.help_text || '' }
        return prev.map(f => f.id === data.id ? entry : f)
      })
      log('editar', 'config_campo', data.id, { descricao: `Campo editado: ${data.label} (${entity})` })
      setSelected({ field: { ...data } })
    } else {
      const newId = `cf_${uid()}`
      const newField = { ...data, id: newId }
      setFields(prev => [...prev, newField])
      syncCustomFieldsStore(prev => {
        const entry = { id: newId, field_key: data.field_key, label: data.label, field_type: data.field_type, options: data.options || [], is_required: data.is_required || false, help_text: data.help_text || '' }
        return [...prev, entry]
      })
      if (pendingSlot) {
        updateLayout(secs => setSlotValue(secs, pendingSlot, newId))
      }
      log('criar', 'config_campo', newId, { descricao: `Campo criado: ${data.label} (${entity})` })
      setSelected({ field: newField, slotId: pendingSlot || undefined })
    }
    setCreating(false)
    setPendingSlot(null)
    flashSaved()
  }

  function handleDeleteField(id) {
    const field = fields.find(f => f.id === id)
    setFields(prev => prev.filter(f => f.id !== id))
    updateLayout(secs => removeFieldFromLayout(secs, id))
    syncCustomFieldsStore(prev => prev.filter(f => f.id !== id))
    log('excluir', 'config_campo', id, { descricao: `Campo excluído: ${field?.label || id} (${entity})` })
    setConfirmDel(null)
    setSelected(sel => sel?.field?.id === id ? null : sel)
  }

  function handleDuplicateField(field) {
    const newId = `cf_${uid()}`
    let label = `${field.label} (cópia)`
    let field_key = `${field.field_key}_copia`
    // Evita colisão de chave se duplicar mais de uma vez
    let n = 2
    while (fields.some(f => f.entity === entity && f.field_key === field_key)) {
      field_key = `${field.field_key}_copia_${n}`; n++
    }
    const newField = { ...field, id: newId, label, field_key, is_required: false, is_system: false }
    setFields(prev => [...prev, newField])
    syncCustomFieldsStore(prev => [...prev, { id: newId, field_key, label, field_type: field.field_type, options: field.options || [], is_required: false, help_text: field.help_text || '' }])
    log('criar', 'config_campo', newId, { descricao: `Campo duplicado: ${label} (${entity})` })
    flashSaved()
    setSelected({ field: newField })
  }

  const overlayField = useMemo(() => {
    if (!activeDrag) return null
    return fieldById[activeDrag.fieldId] || null
  }, [activeDrag, fieldById])

  const totalFields = entityFields.length
  const totalSecs   = sections.length

  // Inspector: prioriza campo em criação > campo selecionado > vazio
  const inspectorMode  = creating ? 'new' : selected ? 'edit' : 'empty'
  const inspectorField = creating ? null : selected?.field

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* ── Sub-toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Layers size={12} strokeWidth={1.75} /> {totalSecs} seç{totalSecs !== 1 ? 'ões' : 'ão'}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Rows size={12} strokeWidth={1.75} /> {totalFields} campo{totalFields !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ position: 'relative', width: 200 }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} strokeWidth={1.75} />
          <input
            value={canvasSearch} onChange={e => setCanvasSearch(e.target.value)}
            placeholder="Buscar no formulário…"
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 26, paddingRight: 8,
              paddingTop: 5, paddingBottom: 5, fontSize: 11.5, borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' }}
          />
        </div>

        <button onClick={collapseAll} style={cs.textBtn}>Colapsar tudo</button>
        <button onClick={expandAll} style={cs.textBtn}>Expandir tudo</button>

        <div style={{ flex: 1 }} />

        {savedFlash && (
          <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, animation: 'fadeIn 0.2s ease' }}>
            <Check size={13} color="var(--green)" strokeWidth={2.5} /> Salvo
          </span>
        )}
      </div>

      {/* ── Layout 3 colunas ── */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, height: '100%' }}>

          {/* ═══ Coluna 1: Biblioteca de campos ═══ */}
          <FieldLibraryPanel
            sidebarFields={sidebarFields}
            onNewField={() => { setCreating(true); setSelected(null) }}
            onDeleteField={id => setConfirmDel(id)}
            selectedId={!creating ? selected?.field?.id : null}
            onSelect={f => { setSelected({ field: f }); setCreating(false) }}
          />

          {/* ═══ Coluna 2: Canvas ═══ */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 48px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface2)' }}>

            {visibleSections.map((sec, secIdx) => {
              const isCollapsed = collapsed.has(sec.id)
              const fieldCount = sec.rows.reduce((n, row) => n + row.filter(Boolean).length, 0)
              return (
                <div key={sec.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  {/* Cabeçalho da seção */}
                  <SectionHeader
                    sec={sec} secIdx={secIdx} total={sections.length}
                    isCollapsed={isCollapsed} fieldCount={fieldCount}
                    onToggleCollapse={() => toggleCollapse(sec.id)}
                    onRename={name => renameSection(sec.id, name)}
                    onMoveUp={() => moveSection(sec.id, -1)}
                    onMoveDown={() => moveSection(sec.id, 1)}
                    onDuplicate={() => duplicateSection(sec.id)}
                    onDelete={() => deleteSection(sec.id)}
                  />

                  {/* Grid de slots */}
                  {!isCollapsed && (
                    <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sec.rows.map((row, rowIdx) => (
                        <div key={rowIdx} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                          <DropSlot
                            slotId={`${sec.id}:${rowIdx}:0`}
                            field={fieldById[row[0]] || null}
                            onRemove={handleRemoveFromSlot}
                            onSelect={(f, slotId) => { setSelected({ field: f, slotId }); setCreating(false) }}
                            selectedSlotId={!creating ? selected?.slotId : null}
                            onAdd={() => { setPendingSlot(`${sec.id}:${rowIdx}:0`); setCreating(true); setSelected(null) }}
                          />
                          <DropSlot
                            slotId={`${sec.id}:${rowIdx}:1`}
                            field={fieldById[row[1]] || null}
                            onRemove={handleRemoveFromSlot}
                            onSelect={(f, slotId) => { setSelected({ field: f, slotId }); setCreating(false) }}
                            selectedSlotId={!creating ? selected?.slotId : null}
                            onAdd={() => { setPendingSlot(`${sec.id}:${rowIdx}:1`); setCreating(true); setSelected(null) }}
                          />
                          <button onClick={() => removeRow(sec.id, rowIdx)}
                            title="Remover linha"
                            style={{ ...cs.secBtn, flexShrink: 0, alignSelf: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                            <X size={12} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addRow(sec.id)}
                        style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, color: ACCENT,
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                          fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus size={12} strokeWidth={2} /> Adicionar linha
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {q && visibleSections.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>
                Nenhuma seção ou campo encontrado para "{canvasSearch}"
              </div>
            )}

            <button onClick={addSection} style={{
              width: '100%', padding: '9px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px dashed ${ACCENT}`, background: 'var(--accent-glow)',
              color: ACCENT, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
            }}>
              <Plus size={13} strokeWidth={2} /> Adicionar seção
            </button>
          </div>

          {/* ═══ Coluna 3: Inspector ═══ */}
          <Inspector
            mode={inspectorMode}
            field={inspectorField}
            entity={entity}
            allFields={fields}
            onClose={() => { setSelected(null); setCreating(false); setPendingSlot(null) }}
            onSave={handleSaveField}
            onDelete={id => setConfirmDel(id)}
            onDuplicate={handleDuplicateField}
          />
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
              onRemove={() => {}} onSelect={() => {}} isSelected={false}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {confirmDel && (
        <ConfirmDeleteModal
          onClose={() => setConfirmDel(null)}
          onConfirm={() => handleDeleteField(confirmDel)}
        />
      )}
    </div>
  )
}

// ─── Cabeçalho de seção — nome editável inline, ações discretas ──────────────
function SectionHeader({ sec, secIdx, total, isCollapsed, fieldCount, onToggleCollapse, onRename, onMoveUp, onMoveDown, onDuplicate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(sec.label)

  function commit() {
    setEditing(false)
    if (name.trim() && name.trim() !== sec.label) onRename(name.trim())
    else setName(sec.label)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
      background: 'var(--surface2)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
    }}>
      <button onClick={onToggleCollapse} style={{ ...cs.secBtn, padding: 2 }} title={isCollapsed ? 'Expandir' : 'Colapsar'}>
        {isCollapsed ? <ChevronRight size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
      </button>
      <div style={{ width: 3, height: 12, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />

      {editing ? (
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(sec.label); setEditing(false) } }}
          style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text)', border: `1px solid ${ACCENT}`, borderRadius: 5, padding: '2px 6px', fontFamily: 'var(--font)', outline: 'none' }} />
      ) : (
        <span onClick={() => setEditing(true)} title="Clique para renomear"
          style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.1px', cursor: 'text' }}>
          {sec.label} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({fieldCount})</span>
        </span>
      )}

      <button onClick={onDuplicate} title="Duplicar seção" style={cs.secBtn}>
        <Copy size={12} strokeWidth={1.75} />
      </button>
      <button onClick={onMoveUp} disabled={secIdx === 0} title="Mover para cima"
        style={{ ...cs.secBtn, opacity: secIdx === 0 ? 0.3 : 1 }}>
        <ChevronUp size={13} strokeWidth={2} />
      </button>
      <button onClick={onMoveDown} disabled={secIdx === total - 1} title="Mover para baixo"
        style={{ ...cs.secBtn, opacity: secIdx === total - 1 ? 0.3 : 1 }}>
        <ChevronDown size={13} strokeWidth={2} />
      </button>
      <button onClick={onDelete} title="Excluir seção" style={cs.secBtn}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
        <Trash2 size={12} strokeWidth={1.75} />
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsForms() {
  const [fields,  setFields]  = useLocalState('settings:form_fields_v5',  FIELDS_SEED)
  const [layout,  setLayout]  = useLocalState('settings:form_layout_v5',  LAYOUT_SEED)
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
        title={ent.label}
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
      modulo="forms"
      title="Configuração de Campos"
      description="Configure os campos e layout dos formulários de cada entidade do sistema."
      columns={[
        { key: 'label', label: 'Entidade', render: (v) => (
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{v}</span>
        ) },
        { key: 'id', label: 'Campos', width: 110, render: (v) => {
          const n = fields.filter(f => f.entity === v).length
          return <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{n} campo{n !== 1 ? 's' : ''}</span>
        } },
        { key: 'id', label: 'Seções', width: 110, render: (v) => {
          const n = layout[v]?.sections?.length || 0
          return <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{n} seção{n !== 1 ? 'ões' : ''}</span>
        } },
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
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.52)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 20 },
  modal:    { width: '100%', background: 'var(--surface)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' },
  mhead:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' },
  mtitle:   { margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, lineHeight: 1, display: 'flex', alignItems: 'center' },
  fg:       { display: 'flex', flexDirection: 'column', gap: 6 },
  lbl:      { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' },
  inp:      { padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  err:      { fontSize: 11, color: 'var(--red)', fontWeight: 600 },
  btnPri:   { padding: '9px 20px', borderRadius: 9, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' },
  btnSec:   { padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  iconBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '3px', borderRadius: 5, display: 'flex', alignItems: 'center', transition: 'color 0.12s' },
  secBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 5px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.12s' },
  textBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font)' },
}
