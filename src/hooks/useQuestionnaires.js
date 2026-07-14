import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete, softDeleteMany } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

// A tabela real (questionnaire_templates) não tem colunas `type`/`is_active` —
// só nome/descricao/status/fields. `type` (pre_venda/qualificacao_lead/etc.)
// vai dentro do jsonb `fields`, ao lado de `secoes`; `is_active` (boolean, é
// o que a UI usa) mapeia pra `status` (texto 'ativo'/'inativo', é o que o
// banco tem). Sem isso os dois eram perdidos a cada reload (voltavam pro
// default do formulário, não pro que estava realmente salvo).
function rowToTemplate(row) {
  const fields = row.fields || {}
  return {
    id:               row.id,
    title:            row.nome || '',
    description:      row.descricao || '',
    status:           row.status || 'ativo',
    is_active:        row.status !== 'inativo',
    type:             fields.type || 'pre_venda',
    estrutura_secoes: { secoes: fields.secoes || [] },
    criado:           row.created_at?.slice(0, 10) || '',
    atualizado:       row.updated_at?.slice(0, 10) || '',
  }
}

function templateToRow(t, tenantId, branchId) {
  return {
    tenant_id: tenantId,
    branch_id: branchId || null,
    nome:      t.title || t.nome || '',
    descricao: t.description || t.descricao || null,
    status:    t.is_active === false ? 'inativo' : 'ativo',
    fields:    { ...(t.estrutura_secoes || t.fields || {}), type: t.type || 'pre_venda' },
  }
}

// A tabela real (questionnaire_submissions) só tem id/tenant_id/template_id/
// company_id/created_by/respostas/status/created_at/updated_at/branch_id —
// NÃO tem contact_id, respondente_nome, enviado_em nem custom_fields como
// colunas próprias. Tudo isso ia direto no payload do insert/update e o
// Postgres rejeitava (coluna inexistente) — falha silenciosa: a UI otimista
// mostrava "salvo", mas nada persistia de verdade. Agora usa a coluna
// custom_fields (jsonb, adicionada em 20260714000004) pra guardar esses
// campos extras, igual ao padrão do resto do sistema.
function rowToSubmission(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    template_id:      row.template_id || null,
    company_id:       row.company_id || null,
    contact_id:       cf.contact_id || null,
    respondente_nome: cf.respondente_nome || '',
    status:           row.status || 'rascunho',
    respostas:        row.respostas || {},
    enviado_em:       cf.enviado_em || null,
    criado:           row.created_at?.slice(0, 10) || '',
    opportunity_id:   cf.opportunity_id || null,
    company_nome:     cf.company_nome || '',
  }
}

function submissionToRow(s, tenantId) {
  const { id, criado, ...rest } = s
  return {
    tenant_id:        tenantId,
    template_id:      s.template_id || null,
    company_id:       s.company_id || null,
    status:           s.status || 'rascunho',
    respostas:        s.respostas || s.valores_respostas || {},
    custom_fields:    {
      opportunity_id:   s.opportunity_id || null,
      contact_id:       s.contact_id || null,
      respondente_nome: s.respondente_nome || s.answered_by_nome || '',
      enviado_em:       s.enviado_em || s.submitted_at || null,
      company_nome:     s.company_nome || '',
    },
  }
}

export function useQuestionnaires() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [templates,   setTemplates]   = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]         = useState(true)
  const isMockMode                    = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = false; setLoading(false); return }
    let qTpl = supabase.from('questionnaire_templates').select('*')
    let qSub = supabase.from('questionnaire_submissions').select('*')
    const [t, s] = await Promise.all([
      qTpl.order('updated_at', { ascending: false }),
      qSub.order('created_at', { ascending: false }),
    ])
    if (t.error || s.error) { isMockMode.current = false; setTemplates([]); setSubmissions([]); setLoading(false); return }
    isMockMode.current = false
    setTemplates((t.data || []).map(rowToTemplate))
    setSubmissions((s.data || []).map(rowToSubmission))
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  const saveTemplate = useCallback(async (tpl) => {
    if (isMockMode.current) {
      setTemplates(prev => { const idx = prev.findIndex(x => x.id === tpl.id); if (idx >= 0) { const n=[...prev]; n[idx]=tpl; return n } return [...prev, { ...tpl, id: tpl.id || `tpl-${Date.now()}` }] })
      return { ok: true }
    }
    const row = templateToRow(tpl, tenantId, branchId)
    const isUuid = typeof tpl.id === 'string' && tpl.id.includes('-') && !tpl.id.startsWith('tpl-')
    if (isUuid) {
      const { error } = await supabase.from('questionnaire_templates').update(row).eq('id', tpl.id)
      if (error) return { ok: false, message: error.message }
      setTemplates(prev => prev.map(x => x.id === tpl.id ? { ...x, ...tpl } : x))
    } else {
      const { data, error } = await supabase.from('questionnaire_templates').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setTemplates(prev => [...prev, rowToTemplate(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const removeTemplate = useCallback(async (id) => {
    if (isMockMode.current) { setTemplates(prev => prev.filter(t => t.id !== id)); return { ok: true } }
    const { error } = await softDelete('questionnaire_templates', id)
    if (error) return { ok: false, message: error.message }
    setTemplates(prev => prev.filter(t => t.id !== id))
    return { ok: true }
  }, [])

  const saveSubmission = useCallback(async (sub) => {
    if (isMockMode.current) {
      const saved = { ...sub, id: sub.id || `sub-${Date.now()}` }
      setSubmissions(prev => { const idx = prev.findIndex(x => x.id === sub.id); if (idx >= 0) { const n=[...prev]; n[idx]=saved; return n } return [...prev, saved] })
      return { ok: true, data: saved }
    }
    const row = submissionToRow(sub, tenantId)
    const isUuid = typeof sub.id === 'string' && sub.id.includes('-') && !sub.id.startsWith('sub-')
    if (isUuid) {
      const { error } = await supabase.from('questionnaire_submissions').update(row).eq('id', sub.id)
      if (error) return { ok: false, message: error.message }
      const updated = { ...sub }
      setSubmissions(prev => prev.map(x => x.id === sub.id ? { ...x, ...updated } : x))
      return { ok: true, data: updated }
    } else {
      const { data, error } = await supabase.from('questionnaire_submissions').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      const saved = rowToSubmission(data)
      setSubmissions(prev => [...prev, saved])
      return { ok: true, data: saved }
    }
    return { ok: true }
  }, [tenantId])

  const removeSubmission = useCallback(async (id) => {
    if (isMockMode.current) { setSubmissions(prev => prev.filter(s => s.id !== id)); return { ok: true } }
    const { error } = await softDelete('questionnaire_submissions', id)
    if (error) return { ok: false, message: error.message }
    setSubmissions(prev => prev.filter(s => s.id !== id))
    return { ok: true }
  }, [])

  return {
    templates, submissions, loading, reload: load,
    saveTemplate, removeTemplate,
    saveSubmission, removeSubmission,
    setTemplates, setSubmissions,
    isMock: isMockMode,
  }
}
