import { useMemo } from 'react'
import { useLocalState } from './useLocalState'
import { FIELDS_SEED, LAYOUT_SEED } from '../data/formSeeds'

export function useFormLayout(entity) {
  const [storedFields, setStoredFields] = useLocalState('settings:form_fields_v4', FIELDS_SEED)
  const [storedLayout, setStoredLayout] = useLocalState('settings:form_layout_v4', LAYOUT_SEED)

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

  // Garante que entidades e campos novos do seed apareçam no layout (migração automática)
  const layout = useMemo(() => {
    let changed = false
    const merged = { ...storedLayout }

    for (const [entity, seedEntity] of Object.entries(LAYOUT_SEED)) {
      if (!merged[entity]) {
        merged[entity] = seedEntity
        changed = true
        continue
      }
      // Merge seções existentes: adiciona linhas com campos novos
      const storedSections = merged[entity].sections || []
      const seedSections   = seedEntity.sections || []
      const newSections = storedSections.map(sec => {
        const seedSec = seedSections.find(s => s.id === sec.id)
        if (!seedSec) return sec
        // Ids de campos já presentes nesta seção
        const presentIds = new Set(sec.rows.flatMap(r => r.filter(Boolean)))
        const missingRows = seedSec.rows.filter(r =>
          r.some(id => id && !presentIds.has(id))
        )
        if (!missingRows.length) return sec
        changed = true
        return { ...sec, rows: [...sec.rows, ...missingRows] }
      })
      merged[entity] = { ...merged[entity], sections: newSections }
    }

    if (changed) { setStoredLayout(merged) }
    return merged
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
