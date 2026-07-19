import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete, softDeleteMany } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

const MOCK_STORAGE_KEY = 'companies:mock_v1'
function loadMockStore() { try { const r = localStorage.getItem(MOCK_STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function saveMockStore(list) { try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(list)) } catch {} }

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
    resp_ar_id:        row.custom_fields?.resp_ar_id || null,
    porte:             row.porte || '',
    receita_faixa:     row.receita_faixa || '',
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
    porte:          form.porte || null,
    receita_faixa:  form.receita_faixa || null,
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
      resp_ar_id:         form.resp_ar_id || null,
      origem:             form.origem || '',
    },
  }
}

export function useCompanies() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

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

    if (!session?.user) {
      isMockMode.current = false
      setLoading(false)
      return
    }

    // Sem filtro de branch_id: o RLS (can_see_branch_record) já garante
    // que só aparecem registros da filial ativa + filiais com regra de compartilhamento.
    const { data, error: fetchErr } = await supabase
      .from('companies')
      .select('*')
      .order('razao_social')

    if (fetchErr) {
      captureError('useCompanies', fetchErr)
      isMockMode.current = false
      setLoading(false)
      return
    }

    isMockMode.current = false
    setCompanies((data || []).map(rowToEmpresa))
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  // ── Adicionar ───────────────────────────────────────────────
  const add = useCallback(async (form) => {
    if (isMockMode.current) {
      const nova = { ...form, id: String(Date.now()), mrr: 0, contratos: 0, contatos: 0, criado: new Date().toISOString().slice(0, 10) }
      setCompanies(prev => { const next = [...prev, nova]; saveMockStore(next); return next })
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
      setCompanies(prev => { const next = prev.map(e => e.id === id ? { ...e, ...patch } : e); saveMockStore(next); return next })
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
      setCompanies(prev => { const next = prev.filter(e => e.id !== id); saveMockStore(next); return next })
      return { ok: true }
    }

    const { error } = await softDelete('companies', id)
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => prev.filter(e => e.id !== id))
    return { ok: true }
  }, [])

  // ── Remover vários ──────────────────────────────────────────
  const removeMany = useCallback(async (ids) => {
    if (isMockMode.current) {
      setCompanies(prev => { const next = prev.filter(e => !ids.includes(e.id)); saveMockStore(next); return next })
      return { ok: true }
    }

    const { error } = await softDeleteMany('companies', ids)
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => prev.filter(e => !ids.includes(e.id)))
    return { ok: true }
  }, [])

  // ── Atualizar status em lote ────────────────────────────────
  const bulkSetStatus = useCallback(async (ids, status) => {
    if (isMockMode.current) {
      setCompanies(prev => { const next = prev.map(e => ids.includes(e.id) ? { ...e, status } : e); saveMockStore(next); return next })
      return { ok: true }
    }

    const { error } = await supabase.from('companies').update({ status }).in('id', ids)
    if (error) return { ok: false, message: error.message }

    setCompanies(prev => prev.map(e => ids.includes(e.id) ? { ...e, status } : e))
    return { ok: true }
  }, [])

  // ── Importar em lote (CSV) ────────────────────────────────────
  // Insere em blocos de IMPORT_CHUNK_SIZE em vez de um único insert com todas
  // as linhas — um payload de milhares de linhas de uma vez só tende a estourar
  // limite/timeout do PostgREST, e o erro nem chegava a ser reportado antes
  // (o chamador não aguardava nem checava o retorno). onProgress(feitas, total)
  // é opcional, usado pra alimentar o ImportProgressWidget global.
  const IMPORT_CHUNK_SIZE = 300
  const importMany = useCallback(async (rows, onProgress) => {
    if (isMockMode.current) {
      const novas = rows.map(r => ({ ...r, id: Date.now() + Math.random(), mrr: 0, contratos: 0, contatos: 0, criado: new Date().toISOString().slice(0, 10) }))
      setCompanies(prev => [...prev, ...novas])
      onProgress?.(novas.length, novas.length)
      return { ok: true, count: novas.length }
    }

    const inseridas = []
    for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + IMPORT_CHUNK_SIZE)
      const dbRows = chunk.map(r => empresaToRow(r, tenantIdRef.current, branchIdRef.current))
      const { data, error } = await supabase.from('companies').insert(dbRows).select()
      if (error) {
        // Falhou no meio do lote — o que já foi inserido com sucesso fica
        // refletido na lista; o chamador decide o que fazer com o restante.
        if (inseridas.length) setCompanies(prev => [...prev, ...inseridas])
        return { ok: false, message: error.message, count: inseridas.length }
      }
      inseridas.push(...(data || []).map(rowToEmpresa))
      onProgress?.(Math.min(i + IMPORT_CHUNK_SIZE, rows.length), rows.length)
    }

    setCompanies(prev => [...prev, ...inseridas])
    return { ok: true, count: inseridas.length }
  }, [])

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
