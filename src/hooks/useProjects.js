import { captureError } from '../lib/sentry'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'
const PHASE_ORDER = { iniciacao: 1, modelagem: 2, implantacao: 3, treinamento: 4, go_live: 5, encerramento: 6 }

function rowToProject(row) {
  const cf    = row.custom_fields || {}
  const phase = cf.phase || 'iniciacao'
  return {
    id:                      row.id,
    tenant_id:               row.tenant_id,
    branch_id:               row.branch_id || null,
    company_id:              row.company_id || null,
    company_nome:            row.companies?.nome_fantasia || row.companies?.razao_social || cf.company_nome || '',
    franchise_id:            cf.franchise_id  || null,
    franchise_nome:          cf.franchise_nome || null,
    opportunity_id:          cf.opportunity_id || null,
    name:                    row.nome || '',
    phase,
    current_phase_index:     PHASE_ORDER[phase] || 1,
    status:                  row.status || 'em_andamento',
    total_hours_estimated:   Number(cf.total_hours_estimated) || 0,
    total_hours_executed:    Number(cf.total_hours_executed)  || 0,
    start_date:              row.data_inicio || '',
    end_date_estimated:      row.data_fim    || '',
    notes:                   row.descricao   || '',
    created_at:              row.created_at?.slice(0, 10) || '',
    fin_custo_hora:          cf.fin_custo_hora       ?? null,
    fin_valor_contrato:      cf.fin_valor_contrato   ?? null,
    fin_custo_realizado:     cf.fin_custo_realizado  ?? null,
    fin_receita_faturada:    cf.fin_receita_faturada ?? null,
    fin_margem_bruta:        cf.fin_margem_bruta     ?? null,
    fin_margem_pct:          cf.fin_margem_pct       ?? null,
    fin_custo_forecast:      cf.fin_custo_forecast   ?? null,
    fin_margem_forecast:     cf.fin_margem_forecast  ?? null,
    fin_horas_aprovadas:     cf.fin_horas_aprovadas  ?? null,
    fin_horas_executadas:    cf.fin_horas_executadas ?? null,
    fin_atualizado_em:       cf.fin_atualizado_em    || null,
    centro_custo_id:         cf.centro_custo_id      || '',
  }
}

function projectToRow(p, tenantId, branchId) {
  return {
    tenant_id:  tenantId,
    branch_id:  branchId || null,
    company_id: p.company_id || null,
    nome:       p.name || '',
    status:     p.status || 'em_andamento',
    data_inicio: p.start_date         || null,
    data_fim:    p.end_date_estimated || null,
    descricao:   p.notes              || '',
    custom_fields: {
      company_nome:          p.company_nome,
      franchise_id:          p.franchise_id,
      franchise_nome:        p.franchise_nome,
      opportunity_id:        p.opportunity_id,
      phase:                 p.phase || 'iniciacao',
      current_phase_index:   PHASE_ORDER[p.phase] || 1,
      total_hours_estimated: Number(p.total_hours_estimated) || 0,
      total_hours_executed:  Number(p.total_hours_executed)  || 0,
      centro_custo_id:       p.centro_custo_id || null,
    },
  }
}

export function useProjects() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()

  const [projetos,    setProjetos]    = useState([])
  const [phases,      setPhases]      = useState([])
  const [timeLogs,    setTimeLogs]    = useState(() => {
    try { const s = localStorage.getItem('projetos:timeLogs_v1'); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })
  const [tasks,       setTasks]       = useState(() => {
    try { const s = localStorage.getItem('projetos:tasks_v1'); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })
  const [issues,      setIssues]      = useState([])
  const [members,     setMembers]     = useState(() => {
    try { const s = localStorage.getItem('projetos:members_v1'); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })
  const [loading,     setLoading]     = useState(true)
  const isMockMode                    = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMockMode.current = true; setLoading(false); return
    }
    let _q = supabase.from('projects').select('*, companies(nome_fantasia, razao_social)')
    const { data, error } = await _q.order('created_at', { ascending: false })

    if (error) { captureError('useProjects', error); isMockMode.current = true; setLoading(false); return }

    isMockMode.current = false
    setProjetos((data || []).map(rowToProject))
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  // Sync para localStorage — permite que Indicadores leiam os dados
  useEffect(() => {
    if (!loading) localStorage.setItem('projetos:lista_v2', JSON.stringify(projetos))
  }, [projetos, loading])

  const save = useCallback(async (p) => {
    if (isMockMode.current) {
      setProjetos(prev => {
        const idx = prev.findIndex(x => x.id === p.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
        return [...prev, { ...p, id: p.id || `prj${Date.now()}`, created_at: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }
    const row = projectToRow(p, tenantId, branchId)
    const isUuid = typeof p.id === 'string' && p.id.includes('-')
    if (isUuid) {
      const { error } = await supabase.from('projects').update(row).eq('id', p.id)
      if (error) return { ok: false, message: error.message }
      setProjetos(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x))
    } else {
      const { data, error } = await supabase.from('projects').insert(row).select('*, companies(nome_fantasia, razao_social)').single()
      if (error) return { ok: false, message: error.message }
      setProjetos(prev => [...prev, rowToProject(data)])
    }
    return { ok: true }
  }, [tenantId, branchId])

  const remove = useCallback(async (id) => {
    if (isMockMode.current) { setProjetos(prev => prev.filter(p => p.id !== id)); return { ok: true } }
    const { error } = await softDelete('projects', id)
    if (error) return { ok: false, message: error.message }
    setProjetos(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  // Sync para localStorage
  useEffect(() => { localStorage.setItem('projetos:timeLogs_v1', JSON.stringify(timeLogs)) }, [timeLogs])
  useEffect(() => { localStorage.setItem('projetos:members_v1',  JSON.stringify(members))  }, [members])
  useEffect(() => { localStorage.setItem('projetos:tasks_v1',    JSON.stringify(tasks))    }, [tasks])

  const savePhase = useCallback((phase) => {
    setPhases(prev => { const i = prev.findIndex(x => x.id === phase.id); if (i >= 0) { const n=[...prev]; n[i]=phase; return n } return [...prev, phase] })
  }, [])
  const saveTimeLog = useCallback((log) => {
    setTimeLogs(prev => { const i = prev.findIndex(x => x.id === log.id); if (i >= 0) { const n=[...prev]; n[i]=log; return n } return [...prev, log] })
  }, [])
  const saveTask = useCallback((task) => {
    setTasks(prev => { const i = prev.findIndex(x => x.id === task.id); if (i >= 0) { const n=[...prev]; n[i]=task; return n } return [...prev, task] })
  }, [])
  const saveTasks = useCallback((list) => {
    setTasks(prev => {
      const next = [...prev.filter(t => !list.find(l => l.id === t.id)), ...list]
      return next
    })
  }, [])
  const removeTask = useCallback((id) => { setTasks(prev => prev.filter(x => x.id !== id)) }, [])
  const saveIssue  = useCallback((issue) => {
    setIssues(prev => { const i = prev.findIndex(x => x.id === issue.id); if (i >= 0) { const n=[...prev]; n[i]=issue; return n } return [...prev, issue] })
  }, [])
  const removeIssue = useCallback((id) => { setIssues(prev => prev.filter(x => x.id !== id)) }, [])

  return { projetos, phases, tasks, timeLogs, issues, members, loading, reload: load, save, remove, savePhase, saveTask, saveTasks, removeTask, saveTimeLog, saveIssue, removeIssue, setMembers, setProjetos, setPhases, setTasks, setTimeLogs, setIssues }
}
