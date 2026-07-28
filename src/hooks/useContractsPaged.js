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
      if (term) {
        // Filtro em embed (`companies.razao_social...` dentro de um .or())
        // não é confiável no PostgREST sem !inner — resolve os ids das
        // empresas batidas numa query separada e usa `company_id.in.(...)`,
        // que é um filtro direto e sempre funciona.
        const { data: empresasBatidas } = await supabase
          .from('companies').select('id')
          .or(`razao_social.ilike.*${term}*,nome_fantasia.ilike.*${term}*`)
          .limit(200)
        const orParts = [
          `numero.ilike.*${term}*`,
          `observacoes.ilike.*${term}*`,
          // custom_fields guarda responsável, origem, tipo_venda e os
          // produtos/itens do contrato — castar pra texto e comparar tudo de
          // uma vez é mais simples (e mais completo) do que apontar campo
          // por campo dentro do JSONB.
          `custom_fields::text.ilike.*${term}*`,
        ]
        if (empresasBatidas?.length) orParts.push(`company_id.in.(${empresasBatidas.map(c => c.id).join(',')})`)
        q = q.or(orParts.join(','))
      }
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
