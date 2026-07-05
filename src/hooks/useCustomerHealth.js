import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'
import { MOCK_CUSTOMER_HEALTH, STORAGE_KEY as MOCK_KEY } from '../data/mockCustomerSuccess'

function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useCustomerHealth() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setRecords(load() ?? MOCK_CUSTOMER_HEALTH)
      setLoading(false)
      return
    }
    let _q = supabase.from('customer_health').select('*')
    if (activeBranchId) _q = _q.eq('branch_id', activeBranchId)
    const { data, error } = await _q.order('company_name')
    if (error) {
      isMock.current = true
      setRecords(load() ?? MOCK_CUSTOMER_HEALTH)
    } else {
      isMock.current = false
      setRecords(data || [])
    }
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { fetch() }, [fetch])

  const isUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setRecords(prev => {
        const idx = prev.findIndex(r => r.id === record.id)
        const next = idx >= 0 ? prev.map(r => r.id === record.id ? record : r) : [...prev, { ...record, id: record.id || `ph_${Date.now()}` }]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const toRow = (r) => ({
      tenant_id:       tid.current,
      branch_id:       r.branch_id       || null,
      company_id:      isUuid(r.company_id) ? r.company_id : null,
      company_name:    r.company_name    || '',
      company_city:    r.company_city    || null,
      company_uf:      r.company_uf      || null,
      csm:             r.csm             || null,
      laer_stage:      r.laer_stage      || null,
      touch_model:     r.touch_model     || null,
      health_score:    r.health_score    != null ? Number(r.health_score) : null,
      renewal_date:    r.renewal_date    || null,
      notes:           r.notes           || null,
      action_plans:    r.action_plans    || [],
      checkins:        r.checkins        || [],
      attachments:     r.attachments     || [],
      contract_id:     isUuid(r.contract_id) ? r.contract_id : null,
      contract_numero: r.contract_numero || null,
      playbook_id:     r.playbook_id     || null,
      criado_em:       r.criado_em       || new Date().toISOString().slice(0, 10),
      updated_at:      new Date().toISOString(),
    })
    const { id } = record
    const base = toRow(record)
    if (isUuid(id)) {
      // UPDATE
      const { error } = await supabase.from('customer_health').update(base).eq('id', id)
      if (error) return { ok: false, message: error.message }
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...record } : r))
    } else {
      // INSERT — deixa DB gerar UUID
      const { data, error } = await supabase.from('customer_health').insert(base).select().single()
      if (error) {
        const msg = error.code === '23505'
          ? 'Esta empresa já possui um registro de Sucesso do Cliente.'
          : error.message
        return { ok: false, message: msg }
      }
      setRecords(prev => [...prev, { ...record, id: data.id }])
    }
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setRecords(prev => { const next = prev.filter(r => r.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await softDelete('customer_health', id)
    if (error) return { ok: false, message: error.message }
    setRecords(prev => prev.filter(r => r.id !== id))
    return { ok: true }
  }, [])

  return { records, setRecords, loading, reload: fetch, save, remove, isMock: isMock.current }
}
