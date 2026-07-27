import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { rowToContrato } from './useContracts'

/**
 * Versão paginada de useContracts, só pra tela de listagem (Contratos.js).
 *
 * useContracts() busca a tabela inteira de uma vez — funciona bem pros
 * outros lugares que precisam do array completo (Metas, Tarefas, Pagamentos,
 * Pipeline etc.), mas em Contratos.js, com milhares de registros reais
 * (~11 mil após um import de teste), isso travava a tela por dezenas de
 * segundos: mesmo buscando em blocos paralelos e com os índices certos no
 * banco, 12 requisições pesadas concorrendo pelos mesmos recursos do
 * Postgres/pooler continuam lentas. Só a página atual precisa trafegar.
 *
 * Mesmo padrão de useCompaniesPaged.js — busca/filtra/ordena/pagina direto
 * no Postgres via PostgREST.
 */
export function useContractsPaged({ page, pageSize, search, filters, sortBy }) {
  const { session } = useAuth()
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session?.user) { setRows([]); setTotal(0); setLoading(false); return }
    setLoading(true)

    let q = supabase.from('contracts').select('*, companies(nome_fantasia, razao_social)', { count: 'exact' })

    if (search?.trim()) {
      const term = search.replace(/[,()*]/g, '').trim()
      if (term) q = q.or(`numero.ilike.*${term}*,companies.razao_social.ilike.*${term}*,companies.nome_fantasia.ilike.*${term}*`)
    }
    if (filters.status?.length) q = q.in('status', filters.status)

    if (sortBy === 'criado')       q = q.order('created_at', { ascending: false })
    else if (sortBy === 'vigencia') q = q.order('data_inicio', { ascending: false, nullsFirst: false })
    else                             q = q.order('created_at', { ascending: false })

    const start = (page - 1) * pageSize
    q = q.range(start, start + pageSize - 1)

    const { data, count, error } = await q
    if (error) { setRows([]); setTotal(0) } else {
      setRows((data || []).map(rowToContrato))
      setTotal(count || 0)
    }
    setLoading(false)
  }, [session, page, pageSize, search, filters, sortBy])

  useEffect(() => { load() }, [load])

  return { rows, total, loading, reload: load }
}
