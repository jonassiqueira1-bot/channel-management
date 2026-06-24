import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY = 'comissoes:aprovacoes_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useCommissionApprovals() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [aprovacoes, setAprovacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setAprovacoes(load())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('commission_approvals').select('*').order('periodo', { ascending: false })
    if (error) {
      isMock.current = true
      setAprovacoes(load())
    } else {
      isMock.current = false
      setAprovacoes(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const upsert = useCallback(async (record) => {
    if (isMock.current) {
      setAprovacoes(prev => {
        const idx = prev.findIndex(a => a.periodo === record.periodo && a.beneficiario_nome === record.beneficiario_nome)
        const next = idx >= 0 ? prev.map((a, i) => i === idx ? { ...a, ...record } : a) : [...prev, record]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const row = { ...record, tenant_id: tid.current, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('commission_approvals').upsert(row, { onConflict: 'tenant_id,periodo,beneficiario_nome' })
    if (error) return { ok: false, message: error.message }
    setAprovacoes(prev => {
      const idx = prev.findIndex(a => a.periodo === record.periodo && a.beneficiario_nome === record.beneficiario_nome)
      return idx >= 0 ? prev.map((a, i) => i === idx ? { ...a, ...record } : a) : [...prev, record]
    })
    return { ok: true }
  }, [])

  return { aprovacoes, setAprovacoes, loading, reload: fetch, upsert, isMock: isMock.current }
}
