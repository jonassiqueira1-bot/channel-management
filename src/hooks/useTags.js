import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// ─── Catálogo de Tags de Pipeline ─────────────────────────────────────────────
// Mirror de useHabilitacoes.js — cadastro simples (nome/cor/descrição),
// gerenciado direto na tela de Pipeline, sem tela própria em Configurações.
const MOCK_KEY = 'pipeline:tags_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

export function useTags() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [tags, setTags]     = useState([])
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setTags(load())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('tags').select('*').order('nome')
    if (error) {
      isMock.current = true
      setTags(load())
    } else {
      isMock.current = false
      setTags(data || [])
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setTags(prev => {
        const idx = prev.findIndex(t => t.id === record.id)
        const withId = { ...record, id: record.id || `mock_${Date.now()}` }
        const next = idx >= 0 ? prev.map(t => t.id === record.id ? withId : t) : [...prev, withId]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const tid = profile?.tenant_id
    if (!tid) return { ok: false, message: 'Tenant não identificado' }
    if (!record.id) {
      const row = { tenant_id: tid, branch_id: profile?.branch_id || null, nome: record.nome, cor: record.cor, descricao: record.descricao || null }
      const { data, error } = await supabase.from('tags').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setTags(prev => [...prev, data])
      return { ok: true, data }
    }
    const { error } = await supabase.from('tags').update({ nome: record.nome, cor: record.cor, descricao: record.descricao || null }).eq('id', record.id)
    if (error) return { ok: false, message: error.message }
    setTags(prev => prev.map(t => t.id === record.id ? { ...t, ...record } : t))
    return { ok: true }
  }, [profile])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setTags(prev => { const next = prev.filter(t => t.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await softDelete('tags', id)
    if (error) return { ok: false, message: error.message }
    setTags(prev => prev.filter(t => t.id !== id))
    return { ok: true }
  }, [])

  return { tags, loading, reload: fetch, save, remove, isMock: isMock.current }
}
