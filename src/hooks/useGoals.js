import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

const MES = new Date().getMonth() + 1
const ANO = new Date().getFullYear()

function mockGoal(id, tipo_alvo, id_vendedor, id_unidade, category_id, product_id, alvo_nome, alvo_contexto, tipo_meta, subtipo, valor_sufixo, planejado, atual, mes, ano) {
  return { id, tipo_alvo, id_vendedor, id_unidade, category_id, product_id, alvo_nome, alvo_contexto, tipo_meta, subtipo_operacional: subtipo, valor_sufixo, periodo_mes: mes, periodo_ano: ano, valor_planejado: planejado, valor_atual: atual, status: 'ativa' }
}
const MES_ANT = MES <= 1 ? 12 : MES - 1
const ANO_ANT = MES <= 1 ? ANO - 1 : ANO

const MOCK_GOALS_SEED = [
  mockGoal('g1','vendedor','v5',null,null,null,'João Lima','Filial — Ribeirão Preto','valor',null,null,18000,14200,MES,ANO),
  mockGoal('g2','vendedor','v3',null,null,null,'Fernanda Rocha','Filial — Porto Alegre','valor',null,null,15000,15800,MES,ANO),
  mockGoal('g3','vendedor','v1',null,null,null,'Lucas Ferreira','Matriz — São Paulo','valor',null,null,22000,9400,MES,ANO),
  mockGoal('g5','vendedor','v8',null,null,null,'Mariana Silva','Matriz — São Paulo','valor',null,null,30000,31500,MES,ANO),
  mockGoal('g1b','vendedor','v5',null,null,null,'João Lima','Filial — Ribeirão Preto','valor',null,null,18000,18900,MES_ANT,ANO_ANT),
  mockGoal('g3b','vendedor','v1',null,null,null,'Lucas Ferreira','Matriz — São Paulo','valor',null,null,20000,17500,MES_ANT,ANO_ANT),
  mockGoal('g6','unidade',null,'u1',null,null,'Matriz — São Paulo','','valor',null,null,80000,56900,MES,ANO),
  mockGoal('g7','unidade',null,'u5',null,null,'Filial — Porto Alegre','','valor',null,null,25000,18700,MES,ANO),
  mockGoal('g8','categoria',null,null,'cat2',null,'Gestão de Ativos (CMMS)','Categoria de produto','valor',null,null,45000,32100,MES,ANO),
  mockGoal('g10','produto',null,null,null,'p1','Canal NG Pro','Gestão de Ativos (CMMS)','valor',null,null,20000,11400,MES,ANO),
]

function rowToGoal(row) {
  const cf = row.custom_fields || {}
  return {
    id:                  row.id,
    tipo_alvo:           row.tipo_alvo,
    id_vendedor:         cf.id_vendedor || null,
    id_unidade:          cf.id_unidade  || null,
    category_id:         cf.category_id || null,
    product_id:          cf.product_id  || null,
    alvo_id:             row.alvo_id    || null,
    alvo_nome:           row.alvo_nome  || '',
    alvo_contexto:       row.alvo_contexto || '',
    tipo_meta:           row.tipo_meta,
    subtipo_operacional: row.subtipo_operacional || null,
    valor_sufixo:        row.valor_sufixo || null,
    periodo_mes:         row.periodo_mes,
    periodo_ano:         row.periodo_ano,
    valor_planejado:     row.valor_planejado || 0,
    valor_atual:         row.valor_atual || 0,
    status:              row.status || 'ativa',
  }
}

function goalToRow(g, tenantId, branchId) {
  return {
    tenant_id:           tenantId,
    branch_id:           branchId || null,
    tipo_alvo:           g.tipo_alvo,
    alvo_id:             g.alvo_id || g.id_vendedor || g.id_unidade || g.category_id || g.product_id || null,
    alvo_nome:           g.alvo_nome || null,
    alvo_contexto:       g.alvo_contexto || null,
    tipo_meta:           g.tipo_meta || 'valor',
    subtipo_operacional: g.subtipo_operacional || null,
    valor_sufixo:        g.valor_sufixo || null,
    periodo_mes:         Number(g.periodo_mes),
    periodo_ano:         Number(g.periodo_ano),
    valor_planejado:     g.valor_planejado ? Number(g.valor_planejado) : null,
    valor_atual:         g.valor_atual ? Number(g.valor_atual) : 0,
    status:              g.status || 'ativa',
    custom_fields: {
      id_vendedor:  g.id_vendedor,
      id_unidade:   g.id_unidade,
      category_id:  g.category_id,
      product_id:   g.product_id,
    },
  }
}

export function useGoals() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [goals, setGoals] = useState(MOCK_GOALS_SEED)
  const [loading, setLoading] = useState(true)
  const isMockMode = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) { isMockMode.current = true; setLoading(false); return }
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('periodo_ano', { ascending: false })
      .order('periodo_mes', { ascending: false })
    if (error) { isMockMode.current = true; setLoading(false); return }
    isMockMode.current = false
    setGoals((data || []).map(rowToGoal))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (records) => {
    const arr = Array.isArray(records) ? records : [records]
    if (isMockMode.current) {
      setGoals(prev => {
        let next = [...prev]
        arr.forEach(g => {
          const idx = next.findIndex(x => x.id === g.id)
          if (idx >= 0) next[idx] = g
          else next.push({ ...g, id: g.id || `g${Date.now()}${Math.random()}` })
        })
        return next
      })
      return { ok: true }
    }
    const rows = arr.map(g => goalToRow(g, tenantId, branchId))
    const toUpdate = arr.filter(g => typeof g.id === 'string' && g.id.includes('-'))
    const toInsert = arr.filter(g => !toUpdate.includes(g))

    for (const g of toUpdate) {
      await supabase.from('goals').update(goalToRow(g, tenantId, branchId)).eq('id', g.id)
    }
    if (toInsert.length > 0) {
      const { data, error } = await supabase.from('goals').insert(toInsert.map(g => goalToRow(g, tenantId, branchId))).select()
      if (error) return { ok: false, message: error.message }
      setGoals(prev => {
        let next = [...prev]
        toUpdate.forEach(g => { const idx = next.findIndex(x => x.id === g.id); if (idx >= 0) next[idx] = g })
        return [...next, ...(data || []).map(rowToGoal)]
      })
    } else {
      setGoals(prev => { let next = [...prev]; toUpdate.forEach(g => { const idx = next.findIndex(x => x.id === g.id); if (idx >= 0) next[idx] = g }); return next })
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setGoals(prev => prev.filter(g => g.id !== id)); return { ok: true } }
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setGoals(prev => prev.filter(g => g.id !== id))
    return { ok: true }
  }, [])

  return { goals, loading, reload: load, save, remove, setGoals, isMock: isMockMode }
}
