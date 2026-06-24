import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_ACOES } from '../data/mockAcoes'

function rowToAcao(row) {
  const cf = row.custom_fields || {}
  return {
    id:                row.id,
    empresa_id:        row.company_id || cf.empresa_id || null,
    empresa_nome:      row.companies?.nome_fantasia || row.companies?.razao_social || cf.empresa_nome || '',
    tipo:              row.tipo || cf.tipo || 'outros',
    titulo:            row.titulo,
    descricao:         row.descricao || '',
    data_inicio:       row.data_prevista || cf.data_inicio || '',
    data_fim:          row.data_conclusao || cf.data_fim || '',
    responsavel_id:    row.owner_id || cf.responsavel_id || null,
    responsavel_nome:  cf.responsavel_nome || '',
    local:             cf.local || '',
    vagas:             cf.vagas || null,
    inscritos:         cf.inscritos || 0,
    status:            row.status || 'agendado',
    tenant_id:         row.tenant_id,
    criado_em:         row.created_at || '',
  }
}

function acaoToRow(a, tenantId, branchId) {
  return {
    tenant_id:      tenantId,
    branch_id:      branchId || null,
    company_id:     null, // franquias vêm do localStorage, não do Supabase companies
    owner_id:       a.responsavel_id || null,
    titulo:         a.titulo,
    tipo:           a.tipo || 'outros',
    status:         a.status || 'agendado',
    prioridade:     'media',
    data_prevista:  a.data_inicio || null,
    data_conclusao: a.data_fim || null,
    descricao:      a.descricao || null,
    custom_fields: {
      empresa_id:       a.empresa_id,
      empresa_nome:     a.empresa_nome,
      responsavel_nome: a.responsavel_nome,
      local:            a.local,
      vagas:            a.vagas,
      inscritos:        a.inscritos,
      data_inicio:      a.data_inicio,
      data_fim:         a.data_fim,
    },
  }
}

export function useActions() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [acoes, setAcoes] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setAcoes(MOCK_ACOES); setLoading(false); return }
    const { data, error } = await supabase
      .from('actions')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('created_at', { ascending: false })
    if (error) { isMockMode.current = false; setAcoes([]); setLoading(false); return }
    isMockMode.current = false
    setAcoes((data || []).map(rowToAcao))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (a) => {
    if (isMockMode.current) {
      setAcoes(prev => {
        const idx = prev.findIndex(x => x.id === a.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = a; return n }
        return [...prev, { ...a, id: a.id || Date.now(), criado_em: new Date().toISOString() }]
      })
      return { ok: true }
    }
    const row = acaoToRow(a, tenantId, branchId)
    const isUuid = typeof a.id === 'string' && a.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('actions').update(row).eq('id', a.id)
      if (error) return { ok: false, message: error.message }
      setAcoes(prev => prev.map(x => x.id === a.id ? { ...x, ...a } : x))
    } else {
      const { data, error } = await supabase.from('actions').insert(row).select('*, companies(nome_fantasia, razao_social)').single()
      if (error) return { ok: false, message: error.message }
      setAcoes(prev => [...prev, rowToAcao(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setAcoes(prev => prev.filter(a => a.id !== id)); return { ok: true } }
    const { error } = await supabase.from('actions').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setAcoes(prev => prev.filter(a => a.id !== id))
    return { ok: true }
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    if (isMockMode.current) { setAcoes(prev => prev.map(a => ids.includes(a.id) ? { ...a, status } : a)); return }
    await supabase.from('actions').update({ status }).in('id', ids)
    setAcoes(prev => prev.map(a => ids.includes(a.id) ? { ...a, status } : a))
  }, [])

  return { acoes, loading, reload: load, save, remove, bulkSetStatus, setAcoes, isMock: isMockMode }
}
