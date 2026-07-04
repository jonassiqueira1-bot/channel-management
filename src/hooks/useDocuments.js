import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

function rowToDoc(row) {
  const cf = row.custom_fields || {}
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description || '',
    categoria:      row.categoria || cf.categoria || 'outro',
    status:         row.status || 'ativo',
    owner_id:       row.owner_id || null,
    prazo_validade: row.prazo_validade || null,
    data_revisao:   row.data_revisao || null,
    perfis_acesso:  row.perfis_acesso || [],
    link_externo:   row.link_externo || null,
    file_url:       row.file_url   || cf.file_url   || null,
    file_name:      row.file_name  || cf.file_name  || null,
    file_size:      row.file_size  || cf.file_size  || null,
    file_path:      row.file_path  || cf.file_path  || null,
    criado:         row.created_at?.slice(0, 10) || '',
    atualizado:     row.updated_at?.slice(0, 10) || '',
  }
}

function docToRow(d, tenantId, branchId) {
  return {
    tenant_id:      tenantId,
    branch_id:      branchId || null,
    owner_id:       d.owner_id || null,
    title:          d.title,
    description:    d.description || null,
    categoria:      d.categoria || 'outro',
    status:         d.status || 'ativo',
    prazo_validade: d.prazo_validade || null,
    data_revisao:   d.data_revisao || null,
    perfis_acesso:  d.perfis_acesso || [],
    link_externo:   d.link_externo || null,
    file_url:       d.file_url   || null,
    file_name:      d.file_name  || null,
    file_size:      d.file_size  || null,
    file_path:      d.file_path  || null,
    custom_fields:  {},
  }
}

function rowToLog(row) {
  return {
    id:          row.id,
    document_id: row.document_id,
    evento:      row.evento,
    user_id:     row.user_id || null,
    user_nome:   row.user_nome || '',
    nota:        row.nota || '',
    criado:      row.created_at || '',
  }
}

export function useDocuments() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [docs, setDocs]   = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode        = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = false; setLoading(false); return }
    let _q = supabase.from('documents').select('*').is('deleted_at', null)
    if (activeBranchId) _q = _q.eq('branch_id', activeBranchId)
    const { data, error } = await _q.order('updated_at', { ascending: false })
    if (error) { isMockMode.current = false; setDocs([]); setLoading(false); return }
    isMockMode.current = false
    setDocs((data || []).map(rowToDoc))
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (doc, logEvento) => {
    if (isMockMode.current) {
      setDocs(prev => { const idx = prev.findIndex(x => x.id === doc.id); if (idx >= 0) { const n=[...prev]; n[idx]=doc; return n } return [...prev, { ...doc, id: doc.id || `doc-${Date.now()}`, criado: new Date().toISOString().slice(0,10) }] })
      return { ok: true }
    }
    const row = docToRow(doc, tenantId, branchId)
    const isUuid = typeof doc.id === 'string' && doc.id.includes('-') && !doc.id.startsWith('doc-')
    let savedId = doc.id
    if (isUuid) {
      const { error } = await supabase.from('documents').update(row).eq('id', doc.id)
      if (error) return { ok: false, message: error.message }
      setDocs(prev => prev.map(x => x.id === doc.id ? { ...x, ...doc } : x))
    } else {
      const { data, error } = await supabase.from('documents').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      savedId = data.id
      setDocs(prev => [...prev, rowToDoc(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setDocs(prev => prev.filter(d => d.id !== id)); return { ok: true } }
    const { error } = await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) return { ok: false, message: error.message }
    setDocs(prev => prev.filter(d => d.id !== id))
    return { ok: true }
  }, [])

  const linkToOpp = useCallback(async (docId, oppId) => {
    const doc = docs.find(d => d.id === docId)
    if (!doc) return { ok: false, message: 'Documento não encontrado' }
    return save({ ...doc, opportunity_id: oppId || null })
  }, [docs, save])

  const uploadFile = useCallback(async (file) => {
    if (isMockMode.current) {
      return { ok: true, url: URL.createObjectURL(file), name: file.name, size: file.size, path: null }
    }
    const ext  = file.name.split('.').pop()
    const path = `${tenantId || 'public'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (error) return { ok: false, message: error.message }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    return { ok: true, url: publicUrl, name: file.name, size: file.size, path }
  }, [tenantId])

  const removeFile = useCallback(async (filePath) => {
    if (!filePath || isMockMode.current) return { ok: true }
    const { error } = await supabase.storage.from('documents').remove([filePath])
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }, [])

  return { docs, loading, reload: load, save, remove, uploadFile, removeFile, setDocs, isMock: isMockMode }
}
