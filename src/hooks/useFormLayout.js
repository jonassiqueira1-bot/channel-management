import { useMemo } from 'react'
import { useLocalState } from './useLocalState'

// Seeds importados inline para evitar dependência circular com Forms.js
// Devem ser mantidos em sync com FIELDS_SEED e LAYOUT_SEED em settings/Forms.js
import { FIELDS_SEED, LAYOUT_SEED } from '../data/formSeeds'

export function useFormLayout(entity) {
  const [fields] = useLocalState('settings:form_fields_v2', FIELDS_SEED)
  const [layout] = useLocalState('settings:form_layout_v2', LAYOUT_SEED)

  const sections   = useMemo(() => layout[entity]?.sections || [], [layout, entity])
  const fieldById  = useMemo(() => Object.fromEntries(fields.map(f => [f.id, f])), [fields])
  const fieldByKey = useMemo(() => {
    const map = {}
    fields.filter(f => f.entity === entity).forEach(f => { map[f.field_key] = f })
    return map
  }, [fields, entity])

  return { sections, fieldById, fieldByKey }
}
