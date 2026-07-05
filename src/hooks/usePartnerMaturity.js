import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

// ─── Origens disponíveis ──────────────────────────────────────────────────────
export const ORIGENS = [
  { value: 'sellers',      label: 'Vendedores vinculados'   },
  { value: 'oportunidades', label: 'Oportunidades ativas'   },
  { value: 'contracts',    label: 'Contratos ativos'        },
  { value: 'actions',      label: 'Ações realizadas'        },
  { value: 'habilitacoes', label: 'Habilitações vinculadas' },
]

export const CONDICOES = [
  { value: 'exists',         label: 'Tem pelo menos 1 registro'          },
  { value: 'count_gte',      label: 'Tem pelo menos N registros'         },
  { value: 'count_gte_days', label: 'Tem N registros nos últimos X dias' },
]

// ─── Hook de parâmetros ───────────────────────────────────────────────────────
export function usePartnerMaturity() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [params, setParams]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    let q = supabase
      .from('partner_maturity_params')
      .select('*')
      .order('ordem')
      .order('created_at')
    const { data } = await q
    setParams(data || [])
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (param) => {
    const tid = profile?.tenant_id
    if (!tid) return { ok: false }
    const row = { ...param, tenant_id: tid, branch_id: activeBranchId || profile?.branch_id || null, updated_at: new Date().toISOString() }
    const { data, error } = param.id
      ? await supabase.from('partner_maturity_params').update(row).eq('id', param.id).select().single()
      : await supabase.from('partner_maturity_params').insert(row).select().single()
    if (error) return { ok: false, error }
    await fetch()
    return { ok: true, data }
  }, [profile, fetch])

  const remove = useCallback(async (id) => {
    await supabase.from('partner_maturity_params').delete().eq('id', id)
    await fetch()
  }, [fetch])

  return { params, loading, reload: fetch, save, remove }
}


// ─── Hook de habilitações do parceiro ────────────────────────────────────────
export function usePartnerHabilitacoes(parceiro_id) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [links, setLinks]     = useState([]) // [{ id, habilitacao_id }]
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user || !parceiro_id) return
    setLoading(true)
    const { data } = await supabase
      .from('partner_habilitacoes')
      .select('id, habilitacao_id')
      .eq('parceiro_id', parceiro_id)
    setLinks(data || [])
    setLoading(false)
  }, [session, parceiro_id])

  useEffect(() => { fetch() }, [fetch])

  const link = useCallback(async (habilitacao_id) => {
    const tid = profile?.tenant_id
    if (!tid) return
    await supabase.from('partner_habilitacoes').insert({ tenant_id: tid, parceiro_id, habilitacao_id: String(habilitacao_id) })
    await fetch()
  }, [profile, parceiro_id, fetch])

  const unlink = useCallback(async (habilitacao_id) => {
    await supabase.from('partner_habilitacoes').delete()
      .eq('parceiro_id', parceiro_id)
      .eq('habilitacao_id', String(habilitacao_id))
    await fetch()
  }, [parceiro_id, fetch])

  const linkedIds = new Set(links.map(l => String(l.habilitacao_id)))

  return { links, linkedIds, loading, link, unlink }
}

