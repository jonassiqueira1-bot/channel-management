import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const STORAGE_KEY = 'settings:tipos_acao_v1'
function load() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function persist(list) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {} }

export function useTiposAcao(defaults = []) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [tipos, setTipos] = useState(load() ?? defaults)
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setTipos(load() ?? defaults)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('tipos_acao').select('*').order('label')
    if (error) {
      isMock.current = true
      setTipos(load() ?? defaults)
    } else {
      isMock.current = false
      if (data && data.length > 0) {
        setTipos(data.map(r => ({ ...r, text: r.text_color })))
      } else {
        // primeira vez: seed dos defaults no banco
        setTipos(load() ?? defaults)
      }
    }
    setLoading(false)
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setTipos(prev => {
        const idx = prev.findIndex(t => t.id === record.id)
        const next = idx >= 0 ? prev.map(t => t.id === record.id ? record : t) : [...prev, record]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const isNew = !record.id || !String(record.id).includes('-')
    // whitelist das colunas que existem na tabela
    const row = {
      tenant_id:  tid.current,
      label:      record.label,
      slug:       record.slug || null,
      icon:       record.icon || null,
      color:      record.color || null,
      bg:         record.bg || null,
      text_color: record.text || record.text_color || null,
    }
    if (isNew) {
      const { data, error } = await supabase.from('tipos_acao').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setTipos(prev => [...prev, { ...record, id: data.id }])
      return { ok: true }
    }
    const { error } = await supabase.from('tipos_acao').update(row).eq('id', record.id)
    if (error) return { ok: false, message: error.message }
    setTipos(prev => prev.map(t => t.id === record.id ? { ...t, ...record } : t))
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setTipos(prev => { const next = prev.filter(t => t.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('tipos_acao').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setTipos(prev => prev.filter(t => t.id !== id))
    return { ok: true }
  }, [])

  return { tipos, setTipos, loading, reload: fetch, save, remove, isMock: isMock.current }
}
