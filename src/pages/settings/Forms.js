/**
 * Configuração de Campos — Layout Editor
 * Benchmark: Zoho CRM Layout Editor
 *
 * Modelo de dados (localStorage):
 *   settings:form_fields_v2   → definições dos campos (id, label, tipo, etc.)
 *   settings:form_layout_v2   → layout por entidade: seções com slots 2 colunas
 *
 * Drag-and-drop via dnd-kit:
 *   – Arraste da sidebar (campos disponíveis) para um slot do formulário
 *   – Arraste entre slots para reposicionar
 *   – Arraste de volta para a sidebar para remover do layout
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  Lock, Plus, X, Pencil, GripVertical, ChevronUp,
  ChevronDown, Settings, Columns, AlignLeft, Hash,
  Calendar, ToggleLeft, List, Type, Trash2, Check,
} from 'lucide-react'

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACCENT = '#6366F1'
const SIDEBAR_ID = '__sidebar__'

const ENTIDADES = [
  { id: 'companies',     label: 'Empresas',       emoji: '🏢' },
  { id: 'opportunities', label: 'Oportunidades',  emoji: '📈' },
  { id: 'projects',      label: 'Projetos',       emoji: '🗂' },
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

// ─── Seeds ────────────────────────────────────────────────────────────────────
const FIELDS_SEED = [
  // ── Empresas (field_key bate com EMPTY_FORM em Empresas.js) ──────────────
  { id:'sf_co_razao',    entity:'companies', field_key:'razao',              label:'Razão Social',          field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_co_cnpj',     entity:'companies', field_key:'cnpj',               label:'CNPJ',                  field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_co_fantasia', entity:'companies', field_key:'fantasia',           label:'Nome Fantasia',          field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_tipo',     entity:'companies', field_key:'tipo',               label:'Tipo',                  field_type:'select',   options:['cliente_final','canal','distribuidor','parceiro','isv'], is_required:false, is_system:true  },
  { id:'sf_co_status',   entity:'companies', field_key:'status',             label:'Status',                field_type:'select',   options:['negociacao','ativo','inativo','prospecto'], is_required:false, is_system:true  },
  { id:'sf_co_segmento', entity:'companies', field_key:'segmento',           label:'Segmento',              field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_cnae',     entity:'companies', field_key:'cnae_codigo',        label:'CNAE',                  field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_co_ie',       entity:'companies', field_key:'inscricao_estadual', label:'Inscrição Estadual',    field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_email',    entity:'companies', field_key:'email',              label:'E-mail',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_telefone', entity:'companies', field_key:'telefone',           label:'Telefone',              field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_site',     entity:'companies', field_key:'site',               label:'Site',                  field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_origem',   entity:'companies', field_key:'origem',             label:'Origem',                field_type:'select',   options:['Inbound','Outbound','Indicação','Evento','Parceiro'], is_required:false, is_system:false },
  { id:'sf_co_resp',     entity:'companies', field_key:'responsavel',        label:'Responsável',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_cep',      entity:'companies', field_key:'cep',                label:'CEP',                   field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_logr',     entity:'companies', field_key:'logradouro',         label:'Logradouro',            field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_num',      entity:'companies', field_key:'numero',             label:'Número',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_compl',    entity:'companies', field_key:'complemento',        label:'Complemento',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_bairro',   entity:'companies', field_key:'bairro',             label:'Bairro',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_cidade',   entity:'companies', field_key:'cidade',             label:'Cidade',                field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_uf',       entity:'companies', field_key:'uf',                 label:'UF',                    field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_co_obs',      entity:'companies', field_key:'observacoes',        label:'Observações',           field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Oportunidades (field_key bate com EMPTY_OPP em Pipeline.js) ──────────
  { id:'sf_op_titulo',   entity:'opportunities', field_key:'titulo',               label:'Título',                field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_op_empresa',  entity:'opportunities', field_key:'empresa_id',           label:'Empresa',               field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_op_contato',  entity:'opportunities', field_key:'primary_contact_id',   label:'Contato Principal',     field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_op_situacao', entity:'opportunities', field_key:'situacao',             label:'Situação',              field_type:'select',   options:['em_andamento','ganha','perdida'], is_required:false, is_system:true  },
  { id:'sf_op_etapa',    entity:'opportunities', field_key:'etapa_id',             label:'Etapa do Funil',        field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_op_resp',     entity:'opportunities', field_key:'responsavel',          label:'Responsável',           field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_op_origem',   entity:'opportunities', field_key:'origem',               label:'Origem',                field_type:'select',   options:['Inbound','Outbound','Canal','Indicação','Evento'], is_required:false, is_system:false },
  { id:'sf_op_campanha', entity:'opportunities', field_key:'campanha_id',          label:'Campanha',              field_type:'select',   options:[], is_required:false, is_system:false },
  { id:'sf_op_prazo',    entity:'opportunities', field_key:'prazo',                label:'Prazo de Fechamento',   field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_op_playbook', entity:'opportunities', field_key:'playbook_id',          label:'Playbook',              field_type:'select',   options:[], is_required:false, is_system:false },
  { id:'sf_op_cdu',      entity:'opportunities', field_key:'valor_cdu',            label:'Valor CDU',             field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_sms',      entity:'opportunities', field_key:'valor_sms',            label:'Valor SMS',             field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_servico',  entity:'opportunities', field_key:'valor_servico',        label:'Valor Serviço',         field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_desconto', entity:'opportunities', field_key:'valor_desconto',       label:'Desconto',              field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_op_tipo_imp', entity:'opportunities', field_key:'tipo_implantacao',     label:'Tipo de Implantação',   field_type:'select',   options:['Padrão','Customizada','Expressa'], is_required:false, is_system:false },
  { id:'sf_op_segindu',  entity:'opportunities', field_key:'segmento_industria',   label:'Segmento / Indústria',  field_type:'text',     options:[], is_required:false, is_system:false },
  { id:'sf_op_integ',    entity:'opportunities', field_key:'exige_integracao',     label:'Exige Integração',      field_type:'boolean',  options:[], is_required:false, is_system:false },
  { id:'sf_op_motivo',   entity:'opportunities', field_key:'motivo_perda',         label:'Motivo de Perda',       field_type:'textarea', options:[], is_required:false, is_system:false },
  { id:'sf_op_desc',     entity:'opportunities', field_key:'descricao',            label:'Observações',           field_type:'textarea', options:[], is_required:false, is_system:false },

  // ── Projetos (field_key bate com EMPTY_FORM em Projetos.js) ──────────────
  { id:'sf_pr_nome',     entity:'projects', field_key:'name',                 label:'Nome do Projeto',       field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pr_empresa',  entity:'projects', field_key:'company_nome',         label:'Empresa',               field_type:'text',     options:[], is_required:true,  is_system:true  },
  { id:'sf_pr_franquia', entity:'projects', field_key:'franchise_nome',       label:'Franquia',              field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_pr_fase',     entity:'projects', field_key:'phase',                label:'Fase',                  field_type:'select',   options:['iniciacao','planejamento','execucao','monitoramento','encerramento'], is_required:true, is_system:true },
  { id:'sf_pr_status',   entity:'projects', field_key:'status',               label:'Status',                field_type:'select',   options:['em_andamento','pausado','concluido','cancelado'], is_required:false, is_system:true  },
  { id:'sf_pr_opp',      entity:'projects', field_key:'opportunity_id',       label:'Oportunidade de Origem',field_type:'text',     options:[], is_required:false, is_system:true  },
  { id:'sf_pr_inicio',   entity:'projects', field_key:'start_date',           label:'Data de Início',        field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_pr_fim',      entity:'projects', field_key:'end_date_estimated',   label:'Previsão de Término',   field_type:'date',     options:[], is_required:false, is_system:false },
  { id:'sf_pr_hest',     entity:'projects', field_key:'total_hours_estimated',label:'Horas Estimadas',       field_type:'number',   options:[], is_required:false, is_system:false },
  { id:'sf_pr_hexec',    entity:'projects', field_key:'total_hours_executed', label:'Horas Executadas',      field_type:'number',   options:[], is_required:false, is_system:true  },
  { id:'sf_pr_desc',     entity:'projects', field_key:'notes',                label:'Observações',           field_type:'textarea', options:[], is_required:false, is_system:false },
]

// Layout inicial
const LAYOUT_SEED = {
  companies: {
    sections: [
      {
        id: 'sec_co_1', label: 'Identificação',
        rows: [
          ['sf_co_razao',    'sf_co_fantasia'],
          ['sf_co_cnpj',     'sf_co_ie'],
          ['sf_co_tipo',     'sf_co_status'],
          ['sf_co_segmento', 'sf_co_cnae'],
        ],
      },
      {
        id: 'sec_co_2', label: 'Contato',
        rows: [
          ['sf_co_email',    'sf_co_telefone'],
          ['sf_co_site',     'sf_co_origem'],
          ['sf_co_resp',     null],
        ],
      },
      {
        id: 'sec_co_3', label: 'Endereço',
        rows: [
          ['sf_co_cep',    'sf_co_logr'],
          ['sf_co_num',    'sf_co_compl'],
          ['sf_co_bairro', 'sf_co_cidade'],
          ['sf_co_uf',     null],
        ],
      },
      {
        id: 'sec_co_4', label: 'Observações',
        rows: [
          ['sf_co_obs', null],
        ],
      },
    ],
  },
  opportunities: {
    sections: [
      {
        id: 'sec_op_1', label: 'Identificação',
        rows: [
          ['sf_op_titulo',   'sf_op_empresa'],
          ['sf_op_contato',  'sf_op_resp'],
          ['sf_op_situacao', 'sf_op_etapa'],
          ['sf_op_origem',   'sf_op_campanha'],
          ['sf_op_prazo',    'sf_op_playbook'],
        ],
      },
      {
        id: 'sec_op_2', label: 'Valores',
        rows: [
          ['sf_op_cdu',      'sf_op_sms'],
          ['sf_op_servico',  'sf_op_desconto'],
        ],
      },
      {
        id: 'sec_op_3', label: 'Detalhes',
        rows: [
          ['sf_op_tipo_imp', 'sf_op_segindu'],
          ['sf_op_integ',    null],
          ['sf_op_desc',     null],
          ['sf_op_motivo',   null],
        ],
      },
    ],
  },
  projects: {
    sections: [
      {
        id: 'sec_pr_1', label: 'Identificação',
        rows: [
          ['sf_pr_nome',    'sf_pr_empresa'],
          ['sf_pr_franquia','sf_pr_opp'],
          ['sf_pr_fase',    'sf_pr_status'],
        ],
      },
      {
        id: 'sec_pr_2', label: 'Cronograma',
        rows: [
          ['sf_pr_inicio', 'sf_pr_fim'],
          ['sf_pr_hest',   'sf_pr_hexec'],
        ],
      },
      {
        id: 'sec_pr_3', label: 'Observações',
        rows: [
          ['sf_pr_desc', null],
        ],
      },
    ],
  },
}

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

// ─── Slot arrastável (campo dentro do layout) ─────────────────────────────────
function PlacedFieldCard({ field, slotId, onRemove, onEdit, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `placed:${slotId}`,
    data: { type: 'placed', slotId, fieldId: field.id },
    disabled: field.is_system,
  })
  const [hovered, setHovered] = useState(false)

  return (
    <div ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: isDragging && !isDragOverlay ? 0.2 : 1,
        background: isDragOverlay ? 'var(--surface)' : hovered ? 'var(--surface)' : '#F8FAFC',
        border: `1.5px solid ${isDragOverlay ? ACCENT : hovered && !field.is_system ? ACCENT : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 9,
        boxShadow: isDragOverlay
          ? `0 8px 24px rgba(99,102,241,0.18)`
          : hovered && !field.is_system ? `0 0 0 3px ${ACCENT}18` : 'none',
        cursor: field.is_system ? 'default' : isDragging ? 'grabbing' : 'grab',
        minWidth: 0, transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}>

      {/* Grip / Lock */}
      <div style={{ flexShrink: 0, display: 'flex', opacity: hovered ? 1 : 0.4, transition: 'opacity 0.15s' }}>
        {field.is_system
          ? <Lock size={11} color="var(--text-muted)" strokeWidth={1.75} />
          : <span {...attributes} {...listeners} style={{ display:'flex', cursor:'grab' }}>
              <GripVertical size={13} color={hovered ? ACCENT : 'var(--border2)'} strokeWidth={1.75} />
            </span>
        }
      </div>

      {/* Info */}
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

      {/* Ações */}
      {!field.is_system && (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={() => onEdit(field)} title="Editar" style={cs.iconBtn}
            onMouseEnter={e => e.currentTarget.style.color = ACCENT}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <Pencil size={11} strokeWidth={1.75} />
          </button>
          <button onClick={() => onRemove(slotId)} title="Remover do formulário" style={cs.iconBtn}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={11} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Slot droppável (vazio ou ocupado) ────────────────────────────────────────
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
        <PlacedFieldCard
          field={field}
          slotId={slotId}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      )}
    </div>
  )
}

