import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_DOCS, MOCK_LOGS } from '../data/mockDocumentos'

function rowToDoc(row) {
  const cf = row.custom_fields || {}
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description || '',
    categoria:      row.categoria || cf.categoria || 'outro',
    status:         row.status || 'rascunho',
    version:        row.version || 1,
    content:        row.content || '',
    owner_id:       row.owner_id || null,
    opportunity_id: cf.opportunity_id || null,
    file_url:       cf.file_url   || null,
    file_name:      cf.file_name  || null,
    file_size:      cf.file_size  || null,
    file_path:      cf.file_path  || null,
    criado:         row.created_at?.slice(0, 10) || '',
    atualizado:     row.updated_at?.slice(0, 10) || '',
  }
}

function docToRow(d, tenantId, branchId) {
  return {
    tenant_id:    tenantId,
    branch_id:    branchId || null,
    owner_id:     d.owner_id || null,
    title:        d.title,
    description:  d.description || null,
    categoria:    d.categoria || 'outro',
    status:       d.status || 'rascunho',
    version:      d.version || 1,
    content:      d.content || null,
    custom_fields: {
      opportunity_id: d.opportunity_id || null,
      file_url:       d.file_url   || null,
      file_name:      d.file_name  || null,
      file_size:      d.file_size  || null,
      file_path:      d.file_path  || null,
    },
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

  const [docs, setDocs]   = useState([])
  const [logs, setLogs]   = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode        = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setDocs(MOCK_DOCS); setLogs(MOCK_LOGS); setLoading(false); return }
    const [d, l] = await Promise.all([
      supabase.from('documents').select('*').order('updated_at', { ascending: false }),
      supabase.from('document_logs').select('*').order('created_at', { ascending: false }),
    ])
    if (d.error || l.error) { isMockMode.current = false; setDocs([]); setLogs([]); setLoading(false); return }
    isMockMode.current = false
    setDocs((d.data || []).map(rowToDoc))
    setLogs((l.data || []).map(rowToLog))
    setLoading(false)
  }, [session])

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
    if (logEvento) {
      const logRow = { tenant_id: tenantId, document_id: savedId, evento: logEvento, user_id: session?.user?.id || null, user_nome: profile?.nome || '' }
      const { data: logData } = await supabase.from('document_logs').insert(logRow).select().single()
      if (logData) setLogs(prev => [rowToLog(logData), ...prev])
    }
    return { ok: true }
  }, [tenantId, branchId, session, profile])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setDocs(prev => prev.filter(d => d.id !== id)); return { ok: true } }
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setDocs(prev => prev.filter(d => d.id !== id))
    setLogs(prev => prev.filter(l => l.document_id !== id))
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

  return { docs, logs, loading, reload: load, save, remove, linkToOpp, uploadFile, removeFile, setDocs, setLogs, isMock: isMockMode }
}
