import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import {
  MOCK_PROJETOS, MOCK_PROJECT_PHASES, MOCK_TIME_LOGS,
  MOCK_PROJECT_ISSUES, MOCK_PROJECT_MEMBERS,
} from '../data/mockProjetos'

function rowToProject(row) {
  const cf = row.custom_fields || {}
  return {
    id:                      row.id,
    tenant_id:               row.tenant_id,
    branch_id:               row.branch_id || null,
    company_id:              row.company_id || null,
    company_nome:            row.companies?.nome_fantasia || row.companies?.razao_social || cf.company_nome || '',
    franchise_id:            cf.franchise_id || null,
    franchise_nome:          cf.franchise_nome || null,
    opportunity_id:          cf.opportunity_id || null,
    name:                    row.nome || '',
    phase:                   cf.phase || 'iniciacao',
    current_phase_index:     cf.current_phase_index || 1,
    status:                  row.status || 'em_andamento',
    total_hours_estimated:   cf.total_hours_estimated || 0,
    total_hours_executed:    cf.total_hours_executed || 0,
    start_date:              row.data_inicio || '',
    end_date_estimated:      row.data_fim || '',
    notes:                   row.descricao || '',
    created_at:              row.created_at?.slice(0, 10) || '',
  }
}

function projectToRow(p, tenantId, branchId) {
  return {
    tenant_id:  tenantId,
    branch_id:  branchId || null,
    company_id: p.company_id || null,
    nome:       p.name,
    status:     p.status || 'em_andamento',
    data_inicio:p.start_date || null,
    data_fim:   p.end_date_estimated || null,
    descricao:  p.notes || '',
    custom_fields: {
      company_nome:          p.company_nome,
      franchise_id:          p.franchise_id,
      franchise_nome:        p.franchise_nome,
      opportunity_id:        p.opportunity_id,
      phase:                 p.phase,
      current_phase_index:   p.current_phase_index,
      total_hours_estimated: p.total_hours_estimated,
      total_hours_executed:  p.total_hours_executed,
    },
  }
}

export function useProjects() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [projetos,    setProjetos]    = useState(MOCK_PROJETOS)
  const [phases,      setPhases]      = useState(MOCK_PROJECT_PHASES)
  const [timeLogs,    setTimeLogs]    = useState(MOCK_TIME_LOGS)
  const [issues,      setIssues]      = useState(MOCK_PROJECT_ISSUES)
  const [members,     setMembers]     = useState(MOCK_PROJECT_MEMBERS)
  const [loading,     setLoading]     = useState(true)
  const isMockMode                    = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)
    if (!session?.user) {
      isMockMode.current = true; setLoading(false); return
    }
    const { data, error } = await supabase
      .from('projects')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('created_at', { ascending: false })

    if (error) { isMockMode.current = true; setLoading(false); return }

    isMockMode.current = false
    setProjetos((data || []).map(rowToProject))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

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
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setProjetos(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [])

  // Fases, timeLogs, issues e members ficam em localStorage/mock por ora
  const savePhase   = useCallback((phase) => { setPhases(prev => { const idx = prev.findIndex(x => x.id === phase.id); if (idx >= 0) { const n = [...prev]; n[idx] = phase; return n } return [...prev, phase] }) }, [])
  const saveTimeLog = useCallback((log)   => { setTimeLogs(prev => { const idx = prev.findIndex(x => x.id === log.id); if (idx >= 0) { const n = [...prev]; n[idx] = log; return n } return [...prev, log] }) }, [])
  const saveIssue   = useCallback((issue) => { setIssues(prev => { const idx = prev.findIndex(x => x.id === issue.id); if (idx >= 0) { const n = [...prev]; n[idx] = issue; return n } return [...prev, issue] }) }, [])
  const removeIssue = useCallback((id)   => { setIssues(prev => prev.filter(x => x.id !== id)) }, [])

  return { projetos, phases, timeLogs, issues, members, loading, reload: load, save, remove, savePhase, saveTimeLog, saveIssue, removeIssue, setMembers, setProjetos, setPhases, setTimeLogs, setIssues }
}
