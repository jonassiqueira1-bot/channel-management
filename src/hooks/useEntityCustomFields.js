/**
 * useEntityCustomFields(entity)
 *
 * Retorna os campos customizados criados em Configuração de Campos para a entidade.
 * Lê de 'entity_custom_fields:<entity>' escrito pelo editor Forms.js.
 * Usado pelas páginas de entidade para incluir campos no template de importação e nos filtros.
 *
 * entity: 'companies' | 'opportunities' | 'projects' | 'products' | 'contracts' | 'payments' | 'actions' | 'sellers'
 */
import { useState, useEffect } from 'react'

export function useEntityCustomFields(entity) {
  const key = `entity_custom_fields:${entity}`

  function read() {
    try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
  }

  const [fields, setFields] = useState(read)

  useEffect(() => {
    function onStorage(e) {
      if (e.key === key) setFields(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return fields
}

/**
 * Retorna os field_keys dos campos customizados de uma entidade — para headers de CSV.
 * Uso síncrono (sem hook), chamável dentro de handlers de download.
 */
export function getEntityCustomFieldKeys(entity) {
  try {
    const fields = JSON.parse(localStorage.getItem(`entity_custom_fields:${entity}`) || '[]')
    return fields.map(f => f.field_key)
  } catch { return [] }
}

/**
 * Retorna label dos campos customizados como opções de filtro.
 */
export function getEntityCustomFilterOptions(entity) {
  try {
    const fields = JSON.parse(localStorage.getItem(`entity_custom_fields:${entity}`) || '[]')
    return fields.map(f => ({ key: f.field_key, label: f.label, type: f.field_type, options: f.options }))
  } catch { return [] }
}
