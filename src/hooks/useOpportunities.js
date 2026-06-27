import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// Mock inline — mesmo dado que estava em Pipeline.js

function rowToOpp(row) {
  const cf = row.custom_fields || {}
  return {
    id:                    row.id,
    titulo:                row.titulo || '',
    funil_id:              row.funil_id || cf.funil_id || null,
    funil_nome:            cf.funil_nome || '',
    etapa_id:              row.stage_id || cf.etapa_id || null,
    playbook_id:           cf.playbook_id || null,
    empresa_id:            row.company_id || null,
    empresa_nome:          row.companies?.nome_fantasia || row.companies?.razao_social || cf.empresa_nome || '',
    valor:                 row.valor || 0,
    valor_cdu:             cf.valor_cdu || 0,
    valor_sms:             cf.valor_sms || 0,
    valor_servico:         cf.valor_servico || 0,
    valor_desconto:        cf.valor_desconto || 0,
    primary_contact_id:    row.contact_id || null,
    primary_contact_nome:  cf.primary_contact_nome || '',
    responsavel:           row.responsavel || '',
    prazo:                 row.prazo || '',
    origem:                row.origem || '',
    criado:                row.created_at?.slice(0, 10) || '',
    situacao:              row.situacao || 'em_andamento',
    descricao:             row.descricao || '',
    motivo_perda:          row.motivo_perda || '',
    proxima_acao_data:     cf.proxima_acao_data || '',
    tenant_id:             row.tenant_id || null,
    branch_id:             row.branch_id || null,
    custom_fields: {
      funil_id:           cf.funil_id || null,
      funil_nome:         cf.funil_nome || '',
      etapa_id:           cf.etapa_id || null,
      playbook_id:        cf.playbook_id || null,
      empresa_nome:       cf.empresa_nome || '',
      primary_contact_nome: cf.primary_contact_nome || '',
      valor_cdu:          cf.valor_cdu || 0,
      valor_sms:          cf.valor_sms || 0,
      valor_servico:      cf.valor_servico || 0,
      valor_desconto:     cf.valor_desconto || 0,
      tipo_implantacao:   cf.tipo_implantacao || '',
      segmento_industria: cf.segmento_industria || '',
      exige_integracao:   cf.exige_integracao || false,
    },
    itens: Array.isArray(cf.itens) ? cf.itens : [],
  }
}

function isValidUuid(v) {
  return typeof v === 'string' && v.includes('-') && v.length > 8
}

function oppToRow(opp, tenantId, branchId) {
  return {
    tenant_id:   tenantId,
    branch_id:   branchId || null,
    titulo:      opp.titulo,
    company_id:  isValidUuid(opp.empresa_id) ? opp.empresa_id : null,
    contact_id:  isValidUuid(opp.primary_contact_id) ? opp.primary_contact_id : null,
    stage_id:    (typeof opp.etapa_id === 'string' && opp.etapa_id.includes('-')) ? opp.etapa_id : null,
    responsavel: opp.responsavel || '',
    valor:       opp.valor || 0,
    situacao:    opp.situacao || 'em_andamento',
    origem:      opp.origem || '',
    prazo:       opp.prazo || null,
    descricao:   opp.descricao || '',
    motivo_perda:opp.motivo_perda || '',
    custom_fields: {
      funil_id:              opp.funil_id,
      funil_nome:            opp.funil_nome || '',
      etapa_id:              opp.etapa_id || null,
      etapa_id:              opp.etapa_id,
      playbook_id:           opp.playbook_id,
      empresa_nome:          opp.empresa_nome,
      primary_contact_nome:  opp.primary_contact_nome,
      valor_cdu:             opp.valor_cdu || 0,
      valor_sms:             opp.valor_sms || 0,
      valor_servico:         opp.valor_servico || 0,
      valor_desconto:        opp.valor_desconto || 0,
      tipo_implantacao:      opp.custom_fields?.tipo_implantacao || '',
      segmento_industria:    opp.custom_fields?.segmento_industria || '',
      exige_integracao:      opp.custom_fields?.exige_integracao || false,
      itens:                 opp.itens || [],
      proxima_acao_data:     opp.proxima_acao_data || null,
    },
  }
}

const LS_KEY = 'opps_cache_v1'

