import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// ─── Hook de habilitações do Contato Canal (seller) ──────────────────────────
// Mirror de usePartnerHabilitacoes (usePartnerMaturity.js) — mesma estrutura,
// mas relacionando habilitações a sellers em vez de parceiros.
export function useSellerHabilitacoes(seller_id) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [links, setLinks]     = useState([]) // [{ id, habilitacao_id, created_at, acao_id, actions }]
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user || !seller_id) return
    setLoading(true)
    const { data } = await supabase
      .from('seller_habilitacoes')
      .select('id, habilitacao_id, created_at, acao_id, actions(id, titulo)')
      .eq('seller_id', seller_id)
      .order('created_at', { ascending: false })
    setLinks(data || [])
    setLoading(false)
  }, [session, seller_id])

  useEffect(() => { fetch() }, [fetch])

  const link = useCallback(async (habilitacao_id) => {
    const tid = profile?.tenant_id
    if (!tid) return
    await supabase.from('seller_habilitacoes').insert({
      tenant_id: tid, seller_id, habilitacao_id: String(habilitacao_id),
      branch_id: profile?.branch_id || null,
    })
    await fetch()
  }, [profile, seller_id, fetch])

  const unlink = useCallback(async (habilitacao_id) => {
    await supabase.from('seller_habilitacoes').delete()
      .eq('seller_id', seller_id)
      .eq('habilitacao_id', String(habilitacao_id))
    await fetch()
  }, [seller_id, fetch])

  const linkedIds = new Set(links.map(l => String(l.habilitacao_id)))

  return { links, linkedIds, loading, link, unlink }
}

// ─── Hook de concessão de Habilitação via Ação (Treinamento) ─────────────────
// Concede a MESMA habilitação (seller_habilitacoes) a partir da aba
// Participantes de uma Ação — escopado à combinação (acao_id, habilitacao_id)
// pra nunca mexer em vínculos manuais desse seller ou de outras Ações.
export function useAcaoHabilitacaoGrants(acao_id, habilitacao_id) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [grantedIds, setGrantedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user || !acao_id || !habilitacao_id) { setGrantedIds(new Set()); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('seller_habilitacoes')
      .select('seller_id')
      .eq('acao_id', acao_id)
      .eq('habilitacao_id', String(habilitacao_id))
    setGrantedIds(new Set((data || []).map(r => String(r.seller_id))))
    setLoading(false)
  }, [session, acao_id, habilitacao_id])

  useEffect(() => { fetch() }, [fetch])

  const grant = useCallback(async (seller_id) => {
    const tid = profile?.tenant_id
    if (!tid || !habilitacao_id) return
    await supabase.from('seller_habilitacoes').insert({
      tenant_id: tid, seller_id, habilitacao_id: String(habilitacao_id),
      acao_id, branch_id: profile?.branch_id || null,
    })
    await fetch()
  }, [profile, habilitacao_id, acao_id, fetch])

  const revoke = useCallback(async (seller_id) => {
    await supabase.from('seller_habilitacoes').delete()
      .eq('seller_id', seller_id)
      .eq('habilitacao_id', String(habilitacao_id))
      .eq('acao_id', acao_id)
    await fetch()
  }, [habilitacao_id, acao_id, fetch])

  return { grantedIds, grant, revoke, loading }
}