// ─── Hook de scores ───────────────────────────────────────────────────────────
export function usePartnerScores(parceiros, params) {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [scores, setScores]           = useState({})
  const [calculating, setCalculating] = useState(false)

  // Carrega o score mais recente de cada parceiro
  const loadLatestScores = useCallback(async () => {
    if (!session?.user || !parceiros.length) return
    const ids = parceiros.map(p => p.id)
    const { data } = await supabase
      .from('partner_maturity_scores')
      .select('parceiro_id, score_pct, detalhes, calculado_em')
      .in('parceiro_id', ids)
      .order('calculado_em', { ascending: false })
    if (!data) return
    const map = {}
    data.forEach(row => {
      if (!map[row.parceiro_id]) map[row.parceiro_id] = row
    })
    setScores(map)
  }, [session, parceiros])

  useEffect(() => { loadLatestScores() }, [loadLatestScores])

  // Calcula e persiste scores para todos os parceiros
  const calculate = useCallback(async () => {
    const tid = profile?.tenant_id
    if (!tid || !parceiros.length || !params.length) return
    setCalculating(true)

    const activeParams = params.filter(p => p.ativo)
    const totalPeso    = activeParams.reduce((s, p) => s + p.peso, 0)

    // ── Busca dados de todas as origens ──────────────────────────────────────
    // sellers: vínculo via custom_fields.franquia_id → parceiro.id
    // oportunidades: vínculo via owner_id → seller → franquia_id
    // contracts: vínculo via company_id → companies.custom_fields.franquia_ar_id → parceiro.id
    // actions: vínculo via custom_fields.empresa_id → parceiro.id
    // habilitacoes: vínculo via partner_habilitacoes table
    const [sellersRes, oppsRes, contractsRes, companiesRes, actionsRes, habLinksRes] = await Promise.all([
      supabase.from('sellers').select('id, custom_fields, status'),
      supabase.from('oportunidades').select('id, company_id, owner_id, situacao, created_at'),
      supabase.from('contracts').select('id, company_id, status'),
      supabase.from('companies').select('id, custom_fields'),
      supabase.from('actions').select('id, custom_fields, created_at'),
      supabase.from('partner_habilitacoes').select('parceiro_id, habilitacao_id'),
    ])

    const sellers   = sellersRes.data   || []
    const opps      = oppsRes.data      || []
    const contracts = contractsRes.data || []
    const companies = companiesRes.data || []
    const actions   = actionsRes.data   || []
    const habLinks  = habLinksRes.data  || []

    // Índice: parceiro_id → Set<seller_id>
    const parceiroSellers = {}
    sellers.forEach(s => {
      const fid = s.custom_fields?.franquia_id
      if (!fid) return
      if (!parceiroSellers[fid]) parceiroSellers[fid] = new Set()
      parceiroSellers[fid].add(s.id)
    })

    // Índice: company_id → parceiro_id (via campo Canal da Empresa)
    const companyParceiro = {}
    companies.forEach(c => {
      const fid = c.custom_fields?.franquia_ar_id
      if (fid) companyParceiro[c.id] = fid
    })

    // Índice: parceiro_id → count de habilitações vinculadas
    const parceiroHabCount = {}
    habLinks.forEach(h => {
      parceiroHabCount[h.parceiro_id] = (parceiroHabCount[h.parceiro_id] || 0) + 1
    })

    const now = new Date()

    function countFor(origem, parceiro_id, param) {
      const sellerIds = parceiroSellers[parceiro_id] || new Set()

      switch (origem) {
        // Contatos Canais vinculados ao parceiro (alias de sellers)
        case 'contacts':
        // Vendedores vinculados ao parceiro
        case 'sellers':
          return sellers.filter(s => {
            const fid = s.custom_fields?.franquia_id
            return fid === parceiro_id && s.status !== 'inativo'
          }).length

        // Oportunidades das empresas vinculadas ao parceiro
        case 'oportunidades': {
          let list = opps.filter(o =>
            companyParceiro[o.company_id] === parceiro_id && o.situacao === 'em_andamento'
          )
          if (param.janela_dias) {
            const cutoff = new Date(now - param.janela_dias * 86400000)
            list = list.filter(o => new Date(o.created_at) >= cutoff)
          }
          return list.length
        }

        // Contratos ativos de empresas vinculadas ao parceiro via campo Canal
        case 'contracts':
          return contracts.filter(c =>
            companyParceiro[c.company_id] === parceiro_id && c.status === 'ativo'
          ).length

        // Ações registradas para este parceiro (via empresa_id no custom_fields)
        case 'actions': {
          let list = actions.filter(a => a.custom_fields?.empresa_id === parceiro_id)
          if (param.janela_dias) {
            const cutoff = new Date(now - param.janela_dias * 86400000)
            list = list.filter(a => new Date(a.created_at) >= cutoff)
          }
          return list.length
        }

        // Habilitações vinculadas via partner_habilitacoes
        case 'habilitacoes':
          return parceiroHabCount[parceiro_id] || 0

        default:
          return 0
      }
    }

    const newScores = {}
    const rows      = []

    for (const parceiro of parceiros) {
      const detalhes = {}
      let somaPeso   = 0

      for (const p of activeParams) {
        const count    = countFor(p.origem, parceiro.id, p)
        const atingido = count >= p.valor_min
        detalhes[p.id] = { atingido, valor: count, peso: p.peso }
        if (atingido) somaPeso += p.peso
      }

      const score_pct = totalPeso > 0 ? Math.round((somaPeso / totalPeso) * 100) : 0
      newScores[parceiro.id] = { score_pct, detalhes, calculado_em: now.toISOString() }
      rows.push({ tenant_id: tid, parceiro_id: parceiro.id, score_pct, detalhes })
    }

    if (rows.length) {
      await supabase.from('partner_maturity_scores').insert(rows)
    }

    setScores(newScores)
    setCalculating(false)
  }, [profile, parceiros, params])

  // Histórico de um parceiro específico
  const getHistory = useCallback(async (parceiro_id) => {
    const { data } = await supabase
      .from('partner_maturity_scores')
      .select('score_pct, detalhes, calculado_em')
      .eq('parceiro_id', parceiro_id)
      .order('calculado_em', { ascending: true })
      .limit(30)
    return data || []
  }, [])

  return { scores, calculating, calculate, getHistory }
}
