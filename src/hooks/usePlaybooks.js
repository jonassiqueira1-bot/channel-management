import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import {
  MOCK_PLAYBOOKS, MOCK_FUNNEL_STEPS, MOCK_REFERENCES, MOCK_RESOURCES,
} from '../data/mockPlaybooks'

function rowToPlaybook(row) {
  const cf = row.custom_fields || {}
  return {
    id:          row.id,
    titulo:      row.titulo,
    title:       row.titulo,        // alias usado pelo Pipeline
    descricao:   row.descricao || '',
    description: row.descricao || '', // alias usado pelo Pipeline
    segment:     cf.segment || '',
    status:      row.status || 'rascunho',
    owner_id:    row.owner_id || null,
    criado:      row.created_at?.slice(0, 10) || '',
    atualizado:  row.updated_at?.slice(0, 10) || '',
    steps:       row.steps || [],
    refs:        row.refs  || [],
    resources:   row.resources || [],
    ...cf,
  }
}

function playbookToRow(pb, tenantId, branchId) {
  const { id, titulo, title, descricao, description, status, owner_id, criado, atualizado, ...rest } = pb
  return {
    tenant_id:    tenantId,
    branch_id:    branchId || null,
    owner_id:     owner_id || null,
    titulo:       titulo || title || '',
    descricao:    descricao || description || null,
    status:       status || 'rascunho',
    steps:        rest.steps || [],
    refs:         rest.refs  || [],
    resources:    rest.resources || [],
    custom_fields: Object.fromEntries(
      Object.entries(rest).filter(([k]) => !['steps','refs','resources','title','description'].includes(k))
    ),
  }
}

export function usePlaybooks() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [playbooks,  setPlaybooks]  = useState([])
  const [steps,      setSteps]      = useState([])
  const [refs,       setRefs]       = useState([])
  const [resources,  setResources]  = useState([])
  const [loading, setLoading]       = useState(true)
  const isMockMode                  = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setPlaybooks(MOCK_PLAYBOOKS); setSteps(MOCK_FUNNEL_STEPS); setRefs(MOCK_REFERENCES); setResources(MOCK_RESOURCES); setLoading(false); return }
    const { data, error } = await supabase
      .from('playbooks')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) { isMockMode.current = false; setPlaybooks([]); setLoading(false); return }
    isMockMode.current = false
    const all = (data || []).map(rowToPlaybook)
    setPlaybooks(all)
    setSteps(all.flatMap(p => p.steps || []))
    setRefs(all.flatMap(p => p.refs || []))
    setResources(all.flatMap(p => p.resources || []))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (pb) => {
    if (isMockMode.current) {
      setPlaybooks(prev => { const idx = prev.findIndex(x => x.id === pb.id); if (idx >= 0) { const n=[...prev]; n[idx]=pb; return n } return [...prev, { ...pb, id: pb.id || `pb-${Date.now()}` }] })
      return { ok: true }
    }
    const row = playbookToRow(pb, tenantId, branchId)
    const isUuid = typeof pb.id === 'string' && pb.id.includes('-') && !pb.id.startsWith('pb-')
    if (isUuid) {
      const { error } = await supabase.from('playbooks').update(row).eq('id', pb.id)
      if (error) return { ok: false, message: error.message }
      setPlaybooks(prev => prev.map(x => x.id === pb.id ? { ...x, ...pb } : x))
    } else {
      const { data, error } = await supabase.from('playbooks').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setPlaybooks(prev => [...prev, rowToPlaybook(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setPlaybooks(prev => prev.filter(p => p.id !== id)); return { ok: true } }
    const { error } = await supabase.from('playbooks').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setPlaybooks(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  return { playbooks, steps, refs, resources, loading, reload: load, save, remove, setPlaybooks, setSteps, setRefs, setResources, isMock: isMockMode }
}
