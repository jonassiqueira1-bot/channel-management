import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

const MOCK_SELLERS = [
  { id: 1, nome: 'Lucas Ferreira',  email: 'lucas@nexustech.com.br',   telefone: '(11) 98888-1001', role: 'franchise_manager', regiao: 'Sudeste', status: 'ativo',   company_id: null, meta_mensal: 25000, criado: '2024-03-15' },
  { id: 2, nome: 'Ana Costa',       email: 'ana@alphadist.com.br',      telefone: '(41) 97777-2002', role: 'seller',            regiao: 'Sul',     status: 'ativo',   company_id: null, meta_mensal: 18000, criado: '2024-05-28' },
  { id: 3, nome: 'Pedro Alves',     email: 'pedro@nexustech.com.br',    telefone: '(31) 96666-3003', role: 'seller',            regiao: 'Sudeste', status: 'ativo',   company_id: null, meta_mensal: 12000, criado: '2024-06-10' },
  { id: 4, nome: 'Carla Menezes',   email: 'carla@alphadist.com.br',    telefone: '(21) 95555-4004', role: 'pre_sales',         regiao: 'Sudeste', status: 'ativo',   company_id: null, meta_mensal: 22000, criado: '2024-01-20' },
  { id: 5, nome: 'João Lima',       email: 'joao@nexustech.com.br',     telefone: '(16) 94444-5005', role: 'seller',            regiao: 'Sudeste', status: 'afastado',company_id: null, meta_mensal: 10000, criado: '2023-11-15' },
  { id: 6, nome: 'Mariana Silva',   email: 'mariana@fincorp.com.br',    telefone: '(11) 93333-6006', role: 'franchise_manager', regiao: 'Sudeste', status: 'ativo',   company_id: null, meta_mensal: 40000, criado: '2023-08-25' },
  { id: 7, nome: 'Rafael Santos',   email: 'rafael@fincorp.com.br',     telefone: '(19) 92222-7007', role: 'pre_sales',         regiao: 'Sudeste', status: 'ativo',   company_id: null, meta_mensal: 8000,  criado: '2024-06-12' },
  { id: 8, nome: 'Fernanda Rocha',  email: 'fernanda@alphadist.com.br', telefone: '(51) 91111-8008', role: 'project_manager',   regiao: 'Sul',     status: 'inativo', company_id: null, meta_mensal: 20000, criado: '2024-03-05' },
  { id: 9, nome: 'Bruno Tavares',   email: 'bruno@ngi.com.br',          telefone: '(11) 90000-9009', role: 'isv_admin',         regiao: 'Sudeste', status: 'ativo',   company_id: null, meta_mensal: 0,     criado: '2023-01-10' },
]

function rowToSeller(row) {
  const cf = row.custom_fields || {}
  return {
    id:            row.id,
    nome:          row.nome,
    email:         row.email || '',
    telefone:      row.telefone || '',
    cargo:         row.cargo || '',
    role:          cf.role || 'seller',
    regiao:        row.regiao || cf.regiao || '',
    equipe:        row.equipe || cf.equipe || '',
    status:        row.status || 'ativo',
    company_id:    row.branch_id || null,
    // parceiro_id vem da coluna própria; fallback para custom_fields (registros antigos)
    franquia_id:   row.parceiro_id || cf.franquia_id || null,
    franquia_nome: cf.franquia_nome || '',
    meta_mensal:   row.meta_mensal || 0,
    comissao_perc: row.comissao_perc || 0,
    observacoes:        row.observacoes || '',
    criado:             row.created_at?.slice(0, 10) || '',
    linkedin_url:       cf.linkedin_url || '',
    whatsapp:           cf.whatsapp || '',
    portal_invited_at:  row.portal_invited_at || null,
    funil_id:           row.funil_id || null,
    custom_fields:      cf,
  }
}