function lsLoad() {
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function lsSave(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch {}
}

export function useOpportunities() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [opps,    setOpps]    = useState(() => lsLoad() || [])
  const [loading, setLoading] = useState(true)
  const isMockMode  = useRef(true)
  const tenantIdRef = useRef(null)
  const branchIdRef = useRef(null)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  useEffect(() => { tenantIdRef.current = tenantId }, [tenantId])
  useEffect(() => { branchIdRef.current = branchId }, [branchId])

  // Persiste no localStorage só quando tem dados reais (evita apagar cache bom com array vazio inicial)
  useEffect(() => { if (!isMockMode.current && opps.length >= 0) lsSave(opps) }, [opps])

  const load = useCallback(async () => {
    console.log('[load] chamado, session:', !!session?.user, 'tenantId:', tenantIdRef.current)
    setLoading(true)

    if (!session?.user) {
      isMockMode.current = true
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('oportunidades')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useOpportunities] load error:', error.message)
      isMockMode.current = false
      setLoading(false)
      return
    }

    isMockMode.current = false
    setOpps((data || []).map(rowToOpp))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  // Salvar (insert ou update)
  const save = useCallback(async (data) => {
    console.log('[save] isMockMode:', isMockMode.current, 'titulo:', data.titulo, 'tenantId:', tenantIdRef.current, 'playbook_id:', data.playbook_id)
    if (isMockMode.current) {
      setOpps(prev => {
        const idx = prev.findIndex(o => o.id === data.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = data; return n }
        return [...prev, { ...data, id: data.id || Date.now() + Math.random(), criado: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }

    const tid = tenantIdRef.current
    const bid = branchIdRef.current
    const row = oppToRow(data, tid, bid)
    const isUuid = typeof data.id === 'string' && data.id.includes('-')
    const existeLocal = isUuid

    if (existeLocal) {
      // Atualiza local imediatamente
      setOpps(prev => prev.map(o => o.id === data.id ? { ...o, ...data } : o))
      const { error } = await supabase.from('oportunidades').update(row).eq('id', data.id)
      if (error) console.warn('[useOpportunities] update error:', error.message)
    } else {
      // Insere localmente com UUID temporário (com traço) para que edições subsequentes tomem o caminho UPDATE
      const tempId = crypto.randomUUID()
      const optimistic = { ...data, id: tempId, criado: new Date().toISOString().slice(0, 10) }
      setOpps(prev => [...prev, optimistic])
      const { error } = await supabase.from('oportunidades').insert(row)
      if (error) {
        console.warn('[useOpportunities] insert error:', error.message, 'row:', JSON.stringify(row).slice(0,200))
        // Mantém o opp otimístico — não chama load() para não sobrescrever
        return { ok: true }
      }
      // INSERT ok: recarrega para obter ID real
      load()
    }
    return { ok: true }
  }, [tenantId, branchId])

  // Mover para etapa (drag kanban)
  const moveToStage = useCallback(async (id, etapaId) => {
    setOpps(prev => prev.map(o => o.id === id ? { ...o, etapa_id: etapaId } : o))
    if (!isMockMode.current) {
      const opp = opps.find(o => o.id === id)
      const cf = { ...(opp?.custom_fields || {}), playbook_id: opp?.playbook_id ?? opp?.custom_fields?.playbook_id ?? null, etapa_id: etapaId, itens: opp?.itens || [] }
      const stage_id = isValidUuid(etapaId) ? etapaId : null
      await supabase.from('oportunidades').update({ stage_id, custom_fields: cf }).eq('id', id)
    }
  }, [opps])

  // Bulk mover para etapa
  const bulkMoveToStage = useCallback(async (ids, etapaId) => {
    setOpps(prev => prev.map(o => ids.includes(o.id) ? { ...o, etapa_id: etapaId } : o))
    if (!isMockMode.current) {
      const stage_id = isValidUuid(etapaId) ? etapaId : null
      for (const id of ids) {
        const opp = opps.find(o => o.id === id)
        const cf = { ...(opp?.custom_fields || {}), playbook_id: opp?.playbook_id ?? opp?.custom_fields?.playbook_id ?? null, etapa_id: etapaId, itens: opp?.itens || [] }
        await supabase.from('oportunidades').update({ stage_id, custom_fields: cf }).eq('id', id)
      }
    }
  }, [opps])

  // Remover
  const remove = useCallback(async (id) => {
    if (isMockMode.current) {
      setOpps(prev => prev.filter(o => o.id !== id))
      return { ok: true }
    }
    const { error } = await supabase.from('oportunidades').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setOpps(prev => prev.filter(o => o.id !== id))
    return { ok: true }
  }, [])

  // Remover vários
  const removeMany = useCallback(async (ids) => {
    setOpps(prev => prev.filter(o => !ids.includes(o.id)))
    if (!isMockMode.current) {
      await supabase.from('oportunidades').delete().in('id', ids)
    }
  }, [])

  // Importar
  const importMany = useCallback(async (rows) => {
    if (isMockMode.current) {
      const novas = rows.map(r => ({ ...r, id: Date.now() + Math.random(), criado: new Date().toISOString().slice(0, 10) }))
      setOpps(prev => [...prev, ...novas])
      return { ok: true }
    }
    const dbRows = rows.map(r => oppToRow(r, tenantId, branchId))
    const { data, error } = await supabase.from('oportunidades').insert(dbRows).select()
    if (error) return { ok: false, message: error.message }
    setOpps(prev => [...prev, ...(data || []).map(rowToOpp)])
    return { ok: true }
  }, [tenantId, branchId])

  const updateProximaAcao = useCallback(async (oppId, dataHora) => {
    if (!oppId || isMockMode.current) return
    const { data: cur } = await supabase.from('oportunidades').select('custom_fields').eq('id', oppId).single()
    const cf = cur?.custom_fields || {}
    await supabase.from('oportunidades').update({ custom_fields: { ...cf, proxima_acao_data: dataHora } }).eq('id', oppId)
    setOpps(prev => prev.map(o => o.id === oppId ? { ...o, proxima_acao_data: dataHora } : o))
  }, [])

  return { opps, loading, reload: load, save, remove, removeMany, moveToStage, bulkMoveToStage, importMany, updateProximaAcao }
}
