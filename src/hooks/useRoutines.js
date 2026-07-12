import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { captureError } from '../lib/sentry'

export function useRoutines(contexto) {
  const { session } = useAuth()
  const { profile }  = useProfile()
  const tenantId     = profile?.tenant_id

  const [routines,  setRoutines]  = useState([])
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!session?.user || !tenantId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contexto', contexto)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
    if (error) captureError('useRoutines.load', error)
    setRoutines(data || [])
    setLoading(false)
  }, [session, tenantId, contexto])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (r) => {
    const row = {
      tenant_id:       tenantId,
      usuario_id:      session?.user?.id,
      nome:            r.nome,
      descricao:       r.descricao || null,
      contexto,
      validade:        r.validade || null,
      compartilhamento: r.compartilhamento || 'privado',
      parametros:      r.parametros || {},
      acoes:           r.acoes || [],
      schedule:        r.schedule || null,
      ativo:           true,
      updated_at:      new Date().toISOString(),
    }
    if (r.id) {
      const { error } = await supabase.from('routines').update(row).eq('id', r.id)
      if (error) return { ok: false, message: error.message }
      setRoutines(prev => prev.map(x => x.id === r.id ? { ...x, ...row, id: r.id } : x))
    } else {
      const { data, error } = await supabase.from('routines').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setRoutines(prev => [data, ...prev])
    }
    return { ok: true }
  }, [tenantId, session, contexto])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from('routines').update({ ativo: false }).eq('id', id)
    if (error) return { ok: false, message: error.message }
    setRoutines(prev => prev.filter(r => r.id !== id))
    return { ok: true }
  }, [])

  const saveExecution = useCallback(async (exec) => {
    const { data, error } = await supabase.from('routine_executions').insert({
      tenant_id:      tenantId,
      routine_id:     exec.routine_id,
      executado_por:  session?.user?.id,
      modo:           exec.modo || 'manual',
      status:         exec.status,
      snapshot_antes: exec.snapshot_antes || [],
      snapshot_depois: exec.snapshot_depois || [],
      resumo:         exec.resumo || {},
    }).select().single()
    if (error) { captureError('useRoutines.saveExecution', error); return { ok: false } }
    // Atualiza ultima_execucao da rotina
    await supabase.from('routines').update({ ultima_execucao: new Date().toISOString() }).eq('id', exec.routine_id)
    return { ok: true, data }
  }, [tenantId, session])

  const loadExecutions = useCallback(async (routineId) => {
    const { data, error } = await supabase
      .from('routine_executions')
      .select('*')
      .eq('routine_id', routineId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) captureError('useRoutines.loadExecutions', error)
    return data || []
  }, [])

  const revert = useCallback(async (execution, table) => {
    const snaps = execution.snapshot_antes || []
    if (!snaps.length) return { ok: false, message: 'Sem snapshot para reverter' }
    const errors = []
    for (const snap of snaps) {
      const { id, ...fields } = snap
      const { error } = await supabase.from(table).update(fields).eq('id', id)
      if (error) errors.push({ id, error: error.message })
    }
    const status = errors.length === 0 ? 'ok' : errors.length < snaps.length ? 'parcial' : 'erro'
    await supabase.from('routine_executions').update({
      revertido:    true,
      revertido_em: new Date().toISOString(),
      revertido_por: session?.user?.id,
    }).eq('id', execution.id)
    return { ok: status !== 'erro', errors }
  }, [session])

  return { routines, loading, reload: load, save, remove, saveExecution, loadExecutions, revert }
}
