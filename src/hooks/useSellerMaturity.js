import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

// ─── Origens disponíveis (Contato Canal = pessoa, não a franquia) ─────────────
export const ORIGENS = [
  { value: 'oportunidades',        label: 'Oportunidades (membro canal)'        },
  { value: 'oportunidades_ganhas', label: 'Oportunidades ganhas (membro canal)' },
  { value: 'contracts',            label: 'Contratos ativos das empresas envolvidas' },
  { value: 'acoes',                label: 'Ações participadas' },
]

export const CONDICOES = [
  { value: 'exists',         label: 'Tem pelo menos 1 registro'          },
  { value: 'count_gte',      label: 'Tem pelo menos N registros'         },
  { value: 'count_gte_days', label: 'Tem N registros nos últimos X dias' },
]

// ─── Hook de parâmetros ───────────────────────────────────────────────────────
export function useSellerMaturity() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [params, setParams]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    const { data } = await supabase
      .from('seller_maturity_params')
      .select('*')
      .order('ordem')
      .order('created_at')
    setParams(data || [])
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (param) => {
    const tid = profile?.tenant_id
    if (!tid) return { ok: false }
    const row = { ...param, tenant_id: tid, branch_id: activeBranchId || profile?.branch_id || null, updated_at: new Date().toISOString() }
    const { data, error } = param.id
      ? await supabase.from('seller_maturity_params').update(row).eq('id', param.id).select().single()
      : await supabase.from('seller_maturity_params').insert(row).select().single()
    if (error) return { ok: false, error }
    await fetch()
    return { ok: true, data }
  }, [profile, activeBranchId, fetch])

  const remove = useCallback(async (id) => {
    await softDelete('seller_maturity_params', id)
    await fetch()
  }, [fetch])

  return { params, loading, reload: fetch, save, remove }
}

// Chave de cache lido pelo motor de Indicadores (settings/Indicadores.js) —
// mesmo padrão dos outros módulos (opps_cache_v1, cs:customer_health_v1 etc).
const INDICADORES_CACHE_KEY = 'vendedores:maturidade_v1'

function persistParaIndicadores(sellers, scoresMap) {
  try {
    const rows = sellers.map(s => ({
      id: s.id, nome: s.nome, status: s.status,
      score_pct: scoresMap[s.id]?.score_pct ?? null,
    }))
    localStorage.setItem(INDICADORES_CACHE_KEY, JSON.stringify(rows))
  } catch {}
}

