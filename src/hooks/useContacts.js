import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_CONTATOS } from '../data/mockContatos'

function rowToContato(row) {
  return {
    id:           row.id,
    empresa_id:   row.company_id || null,
    empresa_nome: row.empresa_nome || '',   // campo join — preenchido via select
    nome:         row.nome || '',
    email:        row.email || '',
    telefone:     row.phone || '',
    cargo:        row.cargo || '',
    notas:        row.notes || '',
    tenant_id:    row.tenant_id || null,
    branch_id:    row.branch_id || null,
    criado_em:    row.created_at?.slice(0, 10) || '',
  }
}

function contatoToRow(c, tenantId, branchId) {
  return {
    tenant_id:  tenantId,
    branch_id:  branchId || null,
    company_id: c.empresa_id || null,
    nome:       c.nome,
    email:      c.email || '',
    phone:      c.telefone || '',
    cargo:      c.cargo || '',
    notes:      c.notas || '',
  }
}

export function useContacts() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [contacts,  setContacts] = useState([])
  const [loading,   setLoading]  = useState(true)
  const isMockMode               = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)

    if (!session?.user) {
      setContacts(MOCK_CONTATOS)
      isMockMode.current = true
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('nome')

    if (error) {
      isMockMode.current = true
      setContacts(MOCK_CONTATOS)
      setLoading(false)
      return
    }

    isMockMode.current = false
    setContacts((data || []).map(row => ({
      ...rowToContato(row),
      empresa_nome: row.companies?.nome_fantasia || row.companies?.razao_social || '',
    })))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (c) => {
    if (isMockMode.current) {
      setContacts(prev => {
        const idx = prev.findIndex(x => x.id === c.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = c; return n }
        return [...prev, { ...c, id: Date.now(), criado_em: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }

    const row = contatoToRow(c, tenantId, branchId)

    if (c.id && typeof c.id === 'string' && c.id.includes('-')) {
      // update (uuid)
      const { error } = await supabase.from('contacts').update(row).eq('id', c.id)
      if (error) return { ok: false, message: error.message }
      setContacts(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))
    } else {
      // insert
      const { data, error } = await supabase.from('contacts').insert(row).select('*, companies(nome_fantasia, razao_social)').single()
      if (error) return { ok: false, message: error.message }
      const novo = { ...rowToContato(data), empresa_nome: data.companies?.nome_fantasia || data.companies?.razao_social || '' }
      setContacts(prev => [...prev, novo])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) {
      setContacts(prev => prev.filter(c => c.id !== id))
      return { ok: true }
    }
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setContacts(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [])

  return { contacts, loading, reload: load, save, remove, isMock: isMockMode.current }
}
