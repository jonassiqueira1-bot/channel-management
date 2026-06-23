import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_ANALYTICS, MOCK_ALERTS } from '../data/mockDashboard'

function periodFilter(period) {
  const now = new Date()
  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return { gte: start }
  }
  if (period === 'last_3m') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    return { gte: d.toISOString() }
  }
  if (period === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1).toISOString()
    return { gte: start }
  }
  return null
}

async function fetchAnalytics(period) {
  const pf = periodFilter(period)

  // Busca paralela de todas as entidades necessárias
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  const ontemStr = ontem.toISOString().slice(0, 10)

  const [
    paymentsRes,
    companiesRes,
    oppsRes,
    projectsRes,
    contractsRes,
    oppsAllRes,
    paymentsInadRes,
  ] = await Promise.all([
    // Pagamentos no período (para receita CDU/SMS/Serviços)
    (() => {
      let q = supabase.from('payments').select('custom_fields, company_id, companies(nome_fantasia, razao_social)')
      if (pf) q = q.gte('created_at', pf.gte)
      return q
    })(),
    // Empresas ativas (franquias = tipo parceiro)
    supabase.from('companies').select('id, nome_fantasia, razao_social, tipo, status'),
    // Oportunidades em aberto
    supabase.from('opportunities').select('id, situacao, valor, stage_id, pipeline_stages(name)'),
    // Projetos ativos
    supabase.from('projects').select('id, status'),
    // Contratos ativos
    supabase.from('contracts').select('id, status, valor'),
    // Todas as opps para calcular taxa conversão
    supabase.from('opportunities').select('id, situacao'),
    // Pagamentos vencidos D+1 (inadimplência)
    supabase.from('payments').select('contract_id, vencimento, status, custom_fields')
      .in('status', ['pendente', 'vencido'])
      .lt('vencimento', ontemStr),
  ])

  const payments      = paymentsRes.data      || []
  const companies     = companiesRes.data     || []
  const opps          = oppsRes.data          || []
  const projects      = projectsRes.data      || []
  const contracts     = contractsRes.data     || []
  const oppsAll       = oppsAllRes.data       || []
  const paymentsInad  = paymentsInadRes.data  || []

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const cdu_receita      = payments.reduce((s, p) => s + (p.custom_fields?.amount_cdu      || 0), 0)
  const sms_receita      = payments.reduce((s, p) => s + (p.custom_fields?.amount_sms      || 0), 0)
  const servicos_receita = payments.reduce((s, p) => s + (p.custom_fields?.amount_services || 0), 0)

  const franquias_ativas = companies.filter(c => (c.tipo === 'parceiro' || c.tipo === 'canal') && c.status === 'ativo').length
  const oportunidades    = opps.filter(o => o.situacao === 'em_andamento').length
  const projetos_ativos  = projects.filter(p => p.status === 'em_andamento').length
  const contratos_ativos = contracts.filter(c => c.status === 'ativo').length

  // ── Inadimplência D+1 ─────────────────────────────────────────────────────
  const inadIdsSupabase = new Set(paymentsInad.map(p => p.contract_id).filter(Boolean))
  // fallback localStorage (modo mock / sem Supabase)
  const inadIdsLS = (() => {
    try {
      const raw = localStorage.getItem('pagamentos:data_v1')
      const pags = raw ? JSON.parse(raw) : []
      const ids = new Set()
      pags.forEach(p => {
        if ((p.status === 'pendente' || p.status === 'vencido') && p.due_date && p.due_date < ontemStr && p.contract_id)
          ids.add(String(p.contract_id))
      })
      return ids
    } catch { return new Set() }
  })()
  const inadIds = inadIdsSupabase.size > 0 ? inadIdsSupabase : inadIdsLS
  const contratos_inadimplentes = inadIds.size
  const valor_inadimplencia = (() => {
    // soma valor dos contratos inadimplentes
    const contratosList = contracts.length > 0 ? contracts : (() => {
      try { const r = localStorage.getItem('crm:contratos_v2'); return r ? JSON.parse(r) : [] } catch { return [] }
    })()
    return contratosList
      .filter(c => inadIds.has(String(c.id)))
      .reduce((s, c) => {
        const mrr = [...(c.itens_mrr||[]), ...(c.itens_servico||[])].reduce((a,i) => a + (parseFloat(i.valor)||0), 0)
        return s + (c.valor || mrr || 0)
      }, 0)
  })()

  const ganhas  = oppsAll.filter(o => o.situacao === 'ganho').length
  const fechadas = oppsAll.filter(o => o.situacao === 'ganho' || o.situacao === 'perdido').length
  const taxa_conversao = fechadas > 0 ? Math.round((ganhas / fechadas) * 100) : 0

  const contratosAtivos = contracts.filter(c => c.status === 'ativo')
  const ticket_medio = contratosAtivos.length > 0
    ? Math.round(contratosAtivos.reduce((s, c) => s + (c.valor || 0), 0) / contratosAtivos.length)
    : 0

  // ── Receita por empresa (gráfico de barras) ───────────────────────────────
  const revenueByCompany = {}
  payments.forEach(p => {
    const cid = p.company_id
    if (!cid) return
    if (!revenueByCompany[cid]) {
      const co = companies.find(c => c.id === cid)
      revenueByCompany[cid] = { nome: co?.nome_fantasia || co?.razao_social || 'Empresa', cdu: 0, sms: 0, servicos: 0 }
    }
    revenueByCompany[cid].cdu      += p.custom_fields?.amount_cdu      || 0
    revenueByCompany[cid].sms      += p.custom_fields?.amount_sms      || 0
    revenueByCompany[cid].servicos += p.custom_fields?.amount_services || 0
  })
  const COLORS = ['var(--accent)','#0EA5E9','#10B981','#F59E0B','#EF4444','var(--accent)']
  const por_franquia = Object.values(revenueByCompany)
    .sort((a, b) => (b.cdu + b.sms + b.servicos) - (a.cdu + a.sms + a.servicos))
    .slice(0, 6)
    .map((r, i) => ({ ...r, color: COLORS[i % COLORS.length] }))

  // ── Pipeline por etapa ───────────────────────────────────────────────────
  const pipelineMap = {}
  opps.filter(o => o.situacao === 'em_andamento').forEach(o => {
    const etapa = o.pipeline_stages?.name || 'Sem etapa'
    if (!pipelineMap[etapa]) pipelineMap[etapa] = { etapa, qtd: 0, valor: 0 }
    pipelineMap[etapa].qtd++
    pipelineMap[etapa].valor += o.valor || 0
  })
  const pipeline = Object.values(pipelineMap)

  return {
    cdu_receita, sms_receita, servicos_receita,
    franquias_ativas, oportunidades, projetos_ativos,
    contratos_ativos, taxa_conversao, ticket_medio,
    contratos_inadimplentes, valor_inadimplencia,
    por_franquia, pipeline,
    questionarios: 0,
    atividades_recentes: [],
  }
}

