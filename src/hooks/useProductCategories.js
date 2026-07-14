import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export const CATEGORIAS_DEFAULT = ['CRM', 'ERP', 'BI / Analytics', 'Segurança', 'Infraestrutura', 'Integração', 'Suporte', 'Implementação', 'Outros']

// Categoria de Produto — antes vivia em localStorage (não compartilhado entre
// usuários/dispositivos); agora é uma tabela por tenant. Mantém a mesma forma
// de useState/useLocalState ({categorias, setCategorias}) pra CategoriaSelect
// (src/pages/Produtos.js) não precisar mudar de API.
export function useProductCategories() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const tenantId = profile?.tenant_id

  const [categorias, setCategoriasState] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session?.user || !tenantId) { setLoading(false); return }
    const { data, error } = await supabase.from('product_categories').select('nome').eq('tenant_id', tenantId).order('nome')
    if (error) { setLoading(false); return }
    if (data && data.length > 0) {
      setCategoriasState(data.map(r => r.nome))
    } else {
      const rows = CATEGORIAS_DEFAULT.map(nome => ({ tenant_id: tenantId, nome }))
      const { data: seeded } = await supabase.from('product_categories').insert(rows).select('nome')
      setCategoriasState((seeded || []).map(r => r.nome).length ? seeded.map(r => r.nome) : CATEGORIAS_DEFAULT)
    }
    setLoading(false)
  }, [session, tenantId])

  useEffect(() => { load() }, [load])

  // Mesma assinatura de useState: aceita array novo ou updater (prev => next).
  const setCategorias = useCallback((updater) => {
    setCategoriasState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const added   = next.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !next.includes(n))
      added.forEach(nome => {
        supabase.from('product_categories').upsert({ tenant_id: tenantId, nome }, { onConflict: 'tenant_id,nome' })
      })
      removed.forEach(async nome => {
        const { data } = await supabase.from('product_categories').select('id').eq('tenant_id', tenantId).eq('nome', nome).single()
        if (data?.id) softDelete('product_categories', data.id)
      })
      return next
    })
  }, [tenantId])

  return { categorias, setCategorias, loading }
}
