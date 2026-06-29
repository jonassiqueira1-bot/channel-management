import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const STORAGE_KEY = 'settings:perfis_v2'
function load() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {} }

const STATUS_MAP = { active: 'ativo', inactive: 'inativo', pending: 'pendente' }

// Mapeia colunas reais do banco (role, last_seen, created_at) para os nomes
// que o frontend usa (papel, tipo_usuario, ultimo_acesso, criado_em)
function normalizeProfile(u) {
  const papel = u.papel || u.role || ''
  const tipoInterno = ['admin_isv', 'admin_franquia', 'gestor', 'vendedor_interno'].includes(papel)
  return {
    ...u,
    papel,
    tipo_usuario:  u.tipo_usuario  || (tipoInterno ? 'interno' : 'externo'),
    status:        STATUS_MAP[u.status] || u.status || 'inativo',
    criado_em:     u.criado_em     || u.created_at  || null,
    ultimo_acesso: u.ultimo_acesso || u.last_seen    || null,
  }
}

export function useUsuarios() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [usuarios, setUsuarios] = useState(load)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  useEffect(() => {
    async function fetch() {
      if (!session?.user) { isMock.current = true; setUsuarios(load()); return }
      const { data, error } = await supabase.from('profiles').select('*').order('nome', { ascending: true })
      if (error) { isMock.current = true; setUsuarios(load()) }
      else {
        isMock.current = false
        setUsuarios((data || []).map(normalizeProfile))
      }
    }
    fetch()
  }, [session])

  const save = useCallback(async (usuario) => {
    if (isMock.current) {
      setUsuarios(prev => {
        const idx = prev.findIndex(u => u.id === usuario.id)
        const next = idx >= 0 ? prev.map(u => u.id === usuario.id ? usuario : u) : [...prev, usuario]
        persist(next)
        return next
      })
      return { ok: true }
    }
    const { error } = await supabase.from('profiles').upsert({ ...usuario, tenant_id: tid.current }, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
    setUsuarios(prev => {
      const idx = prev.findIndex(u => u.id === usuario.id)
      return idx >= 0 ? prev.map(u => u.id === usuario.id ? usuario : u) : [...prev, usuario]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setUsuarios(prev => { const next = prev.filter(u => u.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setUsuarios(prev => prev.filter(u => u.id !== id))
    return { ok: true }
  }, [])

  return { usuarios, setUsuarios, save, remove, isMock: isMock.current }
}