export function useDashboard(period = 'this_month') {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [analytics, setAnalytics] = useState(null)
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const isMockMode = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      const isISV = !profile || profile.role === 'admin_isv'
      setAnalytics(isISV ? MOCK_ANALYTICS.isv : MOCK_ANALYTICS.franchise)
      setAlerts(MOCK_ALERTS)
      isMockMode.current = true
      setLoading(false)
      return
    }

    try {
      const [analyticsData, alertsRes] = await Promise.all([
        fetchAnalytics(period),
        supabase.from('dashboard_alerts')
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      isMockMode.current = false
      setAnalytics(analyticsData)
      setAlerts(alertsRes.error ? [] : (alertsRes.data || []))
    } catch {
      isMockMode.current = false
      setAnalytics({ cdu_receita:0, sms_receita:0, servicos_receita:0, franquias_ativas:0, oportunidades:0, projetos_ativos:0, contratos_ativos:0, taxa_conversao:0, ticket_medio:0, contratos_inadimplentes:0, valor_inadimplencia:0, por_franquia:[], pipeline:[], questionarios:0, atividades_recentes:[] })
      setAlerts([])
    }
    setLoading(false)
  }, [session, profile, period])

  useEffect(() => { load() }, [load])

  const dismissAlert = useCallback(async (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
    if (!isMockMode.current) {
      await supabase.from('dashboard_alerts').update({ is_resolved: true }).eq('id', id)
    }
  }, [])

  return { analytics, alerts, loading, reload: load, dismissAlert, isMock: isMockMode.current }
}
