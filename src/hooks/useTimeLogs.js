import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_TIME_LOGS } from '../data/mockProjetos'

const LS_KEY = 'projetos:timeLogs_v1'

function rowToLog(row) {
  return {
    id:             row.id,
    project_id:     row.project_id || null,
    phase_id:       row.phase_id   || null,
    tenant_id:      row.tenant_id,
    user_id:        row.user_id    || null,
    user_name:      row.user_name  || '',
    hours_executed: Number(row.hours_executed) || 0,
    description:    row.description || '',
    logged_at:      row.logged_at  || '',
  }
}

function logToRow(l, tenantId, branchId) {
  return {
    tenant_id:      tenantId,
    branch_id:      branchId || null,
    project_id:     l.project_id   || null,
    phase_id:       l.phase_id     || null,
    user_id:        l.user_id      || null,
    user_name:      l.user_name    || '',
    hours_executed: Number(l.hours_executed) || 0,
    description:    l.description  || '',
    logged_at:      l.logged_at    || new Date().toISOString().slice(0, 10),
  }
}

export function useTimeLogs() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [logs, setLogs] = useState(() => {
    try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })
  const [loading, setLoading] = useState(true)
  const isMock = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .order('logged_at', { ascending: false })
    if (error) {
      captureError('useTimeLogs', error)
      isMock.current = true
      // Filtra mock data: mantém só logs com project_id UUID (reais) ou sem project_id
      setLogs(prev => {
        const real = prev.filter(l => !l.project_id || (typeof l.project_id === 'string' && l.project_id.includes('-')))
        try { localStorage.setItem(LS_KEY, JSON.stringify(real)) } catch {}
        return real
      })
      setLoading(false)
      return
    }
    isMock.current = false
    const mapped = (data || []).map(rowToLog)

    // Lê logs locais (podem ter sido salvos enquanto Supabase estava vazio)
    let localLogs = []
    try { const s = localStorage.getItem(LS_KEY); localLogs = s ? JSON.parse(s) : [] } catch {}

    // Nunca sobrescreve localStorage com array vazio se já tem dados locais
    const merged = mapped.length > 0 ? mapped : localLogs
    setLogs(merged)
    if (mapped.length > 0) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(mapped)) } catch {}
    }
    setLoading(false)
  }, [session, tenantId, branchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (l) => {
    if (isMock.current) {
      setLogs(prev => {
        const idx = prev.findIndex(x => x.id === l.id)
        const next = idx >= 0
          ? prev.map((x, i) => i === idx ? l : x)
          : [...prev, { ...l, id: l.id || `tl_${Date.now()}` }]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
      return { ok: true }
    }
    const isUuid = typeof l.id === 'string' && l.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('time_logs').update(logToRow(l, tenantId, branchId)).eq('id', l.id)
      if (error) {
        // fallback: atualiza só o estado local e localStorage
        setLogs(prev => { const n = prev.map(x => x.id === l.id ? l : x); try { localStorage.setItem(LS_KEY, JSON.stringify(n)) } catch {} return n })
        return { ok: false, message: error.message }
      }
      setLogs(prev => prev.map(x => x.id === l.id ? l : x))
    } else {
      const { data, error } = await supabase.from('time_logs').insert(logToRow(l, tenantId, branchId)).select().single()
      if (error) {
        // fallback: salva no localStorage para não perder o lançamento
        setLogs(prev => { const n = [...prev, l]; try { localStorage.setItem(LS_KEY, JSON.stringify(n)) } catch {} return n })
        return { ok: false, message: error.message }
      }
      setLogs(prev => { const n = [...prev, rowToLog(data)]; try { localStorage.setItem(LS_KEY, JSON.stringify(n)) } catch {} return n })
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setLogs(prev => { const n = prev.filter(x => x.id !== id); try { localStorage.setItem(LS_KEY, JSON.stringify(n)) } catch {} return n })
      return { ok: true }
    }
    const { error } = await supabase.from('time_logs').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setLogs(prev => prev.filter(x => x.id !== id))
    return { ok: true }
  }, [])

  return { logs, loading, reload: load, save, remove }
}
