import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

const MOCK_KEY = 'settings:campanhas_v1'
function load() { try { const r = localStorage.getItem(MOCK_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function persist(list) { try { localStorage.setItem(MOCK_KEY, JSON.stringify(list)) } catch {} }

// Chave de cache lida pelo motor de Indicadores (settings/Indicadores.js) —
// mesmo padrão de vendedores:maturidade_v1 (useSellerMaturity.js): meta x
// realizado (Oportunidades ganhas vinculadas via custom_fields.campanha_id).
const INDICADORES_CACHE_KEY = 'campanhas:performance_v1'

async function persistParaIndicadores(campanhas) {
  try {
    const { data: opps } = await supabase.from('oportunidades')
      .select('situacao, valor_cdu, valor_sms, valor_servico, custom_fields')
    const rows = campanhas.map(c => {
      const daCampanha = (opps || []).filter(o => String(o.custom_fields?.campanha_id || '') === String(c.id))
      const ganhas = daCampanha.filter(o => o.situacao === 'ganha')
      const valorRealizado = ganhas.reduce((s, o) => s + (Number(o.valor_cdu)||0) + (Number(o.valor_sms)||0) + (Number(o.valor_servico)||0), 0)
      return {
        id: c.id, nome: c.name || c.nome, status: c.status,
        meta_valor: Number(c.meta_valor || 0), meta_oportunidades: Number(c.meta_oportunidades || 0),
        valor_realizado: valorRealizado, oportunidades_ganhas: ganhas.length, oportunidades_qtd: daCampanha.length,
      }
    })
    localStorage.setItem(INDICADORES_CACHE_KEY, JSON.stringify(rows))
  } catch {}
}

export function useCampanhas(seeds = []) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()
  const [campanhas, setCampanhas] = useState(load() ?? seeds)
  const [loading, setLoading] = useState(true)
  const isMock = useRef(false)
  const tid = useRef(null)
  const bid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])
  useEffect(() => { bid.current = profile?.branch_id || activeBranchId || null }, [profile?.branch_id, activeBranchId])

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMock.current = true
      setCampanhas(load() ?? seeds)
      setLoading(false)
      return
    }
    let q = supabase.from('campanhas').select('*').order('nome')
    const { data, error } = await q
    if (error) {
      isMock.current = true
      setCampanhas(load() ?? seeds)
    } else {
      isMock.current = false
      // Mapeia colunas do banco → campos esperados pelo form
      const mapped = (data || []).map(r => ({
        ...r,
        name:        r.name        || r.nome      || '',
        objective:   r.objective   || r.objetivo  || '',
        description: r.description || r.descricao || '',
        start_date:  r.start_date  || r.inicio    || '',
        end_date:    r.end_date    || r.fim        || '',
        materials:   Array.isArray(r.materials) && r.materials.length ? r.materials : [''],
        franquia_modo:         r.franquia_modo || 'todas',
        franquia_ids:          r.franquia_ids || [],
        contato_canal_ids:     r.contato_canal_ids || [],
        contato_ids:           r.contato_ids || [],
        empresa_ids:           r.empresa_ids || [],
        empresa_segmentos:     r.empresa_segmentos || [],
        empresa_apenas_ativas: r.empresa_apenas_ativas || false,
        playbook_id:           r.playbook_id || null,
        funil_id:              r.funil_id || null,
        meta_valor:            Number(r.meta || 0),
        meta_oportunidades:    Number(r.meta_oportunidades || 0),
        custos:                (r.custos || []).map(c => ({ ...c, _open: false })),
      }))
      setCampanhas(mapped)
      persistParaIndicadores(mapped)
    }
    setLoading(false)
  }, [session, activeBranchId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (record) => {
    if (isMock.current) {
      setCampanhas(prev => {
        const idx = prev.findIndex(c => c.id === record.id)
        const next = idx >= 0 ? prev.map(c => c.id === record.id ? record : c) : [record, ...prev]
        persist(next)
        return next
      })
      return { ok: true }
    }
    // Mapeamento campos do form → colunas do banco
    const branchId = record.branch_id || bid.current || null
    const row = {
      id:           record.id,
      tenant_id:    tid.current,
      branch_id:    branchId,
      nome:         record.name      || record.nome      || '',
      objetivo:     record.objective || record.objetivo  || '',
      descricao:    record.description || record.descricao || '',
      inicio:       record.start_date || record.inicio   || null,
      fim:          record.end_date  || record.fim       || null,
      status:       record.status    || 'rascunho',
      pontua_metas: record.pontua_metas ?? false,
      materials:    (record.materials || []).filter(Boolean),
      franquia_modo:         record.franquia_modo || 'todas',
      franquia_ids:          record.franquia_ids || [],
      contato_canal_ids:     record.contato_canal_ids || [],
      contato_ids:           record.contato_ids || [],
      empresa_ids:           record.empresa_ids || [],
      empresa_segmentos:     record.empresa_segmentos || [],
      empresa_apenas_ativas: record.empresa_apenas_ativas || false,
      playbook_id:           record.playbook_id || null,
      funil_id:              record.funil_id || null,
      meta:                  Number(record.meta_valor || 0),
      meta_oportunidades:    Number(record.meta_oportunidades || 0),
      custos:                (record.custos || []).map(({ _obsInput, _open, ...rest }) => rest),
      updated_at:   new Date().toISOString(),
    }
    const { error } = await supabase.from('campanhas').upsert(row, { onConflict: 'id' })
    if (error) return { ok: false, message: error.message }
    setCampanhas(prev => {
      const idx = prev.findIndex(c => c.id === record.id)
      return idx >= 0 ? prev.map(c => c.id === record.id ? record : c) : [record, ...prev]
    })
    return { ok: true }
  }, [])

  const remove = useCallback(async (id) => {
    if (isMock.current) {
      setCampanhas(prev => { const next = prev.filter(c => c.id !== id); persist(next); return next })
      return { ok: true }
    }
    const { error } = await softDelete('campanhas', id)
    if (error) return { ok: false, message: error.message }
    setCampanhas(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [])

  return { campanhas, setCampanhas, loading, reload: fetch, save, remove, isMock: isMock.current }
}
