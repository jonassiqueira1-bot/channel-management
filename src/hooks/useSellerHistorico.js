import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Histórico de Ações e Oportunidades de um Contato Canal (seller) ─────────
// Consultas somente-leitura — o vínculo em si (quem participa de qual Ação ou
// Oportunidade) só é editado na origem (Ações/Pipeline), nunca por aqui. Mesmo
// mapeamento de ids já usado em useSellerMaturity.js pro cálculo de maturidade:
// acao_membros.user_id é sellers.id direto; oportunidade_membros.user_id é
// profiles.id, então o elo com o seller passa por profiles.contact_id.

export function useSellerAcoesHistorico(seller_id) {
  const { session } = useAuth()
  const [acoes, setAcoes]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user || !seller_id) return
    setLoading(true)
    const { data } = await supabase
      .from('acao_membros')
      .select('acao_id, papel, created_at, actions(id, titulo, tipo, status, data_prevista, company_id, companies(nome_fantasia, razao_social))')
      .eq('user_id', seller_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setAcoes((data || []).filter(m => m.actions).map(m => ({ ...m.actions, papel: m.papel })))
    setLoading(false)
  }, [session, seller_id])

  useEffect(() => { fetch() }, [fetch])

  return { acoes, loading, reload: fetch }
}

export function useSellerOportunidadesHistorico(seller_id) {
  const { session } = useAuth()
  const [oportunidades, setOportunidades] = useState([])
  const [loading, setLoading]             = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user || !seller_id) return
    setLoading(true)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id')
      .eq('contact_id', seller_id)
      .eq('role', 'contato_canal')
    const profileIds = (profs || []).map(p => p.id)
    if (!profileIds.length) { setOportunidades([]); setLoading(false); return }

    const { data } = await supabase
      .from('oportunidade_membros')
      .select('oportunidade_id, tipo_membro, created_at, oportunidades(id, titulo, situacao, valor, company_id, created_at, companies(nome_fantasia, razao_social))')
      .in('user_id', profileIds)
      .eq('tipo_membro', 'canal')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setOportunidades((data || []).filter(m => m.oportunidades).map(m => m.oportunidades))
    setLoading(false)
  }, [session, seller_id])

  useEffect(() => { fetch() }, [fetch])

  return { oportunidades, loading, reload: fetch }
}
