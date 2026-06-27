import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MOCK_KEY = 'settings:franquias_v2'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useParceiros() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [parceiros, setParceiros] = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setParceiros(load())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('parceiros').select('*').order('nome')
    if (error) {
      isMock.current = true
      setParceiros(load())
    } else {
      isMock.current = false
      setParceiros(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setParceiros(prev => {
        const idx = prev.findIndex(p => p.id === record.id)
        const next = idx >= 0 ? prev.map(p => p.id === record.id ? record : p) : [...prev, record]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const { id, situacao, estado, ...fields } = record
    // Mapeamento de campos do form → colunas do DB
    const isRealUuid = typeof id === 'string' && id.includes('-') && id.length > 20
    const row = {
      tenant_id:    tid.current,
      nome:         fields.nome || '',
      classificacao:fields.classificacao || 'franquia',
      tipo_parceiro:fields.tipo_parceiro || null,
      franquia_id:  fields.franquia_id   || null,
      codigo:       fields.codigo        || null,
      cnpj:         fields.cnpj          || null,
      email:        fields.email         || null,
      telefone:     fields.telefone      || null,
      responsavel:  fields.responsavel   || null,
      cidade:       fields.cidade        || null,
      uf:           estado               || fields.uf || null,   // form usa 'estado', DB usa 'uf'
      status:       situacao             || fields.status || 'ativo', // form usa 'situacao', DB usa 'status'
      extra:        fields.extra         || {},
      updated_at:   new Date().toISOString(),
    }
    const { data: saved, error } = isRealUuid
      ? await supabase.from('parceiros').update(row).eq('id', id).select().single()
      : await supabase.from('parceiros').insert(row).select().single()
    if (error) return { ok: false, message: error.message }
    setParceiros(prev => {
      const idx = prev.findIndex(p => p.id === (saved?.id || id))
      return idx >= 0 ? prev.map(p => p.id === saved?.id ? { ...p, ...saved } : p) : [...prev, saved || record]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setParceiros(prev => { const next = prev.filter(p => p.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('parceiros').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setParceiros(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  const bulkReclassify = useCallback(async (ids, patch) => {
    if (isMock.current) {
      setParceiros(prev => { const next = prev.map(p => ids.includes(p.id) ? { ...p, ...patch } : p); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('parceiros').update({ ...patch, updated_at: new Date().toISOString() }).in('id', ids)
    if (error) return { ok: false, message: error.message }
    setParceiros(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...patch } : p))
    return { ok: true }
  }, [])

  return { parceiros, setParceiros, loading, reload: fetch, save, remove, bulkReclassify, isMock: isMock.current }
}
