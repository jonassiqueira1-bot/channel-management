import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'


const STORAGE_KEY = 'settings:perfis_v2'
function load() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persist(list) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {} }

const STATUS_MAP = { active: 'ativo', inactive: 'inativo', pending: 'pendente' }
const STATUS_MAP_REVERSE = { ativo: 'active', inativo: 'inactive', pendente: 'pending' }

function normalizeProfile(u) {
  const papel = u.papel || u.role || ''
  const tipoInterno = papel === 'admin_isv'
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
  const { activeBranchId } = useBranchContext()

  const [usuarios, setUsuarios] = useState(load)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  useEffect(() => {
    async function fetch() {
      if (!session?.user) { isMock.current = true; setUsuarios(load()); return }
      const { data, error } = await supabase.rpc('get_tenant_profiles')
      if (error) { isMock.current = true; setUsuarios(load()) }
      else {
        isMock.current = false
        const normalized = (data || []).map(normalizeProfile)
        // Filtra por filial ativa: admin_isv vê todos; demais só se branch_ids inclui a filial
        const filtrados = activeBranchId
          ? normalized.filter(u =>
              u.papel === 'admin_isv' ||
              u.papel === 'contato_canal' ||
              (Array.isArray(u.branch_ids) && u.branch_ids.includes(activeBranchId)) ||
              u.branch_id === activeBranchId
            )
          : normalized
        setUsuarios(filtrados)
      }
    }
    fetch()
  }, [session, activeBranchId])

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

    // Usa RPC update_profile para evitar enviar campos inexistentes
    const { error } = await supabase.rpc('update_profile', {
      p_id:                  usuario.id,
      p_role:                usuario.papel || usuario.role || 'vendedor',
      p_nome:                usuario.nome || '',
      p_status:              STATUS_MAP_REVERSE[usuario.status] || usuario.status || 'active',
      p_cargo:               usuario.cargo               || null,
      p_senioridade:         usuario.senioridade         || null,
      p_tipo_recurso:        usuario.tipo_recurso        || null,
      p_billing_rate:        usuario.billing_rate        ?? null,
      p_custo_hora:          usuario.custo_hora          ?? null,
      p_horas_semana:        usuario.horas_semana        ?? 40,
      p_habilidades:         usuario.habilidades         || [],
      p_linkedin_url:        usuario.linkedin_url        || null,
      p_whatsapp:            usuario.whatsapp            || null,
      p_branch_ids:          usuario.branch_ids          || [],
      p_branch_id:           usuario.branch_id           || null,
      p_perfis_acesso_ids:   usuario.perfis_acesso_ids   || [],
      p_regras_comissao_ids: usuario.regras_comissao_ids || [],
    })

    if (error) return { ok: false, message: error.message }

    setUsuarios(prev => {
      const idx = prev.findIndex(u => u.id === usuario.id)
      return idx >= 0 ? prev.map(u => u.id === usuario.id ? { ...u, ...usuario } : u) : [...prev, usuario]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setUsuarios(prev => { const next = prev.filter(u => u.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { ok, message } = await softDelete('profiles', id)
    if (!ok) return { ok: false, message }
    setUsuarios(prev => prev.filter(u => u.id !== id))
    return { ok: true }
  }, [])

  return { usuarios, setUsuarios, save, remove, isMock: isMock.current }
}
