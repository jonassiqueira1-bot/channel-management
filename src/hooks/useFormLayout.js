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

  // Remove campos retirados da aba Dados de Oportunidades (Playbook, Contato
  // Principal, Responsável já aparecem em outras abas/lugares próprios) de
  // instalações já existentes — a migração automática abaixo só adiciona
  // campos novos, nunca remove os que já foram descontinuados do seed.
  const REMOVIDOS = ['sf_op_contato', 'sf_op_resp', 'sf_op_playbook']
  useEffect(() => {
    if (storedFields.some(f => REMOVIDOS.includes(f.id))) {
      setStoredFields(prev => prev.filter(f => !REMOVIDOS.includes(f.id)))
    }
    const opRows = storedLayout.opportunities?.sections?.[0]?.rows
    if (opRows?.some(row => row.some(id => REMOVIDOS.includes(id)))) {
      setStoredLayout(prev => ({
        ...prev,
        opportunities: {
          ...prev.opportunities,
          sections: prev.opportunities.sections.map(sec => ({
            ...sec,
            rows: sec.rows
              .map(row => row.map(id => REMOVIDOS.includes(id) ? null : id))
              .filter(row => row.some(id => id !== null)),
          })),
        },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Remove a seção "Financeiro" (sec_op_4) de instalações já existentes — os
  // campos (Valor CDU/SMS/Serviço/Desconto) continuam em FIELDS_SEED, só a
  // seção duplicada (que só renderizava null em Pipeline.js, já que os
  // valores são mostrados de verdade pelo ValorFinanceiroSection) some.
  useEffect(() => {
    if (storedLayout.opportunities?.sections?.some(s => s.id === 'sec_op_4')) {
      setStoredLayout(prev => ({
        ...prev,
        opportunities: {
          ...prev.opportunities,
          sections: prev.opportunities.sections.filter(s => s.id !== 'sec_op_4'),
        },
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Adiciona o campo "Tags" (sf_op_tags) na seção Origem de instalações já
  // existentes — sem isso, o campo migra pra FIELDS_SEED (fields abaixo já
  // cobre isso) mas nunca aparece em nenhuma linha do layout salvo.
  // A checagem "já tem?" e a escrita acontecem DENTRO do updater (usando
  // `prev`, não o `storedLayout` de fora) pra ficar idempotente — em dev o
  // StrictMode roda o efeito duas vezes com o mesmo snapshot de fora, e se a
  // checagem olhasse pra fora dos dois disparos veriam "ainda não tem" e
  // cada um adicionava sua própria linha, duplicando o campo (bug real que
  // aconteceu aqui). Também remove duplicatas que já tenham sido gravadas
  // por essa mesma causa antes do fix.
  useEffect(() => {
    setStoredLayout(prev => {
      const opSections = prev.opportunities?.sections || []
      if (!opSections.length) return prev
      let vistoTags = false
      let mudou = false
      const sections = opSections.map(sec => {
        const rows = sec.rows.filter(row => {
          if (!row.includes('sf_op_tags')) return true
          if (vistoTags) { mudou = true; return false }
          vistoTags = true
          return true
        })
        return rows.length !== sec.rows.length ? { ...sec, rows } : sec
      })
      if (!vistoTags) {
        mudou = true
        return {
          ...prev,
          opportunities: {
            ...prev.opportunities,
            sections: sections.map(sec => sec.id === 'sec_op_2' ? { ...sec, rows: [...sec.rows, ['sf_op_tags']] } : sec),
          },
        }
      }
      if (!mudou) return prev
      return { ...prev, opportunities: { ...prev.opportunities, sections } }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Migração única: reorganiza o layout de Oportunidades (antes 1 seção única
  // "Identificação" com todos os campos) na nova estrutura agrupada por contexto
  // (Identificação / Origem / Negociação / Financeiro). Detecta a estrutura antiga
  // pela seção única sec_op_1 e substitui pelo novo layout do seed.
  useEffect(() => {
    const opSections = storedLayout.opportunities?.sections
    if (opSections?.length === 1 && opSections[0]?.id === 'sec_op_1') {
      setStoredLayout(prev => ({ ...prev, opportunities: LAYOUT_SEED.opportunities }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
