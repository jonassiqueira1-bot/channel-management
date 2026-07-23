import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { rowToEmpresa } from './useCompanies'

// Aplica os mesmos 8 filtros + busca usados pelo browse de Empresas.js numa
// query do Supabase — reaproveitado tanto pela busca paginada (linhas da
// tabela) quanto pela busca leve de agregados (KPIs), pra nunca divergir.
function applyFilters(q, { search, filters }) {
  if (search) {
    // PostgREST usa `*` como wildcard dentro de .or(), não `%` — e vírgula/
    // parênteses quebram a mini-linguagem de filtro, então saneia antes.
    const term = search.replace(/[,()*]/g, '').trim()
    if (term) {
      q = q.or(`razao_social.ilike.*${term}*,nome_fantasia.ilike.*${term}*,cnpj.ilike.*${term}*,address->>cidade.ilike.*${term}*`)
    }
  }
  if (filters.status)  q = q.eq('status', filters.status)
  if (filters.tipo)    q = q.eq('tipo', filters.tipo)
  if (filters.seg)     q = q.eq('segment', filters.seg)
  if (filters.porte)   q = q.eq('porte', filters.porte)
  if (filters.receita) q = q.eq('receita_faixa', filters.receita)
  if (filters.uf)      q = q.eq('address->>uf', filters.uf)
  if (filters.origem)  q = q.eq('custom_fields->>origem', filters.origem)
  if (filters.resp)    q = q.eq('owner_id', filters.resp)
  return q
}

// hierarquia_tipo nunca é persistido hoje (bug pré-existente, fora do escopo
// desta mudança) — o filtro client-side antigo só considerava "independente"
// como valor real; replica o mesmo comportamento aqui em vez de fingir que a
// coluna existe no banco.
function unidadeExclui(filters) {
  return !!(filters.unidade && filters.unidade !== 'independente')
}

/**
 * Versão paginada de useCompanies, só pra tela de listagem (Empresas.js).
 *
 * useCompanies() busca a tabela inteira de uma vez — funciona bem pros ~12
 * outros lugares que precisam do array completo pra fazer lookup (nome da
 * empresa em Contatos/Projetos/Pipeline etc.), mas em Empresas.js, com
 * milhares de registros reais, isso travava a tela por segundos a cada
 * filtro/busca (tudo era filtrado/ordenado em JS sobre o array inteiro).
 *
 * Aqui busca/filtra/ordena/pagina direto no Postgres via PostgREST — só a
 * página atual trafega e é processada no navegador.
 *
 * Duas otimizações que evitam o timeout (57014) visto com ~11 mil linhas:
 *  - `count: 'estimated'` em vez de `'exact'` — um COUNT(*) exato sob RLS
 *    precisa avaliar a policy pra TODA linha do tenant a cada busca só pra
 *    saber o total. Chegou a usar `count: 'estimated'` aqui, mas isso foi
 *    revertido: o Postgres não sabe estimar a seletividade da função de RLS
 *    (can_see_branch_record), então o "estimated" chutava ~1/3 do total real
 *    (confirmado em produção: 22052 registros reais, exibindo só 7350 — bate
 *    exatamente com o fator de seletividade padrão do planner pra condições
 *    opacas). Isso deixou de ser necessário depois do fix real de
 *    performance na RLS (ver migrations 20260723000007/8) — count exato
 *    agora sai em ~150-420ms, não precisa mais dessa troca.
 *  - KPIs (que precisam agregar sobre TODO o conjunto filtrado, não só a
 *    página) vêm de uma RPC (`companies_kpis`) que soma/conta no Postgres —
 *    antes buscava `status`+`mrr` de TODAS as linhas filtradas só pra somar
 *    em JS, ou seja, pagava o custo de um SELECT completo sob RLS de novo.
 */
export function useCompaniesPaged({ page, pageSize, search, filters, sortBy }) {
  const { session } = useAuth()
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis]       = useState({ totalAtivo: 0, totalNegoc: 0, totalMRR: 0 })

  const load = useCallback(async () => {
    if (!session?.user) { setRows([]); setTotal(0); setKpis({ totalAtivo: 0, totalNegoc: 0, totalMRR: 0 }); setLoading(false); return }
    setLoading(true)

    if (unidadeExclui(filters)) {
      setRows([]); setTotal(0); setKpis({ totalAtivo: 0, totalNegoc: 0, totalMRR: 0 }); setLoading(false)
      return
    }

    let q = applyFilters(supabase.from('companies').select('*', { count: 'exact' }), { search, filters })

    if (sortBy === 'mrr_desc')      q = q.order('custom_fields->mrr', { ascending: false, nullsFirst: false })
    else if (sortBy === 'mrr_asc')  q = q.order('custom_fields->mrr', { ascending: true,  nullsFirst: true })
    else if (sortBy === 'criado')   q = q.order('created_at', { ascending: false })
    else if (sortBy === 'razao_z')  q = q.order('razao_social', { ascending: false })
    else                            q = q.order('razao_social', { ascending: true })

    const start = (page - 1) * pageSize
    q = q.range(start, start + pageSize - 1)

    const kpiQuery = supabase.rpc('companies_kpis', {
      p_search: search || null, p_status: filters.status || null, p_tipo: filters.tipo || null,
      p_seg: filters.seg || null, p_porte: filters.porte || null, p_receita: filters.receita || null,
      p_uf: filters.uf || null, p_origem: filters.origem || null, p_resp: filters.resp || null,
      p_unidade: filters.unidade || null,
    })

    const [{ data, count, error }, { data: kpiData, error: kpiError }] = await Promise.all([q, kpiQuery])

    if (error) { setRows([]); setTotal(0) } else {
      setRows((data || []).map(rowToEmpresa))
      setTotal(count || 0)
    }
    const kpiRow = kpiError ? null : kpiData?.[0]
    setKpis({
      totalAtivo: Number(kpiRow?.total_ativo) || 0,
      totalNegoc: Number(kpiRow?.total_negociacao) || 0,
      totalMRR:   Number(kpiRow?.mrr_total) || 0,
    })
    setLoading(false)
  }, [session, page, pageSize, search, filters, sortBy])

  useEffect(() => { load() }, [load])

  return { rows, total, kpis, loading, reload: load }
}
