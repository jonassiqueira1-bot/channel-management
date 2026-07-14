import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

// Recalcula e persiste proxima_tarefa_data/hora em custom_fields da oportunidade
async function sincronizarProximaTarefa(oportunidadeId) {
  if (!oportunidadeId) return
  const { data: tasks } = await supabase
    .from('tasks')
    .select('data_inicio, prazo, status, concluida_em, custom_fields')
    .eq('entidade_id', oportunidadeId)
    .eq('entidade_tipo', 'oportunidade')
    .neq('status', 'cancelada')
    .is('deleted_at', null)

  // Usa data_inicio (custom_fields) ou prazo como fallback para a data da tarefa
  const dataEfetiva = (t) => t.custom_fields?.data_inicio || t.prazo || null

  const pendentes = (tasks || [])
    .filter(t => t.status !== 'concluida' && dataEfetiva(t))
    .sort((a, b) => dataEfetiva(a).localeCompare(dataEfetiva(b)))
  const proxima = pendentes[0]
  const proximaData = proxima ? dataEfetiva(proxima) : null

  const concluidas = (tasks || []).filter(t => t.status === 'concluida' && t.concluida_em)
  concluidas.sort((a, b) => a.concluida_em.localeCompare(b.concluida_em))
  const primeira = concluidas[0]

  // Lê custom_fields atual para não sobrescrever outros campos
  const { data: opp } = await supabase
    .from('oportunidades')
    .select('custom_fields')
    .eq('id', oportunidadeId)
    .single()

  const cf = opp?.custom_fields || {}
  await supabase.from('oportunidades').update({
    custom_fields: {
      ...cf,
      proxima_tarefa_data:     proximaData?.slice(0, 10) || null,
      proxima_tarefa_hora:     proximaData?.length > 10 ? proximaData.slice(11, 16) : null,
      primeira_conclusao_data: primeira?.concluida_em?.slice(0, 10) || null,
      primeira_conclusao_hora: primeira?.concluida_em?.slice(11, 16) || null,
    }
  }).eq('id', oportunidadeId)
}

function rowToTask(row) {
  const cf = row.custom_fields || {}
  return {
    id:            row.id,
    titulo:        row.titulo,
    descricao:     row.descricao || '',
    tipo:          row.tipo || cf.tipo || 'ligação',
    status:        row.status || 'pendente',
    prioridade:    row.prioridade || 'media',
    prazo:            row.prazo || '',
    data_inicio:      row.custom_fields?.data_inicio || '',
    responsavel:      row.responsavel || '',
    responsavel_id:   row.custom_fields?.responsavel_id || null,
    responsavel_nome: row.custom_fields?.responsavel_nome || row.responsavel || '',
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
    custom_fields: {
      data_inicio:      t.data_inicio || null,
      responsavel_id:   t.responsavel_id || null,
      responsavel_nome: t.responsavel_nome || t.responsavel || null,
    },
  }
}

export function useTasks() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode            = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = false; setLoading(false); return }
    let _q = supabase.from('tasks').select('*')
    const { data, error } = await _q.order('prazo', { ascending: true, nullsFirst: false })
    if (error) { isMockMode.current = false; setTarefas([]); setLoading(false); return }
    isMockMode.current = false
    setTarefas((data || []).map(rowToTask))
    setLoading(false)
  }, [session, activeBranchId])

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
    if (t.entidade_tipo === 'oportunidade' && t.entidade_id) {
      sincronizarProximaTarefa(t.entidade_id)
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setTarefas(prev => prev.filter(t => t.id !== id)); return { ok: true } }
    const tarefa = tarefas.find(t => t.id === id)
    const { error } = await softDelete('tasks', id)
    if (error) return { ok: false, message: error.message }
    setTarefas(prev => prev.filter(t => t.id !== id))
    if (tarefa?.entidade_tipo === 'oportunidade' && tarefa?.entidade_id) {
      sincronizarProximaTarefa(tarefa.entidade_id)
    }
    return { ok: true }
  }, [tarefas])

  const bulkSetStatus = useCallback(async (ids, status) => {
    const concluida_em = status === 'concluida' ? new Date().toISOString() : null
    if (isMockMode.current) {
      setTarefas(prev => prev.map(t => ids.includes(t.id) ? { ...t, status, concluida_em } : t))
      return
    }
    await supabase.from('tasks').update({ status, concluida_em }).in('id', ids)
    setTarefas(prev => prev.map(t => ids.includes(t.id) ? { ...t, status, concluida_em } : t))
    // Sincroniza oportunidades afetadas
    const oppIds = [...new Set(
      tarefas.filter(t => ids.includes(t.id) && t.entidade_tipo === 'oportunidade' && t.entidade_id)
              .map(t => t.entidade_id)
    )]
    for (const oid of oppIds) sincronizarProximaTarefa(oid)
  }, [tarefas])

  return { tarefas, loading, reload: load, save, remove, bulkSetStatus, setTarefas, isMock: isMockMode }
}