function sellerToRow(s, tenantId, branchId) {
  return {
    tenant_id:     tenantId,
    branch_id:     branchId || null,
    nome:          s.nome,
    email:         s.email || null,
    telefone:      s.telefone || null,
    cargo:         s.cargo || null,
    status:        s.status || 'ativo',
    regiao:        s.regiao || null,
    equipe:        s.equipe || null,
    parceiro_id:   s.franquia_id || null,
    meta_mensal:   s.meta_mensal ? Number(s.meta_mensal) : null,
    comissao_perc: s.comissao_perc ? Number(s.comissao_perc) : null,
    observacoes:   s.observacoes || null,
    funil_id:      s.funil_id ? String(s.funil_id) : null,
    custom_fields: {
      ...(s.custom_fields || {}),
      role:          s.role,
      franquia_nome: s.franquia_nome,
      linkedin_url:  s.linkedin_url || '',
      whatsapp:      s.whatsapp || '',
    },
  }
}

export function useSellers() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const isMockMode            = useRef(false)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = false; setLoading(false); return }
    let _q = supabase.from('sellers').select('*')
    const { data, error } = await _q.order('nome')
    if (error) { isMockMode.current = false; setSellers([]); setLoading(false); return }
    isMockMode.current = false
    setSellers((data || []).map(rowToSeller))
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (s) => {
    if (isMockMode.current) {
      setSellers(prev => {
        const idx = prev.findIndex(x => x.id === s.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = s; return n }
        return [...prev, { ...s, id: s.id || Date.now(), criado: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }
    const row = sellerToRow(s, tenantId, branchId)
    const isUuid = typeof s.id === 'string' && s.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('sellers').update(row).eq('id', s.id)
      if (error) return { ok: false, message: error.message }
      setSellers(prev => prev.map(x => x.id === s.id ? { ...x, ...s } : x))
    } else {
      const { data, error } = await supabase.from('sellers').insert(row).select().single()
      if (error) return { ok: false, message: error.message }
      setSellers(prev => [...prev, rowToSeller(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setSellers(prev => prev.filter(s => s.id !== id)); return { ok: true } }
    const { error } = await softDelete('sellers', id)
    if (error) return { ok: false, message: error.message }
    setSellers(prev => prev.filter(s => s.id !== id))
    return { ok: true }
  }, [])

  const bulkSetStatus = useCallback(async (ids, status) => {
    if (isMockMode.current) { setSellers(prev => prev.map(s => ids.includes(s.id) ? { ...s, status } : s)); return }
    await supabase.from('sellers').update({ status }).in('id', ids)
    setSellers(prev => prev.map(s => ids.includes(s.id) ? { ...s, status } : s))
  }, [])

  const importMany = useCallback(async (rows) => {
    if (isMockMode.current) { setSellers(prev => [...prev, ...rows]); return { ok: true } }
    const mapped = rows.map(s => sellerToRow(s, tenantId, branchId))
    const { data, error } = await supabase.from('sellers').insert(mapped).select()
    if (error) return { ok: false, message: error.message }
    setSellers(prev => [...prev, ...(data || []).map(rowToSeller)])
    return { ok: true }
  }, [tenantId, branchId])

  const inviteToPortal = useCallback(async (seller) => {
    if (!seller.email) return { ok: false, message: 'Contato sem e-mail cadastrado.' }
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email:      seller.email,
          nome:       seller.nome,
          papel:      'contato_canal',
          contact_id: seller.id,
          branch_id:  activeBranchId || null,
        }),
      }
    )
    const json = await res.json()
    if (!res.ok || json.error) return { ok: false, message: json.error || 'Erro ao enviar convite' }
    // Marca a data do convite no seller
    const now = new Date().toISOString()
    await supabase.from('sellers').update({ portal_invited_at: now }).eq('id', seller.id)
    setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, portal_invited_at: now } : s))
    return { ok: true }
  }, [activeBranchId])

  return { sellers, loading, reload: load, save, remove, bulkSetStatus, importMany, inviteToPortal, setFuncionarios: setSellers, isMock: isMockMode }
}
