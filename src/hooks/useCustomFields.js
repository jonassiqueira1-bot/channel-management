/**
 * useCustomFields(entity)
 *
 * Hook centralizado de Custom Fields.
 * Em produção: schema persiste em `custom_field_definitions` no Supabase
 * e os valores em `custom_fields JSONB` por registro.
 *
 * Por enquanto: localStorage via useLocalState — mesma API do Supabase futuro.
 */
import { useLocalState } from './useLocalState'

// ── Tipos suportados ──────────────────────────────────────────────────────────
export const CF_TYPES = [
  { value: 'text',    label: 'Texto' },
  { value: 'select',  label: 'Seleção' },
  { value: 'boolean', label: 'Sim / Não' },
  { value: 'number',  label: 'Número' },
  { value: 'date',    label: 'Data' },
]

// ── Valores padrão por tipo ───────────────────────────────────────────────────
export function cfDefaultValue(type) {
  if (type === 'boolean') return false
  if (type === 'number')  return ''
  return ''
}

// ── Schema inicial (seed) ─────────────────────────────────────────────────────
const SEED = {
  oportunidade: [
    { id:'cf_1', key:'tipo_implantacao',  label:'Tipo de Implantação',           type:'select',  options:['Presencial','Remota','Híbrida'], placeholder:'', required:false },
    { id:'cf_2', key:'segmento_industria',label:'Segmento da Indústria',         type:'text',    options:[], placeholder:'Ex: Varejo, Saúde, Agronegócio…', required:false },
    { id:'cf_3', key:'exige_integracao',  label:'Exige Integração de Sistemas?', type:'boolean', options:[], placeholder:'', required:false },
  ],
  empresa:   [],
  contrato:  [],
}

function makeKey(label) {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
    .toLowerCase().replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || `campo_${Date.now()}`
}

export function useCustomFields(entity) {
  const [fields, setFields] = useLocalState(
    `customFields:${entity}`,
    SEED[entity] ?? []
  )

  function addField({ label = 'Novo campo', type = 'text', options = [] } = {}) {
    const id  = `cf_${Date.now()}`
    const key = makeKey(label) + '_' + id.slice(-4)
    setFields(prev => [
      ...prev,
      { id, key, label, type, options, placeholder: '', required: false },
    ])
    return id
  }

  function updateField(id, changes) {
    setFields(prev => prev.map(f => {
      if (f.id !== id) return f
      // Se mudou o label e a key ainda é auto-gerada, regenera a key
      const key = changes.label && f.key.startsWith('campo')
        ? makeKey(changes.label) + '_' + id.slice(-4)
        : f.key
      return { ...f, key, ...changes }
    }))
  }

  function removeField(id) {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  function moveField(id, dir) {
    setFields(prev => {
      const i = prev.findIndex(f => f.id === id)
      const j = dir === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function resetToSeed() {
    setFields(SEED[entity] ?? [])
  }

  return [fields, { addField, updateField, removeField, moveField, resetToSeed }]
}
