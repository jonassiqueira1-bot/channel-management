import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// ─── Origens disponíveis ──────────────────────────────────────────────────────
export const ORIGENS = [
  { value: 'contacts',     label: 'Contatos mapeados'      },
  { value: 'oportunidades', label: 'Oportunidades ativas'  },
  { value: 'contracts',    label: 'Contratos ativos'        },
  { value: 'actions',      label: 'Ações realizadas'        },
  { value: 'habilitacoes', label: 'Habilitações vigentes'   },
]

export const CONDICOES = [
  { value: 'exists',         label: 'Tem pelo menos 1 registro'       },
  { value: 'count_gte',      label: 'Tem pelo menos N registros'      },
  { value: 'count_gte_days', label: 'Tem N registros nos últimos X dias' },
]

// ─── Hook principal ───────────────────────────────────────────────────────────
export function usePartnerMaturity() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [params, setParams]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    const { data } = await supabase
      .from('partner_maturity_params')
      .select('*')
      .order('ordem')
      .order('created_at')
    setParams(data || [])
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (param) => {
    const tid = profile?.tenant_id
    if (!tid) return { ok: false }
    const row = { ...param, tenant_id: tid, updated_at: new Date().toISOString() }
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

// ─── Hook de scores ───────────────────────────────────────────────────────────
export function usePartnerScores(parceiros, params) {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [scores, setScores]         = useState({}) // parceiro_id → { score_pct, detalhes }
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
    const totalPeso = activeParams.reduce((s, p) => s + p.peso, 0)

    // Busca dados de todas as origens de uma vez
    const [
      contactsRes, oppsRes, contractsRes, actionsRes, habRes
    ] = await Promise.all([
      supabase.from('contacts').select('id, company_id'),
      supabase.from('oportunidades').select('id, company_id, situacao, updated_at'),
      supabase.from('contracts').select('id, company_id, status'),
      supabase.from('actions').select('id, company_id, created_at, tipo'),
      supabase.from('habilitacoes').select('id, company_id, status, validade'),
    ])

    const contacts    = contactsRes.data    || []
    const opps        = oppsRes.data        || []
    const contracts   = contractsRes.data   || []
    const actions     = actionsRes.data     || []
    const habs        = habRes.data         || []

    const now = new Date()

    function countFor(origem, parceiro_id, param) {
      const pid = parceiro_id
      switch (origem) {
        case 'contacts':
          return contacts.filter(r => r.company_id === pid).length
        case 'oportunidades':
          return opps.filter(r => r.company_id === pid && r.situacao === 'em_andamento').length
        case 'contracts':
          return contracts.filter(r => r.company_id === pid && r.status === 'ativo').length
        case 'actions': {
          let list = actions.filter(r => r.company_id === pid)
          if (param.janela_dias) {
            const cutoff = new Date(now - param.janela_dias * 86400000)
            list = list.filter(r => new Date(r.created_at) >= cutoff)
          }
          return list.length
        }
        case 'habilitacoes':
          return habs.filter(r => r.company_id === pid && r.status === 'ativo').length
        default:
          return 0
      }
    }

    const newScores = {}
    const rows = []

    for (const parceiro of parceiros) {
      const detalhes = {}
      let somaPeso = 0

      for (const p of activeParams) {
        const count = countFor(p.origem, parceiro.id, p)
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
      .select('score_pct, calculado_em')
      .eq('parceiro_id', parceiro_id)
      .order('calculado_em', { ascending: true })
      .limit(30)
    return data || []
  }, [])

  return { scores, calculating, calculate, getHistory }
}
