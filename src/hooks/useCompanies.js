import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { MOCK_EMPRESAS } from '../data/mockEmpresas'

// Converte linha do Supabase → formato usado pelo componente Empresas
function rowToEmpresa(row) {
  return {
    id:                row.id,
    razao:             row.razao_social || '',
    fantasia:          row.nome_fantasia || '',
    cnpj:              row.cnpj || '',
    tipo:              row.tipo || 'cliente_final',
    segmento:          row.segment || '',
    status:            row.status || 'ativo',
    origem:            row.origem || '',
    responsavel:       row.owner_id || '',
    site:              row.website || '',
    telefone:          row.phone || '',
    email:             row.email || '',
    mrr:               row.custom_fields?.mrr || 0,
    contratos:         row.custom_fields?.contratos || 0,
    contatos:          row.custom_fields?.contatos || 0,
    criado:            row.created_at?.slice(0, 10) || '',
    cnae_codigo:       row.custom_fields?.cnae_codigo || '',
    cnae_descricao:    row.custom_fields?.cnae_descricao || '',
    inscricao_estadual:row.custom_fields?.inscricao_estadual || '',
    cep:               row.address?.cep || '',
    logradouro:        row.address?.logradouro || '',
    bairro:            row.address?.bairro || '',
    cidade:            row.address?.cidade || '',
    uf:                row.address?.uf || '',
    numero:            row.address?.numero || '',
    complemento:       row.address?.complemento || '',
    franquia_ar_id:    row.custom_fields?.franquia_ar_id || null,
    franquia_ar_nome:  row.custom_fields?.franquia_ar_nome || '',
    branch_id:         row.branch_id || null,
    tenant_id:         row.tenant_id || null,
  }
}

// Converte formato do componente → linha do Supabase
function empresaToRow(form, tenantId, branchId) {
  return {
    tenant_id:      tenantId,
    branch_id:      branchId || null,
    razao_social:   form.razao,
    nome_fantasia:  form.fantasia,
    cnpj:           form.cnpj,
    tipo:           form.tipo,
    segment:        form.segmento,
    status:         form.status,
    email:          form.email,
    phone:          form.telefone,
    website:        form.site,
    address: {
      cep:         form.cep,
      logradouro:  form.logradouro,
      bairro:      form.bairro,
      cidade:      form.cidade,
      uf:          form.uf,
      numero:      form.numero,
      complemento: form.complemento,
    },
    custom_fields: {
      mrr:                form.mrr || 0,
      contratos:          form.contratos || 0,
      contatos:           form.contatos || 0,
      cnae_codigo:        form.cnae_codigo || '',
      cnae_descricao:     form.cnae_descricao || '',
      inscricao_estadual: form.inscricao_estadual || '',
      franquia_ar_id:     form.franquia_ar_id || null,
      franquia_ar_nome:   form.franquia_ar_nome || '',
      origem:             form.origem || '',
    },
  }
}

export function useCompanies() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [companies, setCompanies] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  // true quando a tabela companies não existe no Supabase (modo demo)
  const isMockMode  = useRef(false)
  const tenantIdRef = useRef(null)
  const branchIdRef = useRef(null)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  useEffect(() => { tenantIdRef.current = tenantId }, [tenantId])
  useEffect(() => { branchIdRef.current = branchId }, [branchId])

  // ── Carregar ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Sem sessão autenticada: usa mock
    if (!session?.user) {
      setCompanies(MOCK_EMPRESAS)
      isMockMode.current = true
      setLoading(false)
      return
    }

    const { data, error: fetchErr } = await supabase
      .from('companies')
      .select('*')
      .order('razao_social')

    if (fetchErr) {
      // Tabela não existe no Supabase demo → fallback para mock
      isMockMode.current = true
      setCompanies(MOCK_EMPRESAS)
      setLoading(false)
      return
    }

    isMockMode.current = false
    setCompanies((data || []).map(rowToEmpresa))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  // ── Adicionar ───────────────────────────────────────────────
  const add = useCallback(async (form) => {
    if (isMockMode.current) {
      const nova = { ...form, id: Date.now(), mrr: 0, contratos: 0, contatos: 0, criado: new Date().toISOString().slice(0, 10) }
      setCompanies(prev => [...prev, nova])
      return { ok: true, data: nova }
    }

    const row = empresaToRow(form, tenantIdRef.current, branchIdRef.current)
    const { data, error } = await supabase.from('companies').insert(row).select().single()
    if (error) return { ok: false, message: error.message }
    const nova = rowToEmpresa(data)
    setCompanies(prev => [...prev, nova])
    return { ok: true, data: nova }
  }, [])

  // ── Atualizar ───────────────────────────────────────────────
  const update = useCallback(async (id, patch) => {
    if (isMockMode.current) {
      setCompanies(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
      return { ok: true }
    }

    // Busca o registro atual para fazer merge dos campos
    const current = companies.find(e => e.id === id)
    if (!current) return { ok: false, message: 'Empresa não encontrada' }

    const merged = { ...current, ...patch }
    const row    = empresaToRow(merged, tenantIdRef.current, branchIdRef.current)

    // Atualiza local imediatamente (otimista) para refletir na lista
    setCompanies(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))

    const { error } = await supabase.from('companies').update(row).eq('id', id)
    if (error) {
      console.warn('[useCompanies] update error:', error.message)
      return { ok: false, message: error.message }
    }
    return { ok: true }
  }, [companies])

  // ── Remover ─────────────────────────────────────────────────
  const remove = useCallback(async (id) => {
    if (isMockMode.current) {
      setCompanies(prev => prev.filter(e => e.id !== id))
      return { ok: true }
    }

    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => prev.filter(e => e.id !== id))
    return { ok: true }
  }, [])

  // ── Remover vários ──────────────────────────────────────────
  const removeMany = useCallback(async (ids) => {
    if (isMockMode.current) {
      setCompanies(prev => prev.filter(e => !ids.includes(e.id)))
      return { ok: true }
    }

    const { error } = await supabase.from('companies').delete().in('id', ids)
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => prev.filter(e => !ids.includes(e.id)))
    return { ok: true }
  }, [])

  // ── Atualizar status em lote ────────────────────────────────
  const bulkSetStatus = useCallback(async (ids, status) => {
    if (isMockMode.current) {
      setCompanies(prev => prev.map(e => ids.includes(e.id) ? { ...e, status } : e))
      return { ok: true }
    }

    const { error } = await supabase.from('companies').update({ status }).in('id', ids)
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => prev.map(e => ids.includes(e.id) ? { ...e, status } : e))
    return { ok: true }
  }, [])

  // ── Importar em lote (CSV) ──────────────────────────────────
  const importMany = useCallback(async (rows) => {
    if (isMockMode.current) {
      const novas = rows.map(r => ({ ...r, id: Date.now() + Math.random(), mrr: 0, contratos: 0, contatos: 0, criado: new Date().toISOString().slice(0, 10) }))
      setCompanies(prev => [...prev, ...novas])
      return { ok: true, count: novas.length }
    }

    const dbRows = rows.map(r => empresaToRow(r, tenantId, branchId))
    const { data, error } = await supabase.from('companies').insert(dbRows).select()
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => [...prev, ...(data || []).map(rowToEmpresa)])
    return { ok: true, count: data?.length || 0 }
  }, [tenantId, branchId])

  return {
    companies,
    loading,
    error,
    reload: load,
    isMock: isMockMode.current,
    add,
    update,
    remove,
    removeMany,
    bulkSetStatus,
    importMany,
  }
}