// ─── Card arrastável da sidebar ───────────────────────────────────────────────
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

            {/* Label */}
            <div style={cs.fg}>
              <label style={cs.lbl}>Nome do campo *</label>
              <input autoFocus style={{ ...cs.inp, ...(errs.label?{borderColor:'var(--red)'}:{}) }}
                value={label} onChange={e => handleLabel(e.target.value)}
                placeholder="Ex: Setor, Score, Data de Assinatura…" />
              {errs.label && <span style={cs.err}>{errs.label}</span>}
            </div>

            {/* Chave */}
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

            {/* Tipo */}
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

            {/* Opções lista */}
            {tipo === 'select' && (
              <div style={cs.fg}>
                <label style={cs.lbl}>Opções <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(uma por linha)</span></label>
                <textarea rows={4} style={{ ...cs.inp, resize:'vertical', fontFamily:'var(--mono)', fontSize:12, lineHeight:1.6 }}
                  value={opts} onChange={e => setOpts(e.target.value)}
                  placeholder={'Opção 1\nOpção 2\nOpção 3'} />
              </div>
            )}

            {/* Obrigatório */}
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

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsForms() {
  const [fields,  setFields]  = useLocalState('settings:form_fields_v2',  FIELDS_SEED)
  const [layout,  setLayout]  = useLocalState('settings:form_layout_v2',  LAYOUT_SEED)
  const [entity,  setEntity]  = useState('companies')
  const [fieldModal, setFieldModal] = useState(null)       // null | 'new' | field obj
  const [secModal,   setSecModal]   = useState(null)       // null | { secId } | 'new'
  const [confirmDel, setConfirmDel] = useState(null)       // fieldId to delete
  const [activeId,    setActiveId]   = useState(null)
  const [activeDrag,  setActiveDrag] = useState(null)
  const [pendingSlot, setPendingSlot] = useState(null)
  const [dirty,       setDirty]      = useState(false)
  const [toast,       setToast]      = useState(null)      // { msg, type }
  const toastTimer = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Campos desta entidade
  const entityFields = useMemo(() => fields.filter(f => f.entity === entity), [fields, entity])
  const fieldById    = useMemo(() => Object.fromEntries(fields.map(f => [f.id, f])), [fields])

  // Campos NÃO colocados no layout atual
  const placedIds    = useMemo(() => getPlacedIds(layout, entity), [layout, entity])
  const sidebarFields = useMemo(() => entityFields.filter(f => !placedIds.has(f.id)), [entityFields, placedIds])

  const sections = layout[entity]?.sections || []

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  function handleSave() {
    setDirty(false)
    showToast('Configuração de campos salva com sucesso!')
  }

  // ── Helpers de layout ──────────────────────────────────────────────────────
  function updateLayout(fn) {
    setDirty(true)
    setLayout(prev => {
      const next = { ...prev }
      next[entity] = { ...prev[entity], sections: fn([...(prev[entity]?.sections||[])]) }
      return next
    })
  }

  // Converte slotId "secId:rowIdx:col" → { secIdx, rowIdx, col }
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

  // ── DnD handlers ──────────────────────────────────────────────────────────
  function onDragStart({ active }) {
    setActiveId(active.id)
    setActiveDrag(active.data.current)
  }

  function onDragEnd({ active, over }) {
    setActiveId(null); setActiveDrag(null)
    if (!over) return

    const aData  = active.data.current
    const overId = over.id // "slot:secId:rowIdx:col" | "__sidebar__"

    if (!overId.startsWith('slot:')) return
    const targetSlotId = overId.replace('slot:', '')

    updateLayout(secs => {
      let next = [...secs]

      if (aData.type === 'sidebar') {
        // sidebar → slot: colocar campo no slot (swap se ocupado)
        const existing = getSlotValue(next, targetSlotId)
        next = setSlotValue(next, targetSlotId, aData.fieldId)
        // se havia campo, volta para a sidebar (basta deixar null o slot de origem — já está)
        // mas se existing estava em outro slot não precisamos fazer nada, só neste caso remove
        return next
      }

      if (aData.type === 'placed') {
        // slot → slot: swap
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

  // ── Remover campo do layout (botão X no card) ─────────────────────────────
  function handleRemoveFromSlot(slotId) {
    updateLayout(secs => setSlotValue(secs, slotId, null))
  }

  // ── CRUD de campos ─────────────────────────────────────────────────────────
  function handleSaveField(data) {
    setDirty(true)
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
  }

  function handleDeleteField(id) {
    setDirty(true)
    setFields(prev => prev.filter(f => f.id !== id))
    // Remover do layout também
    updateLayout(secs => removeFieldFromLayout(secs, id))
    setConfirmDel(null)
  }

  // Campo sendo arrastado para overlay
  const overlayField = useMemo(() => {
    if (!activeDrag) return null
    return fieldById[activeDrag.fieldId] || null
  }, [activeDrag, fieldById])

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100%' }}>

      {/* ── Header ── */}
      <div style={pg.header}>
        <div>
          <h2 style={pg.title}>Configuração de Campos</h2>
          <p style={pg.desc}>
            Personalize o layout dos formulários de cadastro. Arraste campos para posicioná-los, crie seções e adicione campos customizados.
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {dirty && (
            <span style={{ fontSize:12, color:'var(--yellow)', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--yellow)', display:'inline-block' }}/>
              Alterações não salvas
            </span>
          )}
          <button style={pg.btnNew} onClick={() => setFieldModal('new')}>
            <Plus size={14} strokeWidth={2} style={{ marginRight:5 }} />
            Novo campo
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'8px 18px', borderRadius:8, border:'none', cursor: dirty ? 'pointer' : 'default',
              background: dirty ? ACCENT : 'var(--surface3)',
              color: dirty ? '#fff' : 'var(--text-muted)',
              fontSize:13, fontWeight:700, fontFamily:'var(--font)',
              transition:'background 0.15s, color 0.15s',
              opacity: dirty ? 1 : 0.6,
            }}>
            <Check size={13} strokeWidth={2.5} />
            Salvar
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, display:'flex', alignItems:'center', gap:10, padding:'11px 18px', borderRadius:10, background:'#F0FDF4', border:'1px solid #BBF7D0', boxShadow:'0 4px 16px rgba(0,0,0,0.1)', fontSize:13, fontWeight:500, color:'#065F46', animation:'fadeInUp 0.2s ease' }}>
          <Check size={15} strokeWidth={2.5} color="#10B981"/>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Abas de entidade ── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', padding:'0 28px', flexShrink:0 }}>
        {ENTIDADES.map(e => (
          <button key={e.id} type="button" onClick={() => setEntity(e.id)}
            style={{ padding:'10px 18px', background:'none', border:'none',
              borderBottom:`2px solid ${entity===e.id ? ACCENT : 'transparent'}`,
              color: entity===e.id ? ACCENT : 'var(--text-muted)',
              fontSize:13, fontWeight: entity===e.id ? 700 : 500,
              cursor:'pointer', fontFamily:'var(--font)', marginBottom:-1, transition:'all 0.12s' }}>
            {e.emoji} {e.label}
          </button>
        ))}
      </div>

      {/* ── Layout principal: sidebar + editor ── */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0, height:'100%' }}>

          {/* ════ Área do editor ════ */}
          <div style={{ flex:1, overflowY:'auto', padding:'36px 40px 72px', display:'flex', flexDirection:'column', gap:40, background:'var(--surface2)' }}>

            {sections.map((sec, secIdx) => (
              <div key={sec.id} style={{
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:14, overflow:'hidden',
                boxShadow:'0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
              }}>
                {/* Cabeçalho da seção */}
                <div style={{
                  display:'flex', alignItems:'center', gap:8, padding:'14px 20px',
                  background:'var(--surface2)', borderBottom:'1px solid var(--border)',
                }}>
                  <div style={{ width:3, height:16, borderRadius:2, background:ACCENT, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:13, fontWeight:700, color:'var(--text)', letterSpacing:'-0.1px' }}>
                    {sec.label}
                  </span>

                  {/* Ações da seção */}
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
                <div style={{ padding:'20px 24px 24px', display:'flex', flexDirection:'column', gap:16 }}>
                  {sec.rows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{ display:'flex', gap:16, alignItems:'stretch' }}>
                      {/* Coluna esquerda */}
                      <DropSlot
                        slotId={`${sec.id}:${rowIdx}:0`}
                        field={fieldById[row[0]] || null}
                        onRemove={handleRemoveFromSlot}
                        onEdit={f => setFieldModal(f)}
                        onAdd={() => { setPendingSlot(`${sec.id}:${rowIdx}:0`); setFieldModal('new') }}
                      />
                      {/* Coluna direita */}
                      <DropSlot
                        slotId={`${sec.id}:${rowIdx}:1`}
                        field={fieldById[row[1]] || null}
                        onRemove={handleRemoveFromSlot}
                        onEdit={f => setFieldModal(f)}
                        onAdd={() => { setPendingSlot(`${sec.id}:${rowIdx}:1`); setFieldModal('new') }}
                      />
                      {/* Remover linha */}
                      <button onClick={() => removeRow(sec.id, rowIdx)}
                        title="Remover linha"
                        style={{ ...cs.secBtn, flexShrink:0, alignSelf:'center' }}
                        onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                        <X size={12} strokeWidth={2}/>
                      </button>
                    </div>
                  ))}

                  {/* Adicionar linha */}
                  <button onClick={() => addRow(sec.id)}
                    style={{ alignSelf:'flex-start', fontSize:11, fontWeight:600, color:ACCENT,
                      background:'none', border:'none', cursor:'pointer', padding:'4px 0',
                      fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:4 }}>
                    <Plus size={12} strokeWidth={2}/> Adicionar linha
                  </button>
                </div>
              </div>
            ))}

            {/* Adicionar seção */}
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
          onClose={() => setFieldModal(null)}
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
        <div style={cs.overlay} onClick={() => setConfirmDel(null)}>
          <div style={{ ...cs.modal, maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div style={cs.mhead}>
              <h2 style={{ ...cs.mtitle, color:'var(--red)' }}>Excluir campo</h2>
              <button onClick={() => setConfirmDel(null)} style={cs.closeBtn}><X size={16}/></button>
            </div>
            <div style={{ padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={{ margin:0, fontSize:13, color:'var(--text-soft)', lineHeight:1.6 }}>
                O campo será removido do formulário. Dados já salvos em registros existentes não serão apagados.
              </p>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button style={cs.btnSec} onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button style={{ ...cs.btnPri, background:'var(--red)' }} onClick={() => handleDeleteField(confirmDel)}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const pg = {
  header:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'24px 28px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  title:   { fontSize:18, fontWeight:700, color:'var(--text)', margin:0, letterSpacing:'-0.3px' },
  desc:    { fontSize:13, color:'var(--text-muted)', margin:'4px 0 0', maxWidth:560 },
  btnNew:  { display:'flex', alignItems:'center', background:ACCENT, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap', flexShrink:0 },
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
