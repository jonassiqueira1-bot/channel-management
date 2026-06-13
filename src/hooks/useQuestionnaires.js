import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_TEMPLATES, MOCK_SUBMISSIONS } from '../data/mockQuestionarios'

function rowToTemplate(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    title:            row.title,
    description:      row.description || '',
    type:             row.type || cf.type || 'pre_venda',
    status:           row.status || 'rascunho',
    estrutura_secoes: row.estrutura_secoes || {},
    owner_id:         row.owner_id || null,
    criado:           row.created_at?.slice(0, 10) || '',
    atualizado:       row.updated_at?.slice(0, 10) || '',
    ...cf,
  }
}

function templateToRow(t, tenantId, branchId) {
  const { id, title, description, type, status, estrutura_secoes, owner_id, criado, atualizado, ...rest } = t
  return {
    tenant_id:        tenantId,
    branch_id:        branchId || null,
    owner_id:         owner_id || null,
    title:            title,
    description:      description || null,
    type:             type || null,
    status:           status || 'rascunho',
    estrutura_secoes: estrutura_secoes || {},
    custom_fields:    rest,
  }
}

function rowToSubmission(row) {
  const cf = row.custom_fields || {}
  return {
    id:               row.id,
    template_id:      row.template_id || null,
    company_id:       row.company_id || null,
    contact_id:       row.contact_id || null,
    respondente_nome: row.respondente_nome || '',
    status:           row.status || 'rascunho',
    respostas:        row.respostas || {},
    enviado_em:       row.enviado_em || null,
    criado:           row.created_at?.slice(0, 10) || '',
    ...cf,
  }
}

function submissionToRow(s, tenantId) {
  const { id, criado, ...rest } = s
  return {
    tenant_id:        tenantId,
    template_id:      s.template_id || null,
    company_id:       s.company_id || null,
    contact_id:       s.contact_id || null,
    respondente_nome: s.respondente_nome || null,
    status:           s.status || 'rascunho',
    respostas:        s.respostas || {},
    enviado_em:       s.enviado_em || null,
    custom_fields:    {},
  }
}

export function useQuestionnaires() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [templates,   setTemplates]   = useState(MOCK_TEMPLATES)
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS)
  const [loading, setLoading]         = useState(true)
  const isMockMode                    = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setLoading(false); return }
    const [t, s] = await Promise.all([
      supabase.from('questionnaire_templates').select('*').order('updated_at', { ascending: false }),
      supabase.from('questionnaire_submissions').select('*').order('created_at', { ascending: false }),
    ])
    if (t.error || s.error) { isMockMode.current = true; setLoading(false); return }
    isMockMode.current = false
    setTemplates((t.data || []).map(rowToTemplate))
    setSubmissions((s.data || []).map(rowToSubmission))
    setLoading(false)
  }, [session])

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
    const { error } = await supabase.from('questionnaire_templates').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setTemplates(prev => prev.filter(t => t.id !== id))
    return { ok: true }
  }, [])

  const saveSubmission = useCallback(async (sub) => {
    if (isMockMode.current) {
      setSubmissions(prev => { const idx = prev.findIndex(x => x.id === sub.id); if (idx >= 0) { const n=[...prev]; n[idx]=sub; return n } return [...prev, { ...sub, id: sub.id || `sub-${Date.now()}` }] })
      return { ok: true }
    }
    const row = submissionToRow(sub, tenantId)
    const isUuid = typeof sub.id === 'string' && sub.id.includes('-') && !sub.id.startsWith('sub-')
    if (isUuid) {
      const { error } = await supabase.from('questionnaire_submissions').update(row).eq('id', sub.id)
      if (error) return { ok: false, message: error.message }
      setSubmissions(prev => prev.map(x => x.id === sub.id ? { ...x, ...sub } : x))
    } else {
      const { data, error } = await supabase.from('questionnaire_submissions').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setSubmissions(prev => [...prev, rowToSubmission(data)])
    }
    return { ok: true }
  }, [tenantId])

  const removeSubmission = useCallback(async (id) => {
    if (isMockMode.current) { setSubmissions(prev => prev.filter(s => s.id !== id)); return { ok: true } }
    const { error } = await supabase.from('questionnaire_submissions').delete().eq('id', id)
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