// ─── Hook de scores ───────────────────────────────────────────────────────────
export function useSellerScores(sellers, params) {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [scores, setScores]           = useState({})
  const [calculating, setCalculating] = useState(false)

  const loadLatestScores = useCallback(async () => {
    if (!session?.user || !sellers.length) return
    const ids = sellers.map(s => s.id)
    const { data } = await supabase
      .from('seller_maturity_scores')
      .select('seller_id, score_pct, detalhes, calculado_em')
      .in('seller_id', ids)
      .order('calculado_em', { ascending: false })
    if (!data) return
    const map = {}
    data.forEach(row => { if (!map[row.seller_id]) map[row.seller_id] = row })
    persistParaIndicadores(sellers, map)
    setScores(map)
  }, [session, sellers])

  useEffect(() => { loadLatestScores() }, [loadLatestScores])

  // Calcula e persiste scores para todos os Contatos Canais
  const calculate = useCallback(async () => {
    const tid = profile?.tenant_id
    if (!tid || !sellers.length || !params.length) return
    setCalculating(true)

    const activeParams = params.filter(p => p.ativo)
    const totalPeso     = activeParams.reduce((s, p) => s + p.peso, 0)

    // Vínculo do Contato Canal com Oportunidades: oportunidade_membros.user_id
    // é profiles.id (usuário com papel='contato_canal'), não sellers.id
    // diretamente — o elo real é profiles.contact_id -> sellers.id (mesmo
    // modelo de OppEquipeTab/poolCanais em Pipeline.js).
    const [membrosRes, oppsRes, contractsRes, profilesRes, acaoMembrosRes] = await Promise.all([
      supabase.from('oportunidade_membros').select('oportunidade_id, user_id, tipo_membro'),
      supabase.from('oportunidades').select('id, company_id, situacao, created_at'),
      supabase.from('contracts').select('id, company_id, status'),
      supabase.from('profiles').select('id, contact_id').eq('role', 'contato_canal'),
      supabase.from('acao_membros').select('acao_id, user_id, created_at'),
    ])

    const membros     = (membrosRes.data   || []).filter(m => m.tipo_membro === 'canal')
    const opps        = oppsRes.data      || []
    const contracts   = contractsRes.data || []
    const acaoMembros = acaoMembrosRes.data || [] // user_id aqui já é sellers.id direto
    const oppById     = Object.fromEntries(opps.map(o => [o.id, o]))

    // seller.id -> Set<profiles.id> (um vendedor pode, na teoria, ter mais de
    // um usuário de plataforma vinculado ao mesmo contact_id)
    const profileIdsPorSeller = {}
    ;(profilesRes.data || []).forEach(p => {
      if (!p.contact_id) return
      const sid = String(p.contact_id)
      if (!profileIdsPorSeller[sid]) profileIdsPorSeller[sid] = new Set()
      profileIdsPorSeller[sid].add(String(p.id))
    })

    const now = new Date()

    function countFor(origem, seller_id, param) {
      const profileIds = profileIdsPorSeller[String(seller_id)] || new Set()
      const minhasOpps = membros.filter(m => profileIds.has(String(m.user_id))).map(m => oppById[m.oportunidade_id]).filter(Boolean)

      switch (origem) {
        case 'oportunidades': {
          let list = minhasOpps
          if (param.janela_dias) {
            const cutoff = new Date(now - param.janela_dias * 86400000)
            list = list.filter(o => new Date(o.created_at) >= cutoff)
          }
          return list.length
        }
        case 'oportunidades_ganhas': {
          let list = minhasOpps.filter(o => o.situacao === 'ganha')
          if (param.janela_dias) {
            const cutoff = new Date(now - param.janela_dias * 86400000)
            list = list.filter(o => new Date(o.created_at) >= cutoff)
          }
          return list.length
        }
        case 'contracts': {
          const companyIds = new Set(minhasOpps.map(o => String(o.company_id)))
          return contracts.filter(c => companyIds.has(String(c.company_id)) && c.status === 'ativo').length
        }
        case 'acoes': {
          let list = acaoMembros.filter(m => String(m.user_id) === String(seller_id))
          if (param.janela_dias) {
            const cutoff = new Date(now - param.janela_dias * 86400000)
            list = list.filter(m => new Date(m.created_at) >= cutoff)
          }
          return list.length
        }
        default:
          return 0
      }
    }

    const newScores = {}
    const rows      = []

    for (const seller of sellers) {
      const detalhes = {}
      let somaPeso    = 0

      for (const p of activeParams) {
        const count    = countFor(p.origem, seller.id, p)
        const atingido = count >= p.valor_min
        detalhes[p.id] = { atingido, valor: count, peso: p.peso }
        if (atingido) somaPeso += p.peso
      }

      const score_pct = totalPeso > 0 ? Math.round((somaPeso / totalPeso) * 100) : 0
      newScores[seller.id] = { score_pct, detalhes, calculado_em: now.toISOString() }
      rows.push({ tenant_id: tid, seller_id: seller.id, score_pct, detalhes })
    }

    if (rows.length) {
      await supabase.from('seller_maturity_scores').insert(rows)
    }

    persistParaIndicadores(sellers, newScores)
    setScores(newScores)
    setCalculating(false)
  }, [profile, sellers, params])

  const getHistory = useCallback(async (seller_id) => {
    const { data } = await supabase
      .from('seller_maturity_scores')
      .select('score_pct, detalhes, calculado_em')
      .eq('seller_id', seller_id)
      .order('calculado_em', { ascending: true })
      .limit(30)
    return data || []
  }, [])

  return { scores, calculating, calculate, getHistory }
}
