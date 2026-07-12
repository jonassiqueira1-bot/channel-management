import { useMemo, useEffect } from 'react'
import { useLocalState } from './useLocalState'
import { FIELDS_SEED, LAYOUT_SEED } from '../data/formSeeds'

// Remove chaves antigas que podem conter layout quebrado
const STALE_KEYS = ['settings:form_fields_v3','settings:form_layout_v3','settings:form_fields_v4','settings:form_layout_v4']
STALE_KEYS.forEach(k => localStorage.removeItem(k))

export function useFormLayout(entity) {
  const [storedFields, setStoredFields] = useLocalState('settings:form_fields_v5', FIELDS_SEED)
  const [storedLayout, setStoredLayout] = useLocalState('settings:form_layout_v5', LAYOUT_SEED)

  // Força reset do v5 se contiver campos inválidos (sf_op_forecast não existe mais)
  useEffect(() => {
    const saved = localStorage.getItem('settings:form_layout_v5')
    if (saved && saved.includes('sf_op_forecast')) {
      localStorage.removeItem('settings:form_layout_v5')
      setStoredLayout(LAYOUT_SEED)
    }
  }, [setStoredLayout])

  // Garante que campos novos do seed sejam adicionados ao localStorage (migração automática)
  const fields = useMemo(() => {
    const storedIds = new Set(storedFields.map(f => f.id))
    const missing   = FIELDS_SEED.filter(f => !storedIds.has(f.id))
    if (missing.length > 0) {
      const merged = [...storedFields, ...missing]
      setStoredFields(merged)
      return merged
    }
    return storedFields
  }, [storedFields, setStoredFields])

  // Garante que entidades novas do seed apareçam no layout (migração automática)
  const layout = useMemo(() => {
    const missingEntities = Object.keys(LAYOUT_SEED).filter(e => !storedLayout[e])
    if (missingEntities.length > 0) {
      const merged = { ...storedLayout }
      missingEntities.forEach(e => { merged[e] = LAYOUT_SEED[e] })
      setStoredLayout(merged)
      return merged
    }
    return storedLayout
  }, [storedLayout, setStoredLayout])

  const sections   = useMemo(() => layout[entity]?.sections || [], [layout, entity])
  const fieldById  = useMemo(() => Object.fromEntries(fields.map(f => [f.id, f])), [fields])
  const fieldByKey = useMemo(() => {
    const map = {}
    fields.filter(f => f.entity === entity).forEach(f => { map[f.field_key] = f })
    return map
  }, [fields, entity])

  return { sections, fieldById, fieldByKey }
}
