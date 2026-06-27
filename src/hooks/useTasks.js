import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_TAREFAS } from '../data/mockTarefas'

function rowToTask(row) {
  const cf = row.custom_fields || {}
  return {
    id:            row.id,
    titulo:        row.titulo,
    descricao:     row.descricao || '',
    tipo:          row.tipo || cf.tipo || 'ligação',
    status:        row.status || 'pendente',
    prioridade:    row.prioridade || 'media',
    prazo:         row.prazo || '',
    data_inicio:   row.custom_fields?.data_inicio || '',
    responsavel:   row.responsavel || '',
    entidade_tipo: row.entidade_tipo || null,
    entidade_id:   row.entidade_id || null,
    entidade_nome: row.entidade_nome || '',
    concluida_em:  row.concluida_em || null,
    criado:        row.created_at?.slice(0, 10) || '',
  }
}

function taskToRow(t, tenantId, branchId) {
  return {
    tenant_id:     tenantId,
    branch_id:     branchId || null,
    titulo:        t.titulo,
    descricao:     t.descricao || null,
    tipo:          t.tipo || null,
    status:        t.status || 'pendente',
    prioridade:    t.prioridade || 'media',
    prazo:         t.prazo || null,
    responsavel:   t.responsavel || null,
    entidade_tipo: t.entidade_tipo || null,
    entidade_id:   t.entidade_id ? String(t.entidade_id) : null,
    entidade_nome: t.entidade_nome || null,
    concluida_em:  t.concluida_em || null,
    custom_fields: { data_inicio: t.data_inicio || null },
  }
}

export function useTasks() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode            = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setTarefas(MOCK_TAREFAS); setLoading(false); return }
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('prazo', { ascending: true, nullsFirst: false })
    if (error) { isMockMode.current = false; setTarefas([]); setLoading(false); return }
    isMockMode.current = false
    setTarefas((data || []).map(rowToTask))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (t) => {
    if (isMockMode.current) {
      setTarefas(prev => {
        const idx = prev.findIndex(x => x.id === t.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = t; return n }
        return [...prev, { ...t, id: t.id || Date.now(), criado: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }
    const row = taskToRow(t, tenantId, branchId)
    const isUuid = typeof t.id === 'string' && t.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('tasks').update(row).eq('id', t.id)
      if (error) return { ok: false, message: error.message }
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, ...t } : x))
    } else {
      const { data, error } = await supabase.from('tasks').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setTarefas(prev => [...prev, rowToTask(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setTarefas(prev => prev.filter(t => t.id !== id)); return { ok: true } }
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setTarefas(prev => prev.filter(t => t.id !== id))
    return { ok: true }
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    const concluida_em = status === 'concluida' ? new Date().toISOString() : null
    if (isMockMode.current) {
      setTarefas(prev => prev.map(t => ids.includes(t.id) ? { ...t, status, concluida_em } : t))
      return
    }
    await supabase.from('tasks').update({ status, concluida_em }).in('id', ids)
    setTarefas(prev => prev.map(t => ids.includes(t.id) ? { ...t, status, concluida_em } : t))
  }, [])

  return { tarefas, loading, reload: load, save, remove, bulkSetStatus, setTarefas, isMock: isMockMode }
}
