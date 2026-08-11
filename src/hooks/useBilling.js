import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export function useBilling() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [tenant, setTenant] = useState(null)
  const [plan, setPlan] = useState(null)
  const [cobrancas, setCobrancas] = useState([])
  const [planHistory, setPlanHistory] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [pendingCancellation, setPendingCancellation] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile?.tenant_id) return
    setLoading(true)
    try {
      const [{ data: t }, { data: c }, { data: uc }, { data: ph }, { data: pc }] = await Promise.all([
        supabase.from('tenants')
          .select('id, name, status, plan, billing_plan_id, billing_name, billing_cpf_cnpj, billing_email, billing_phone, trial_ends_at, trial_charge_sent, asaas_value, asaas_next_due_date, grace_period_days, overdue_since, suspended_at, cancellation_requested_at, cancel_at')
          .eq('id', profile.tenant_id)
          .single(),
        supabase.from('asaas_cobrancas')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false }),
        supabase.rpc('count_active_users', { p_tenant_id: profile.tenant_id }),
        supabase.from('billing_plan_history')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .order('changed_at', { ascending: false }),
        supabase.from('tenant_cancellation_requests')
          .select('id')
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'pendente')
          .limit(1),
      ])
      setTenant(t)
      setCobrancas(c || [])
      setUserCount(uc || 0)
      setPlanHistory(ph || [])
      setPendingCancellation((pc || []).length > 0)

      if (t?.billing_plan_id) {
        const { data: p } = await supabase.from('billing_plans').select('*').eq('id', t.billing_plan_id).single()
        setPlan(p)
      }
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useEffect(() => { load() }, [load])

  const saveBillingData = useCallback(async (data) => {
    const { error } = await supabase.from('tenants')
      .update({ billing_name: data.name, billing_cpf_cnpj: data.cpf_cnpj, billing_email: data.email, billing_phone: data.phone })
      .eq('id', profile.tenant_id)
    if (error) return { ok: false, message: error.message }
    await load()
    return { ok: true }
  }, [profile?.tenant_id, load])

  // Não cancela nada sozinho — só registra o pedido. O cancelamento em si
  // (Asaas + status do tenant) é sempre feito manualmente por um admin no
  // Control Center, que vê essa solicitação como alerta.
  const requestCancellation = useCallback(async (motivo) => {
    const { error } = await supabase.from('tenant_cancellation_requests')
      .insert({ tenant_id: profile.tenant_id, motivo: motivo || null })
    if (error) return { ok: false, message: error.message }
    await load()
    return { ok: true }
  }, [profile?.tenant_id, load])

  return { tenant, plan, cobrancas, planHistory, userCount, pendingCancellation, loading, reload: load, saveBillingData, requestCancellation }
}
