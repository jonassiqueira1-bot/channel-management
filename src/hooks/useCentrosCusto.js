import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

function rowToCentro(row) {
  return {
    id:             row.id,
    nome:           row.nome,
    descricao:      row.descricao || '',
    status:         row.status || 'ativo',
    // Dono do centro — ganha alçada de aprovação de custos vinculados a ele
    // (Ações/Campanhas/Orçamento), além de admin_isv e financeiro.
    responsavel_id: row.responsavel_id || '',
    criado:         row.created_at?.slice(0, 10) || '',
  }
}

export function useCentrosCusto() {
  const { session } = useAuth()
  const { profile }  = useProfile()

  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { setCentros([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('centros_custo')
      .select('*')
      .order('nome', { ascending: true })
    if (error) { captureError('useCentrosCusto', error); setLoading(false); return }
    setCentros((data || []).map(rowToCentro))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (c) => {
    const row = { tenant_id: tenantId, nome: c.nome, descricao: c.descricao || null, status: c.status || 'ativo', responsavel_id: c.responsavel_id || null }
    if (isUuid(c.id)) {
      const { error } = await supabase.from('centros_custo').update(row).eq('id', c.id)
      if (error) return { ok: false, message: error.message }
      setCentros(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))
      return { ok: true }
    }
    const { data, error } = await supabase.from('centros_custo').insert(row).select('*').single()
    if (error) return { ok: false, message: error.message }
    const novo = rowToCentro(data)
    setCentros(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
    return { ok: true, data: novo }
  }, [tenantId])

  const remove = useCallback(async (id) => {
    const { error } = await softDelete('centros_custo', id)
    if (error) return { ok: false, message: error.message }
    setCentros(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [])

  return { centros, loading, reload: load, save, remove }
}
