import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export const AUDIT_LOG_KEY = 'sistema:audit_log_v1'

function loadLocal() { try { const r = localStorage.getItem(AUDIT_LOG_KEY); return r ? JSON.parse(r) : [] } catch { return [] } }
function persistLocal(list) { try { localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(list.slice(0, 2000))) } catch {} }

export function useAuditLog() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const [logs, setLogs] = useState(loadLocal)
  const isMock = useRef(false)
  const tid = useRef(null)

  useEffect(() => { tid.current = profile?.tenant_id }, [profile?.tenant_id])

  // Carrega os 500 mais recentes do Supabase (ou localStorage em modo mock)
  useEffect(() => {
    async function fetchLogs() {
      if (!session?.user) { isMock.current = true; setLogs(loadLocal()); return }
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)
      if (error) { isMock.current = true; setLogs(loadLocal()) }
      else { isMock.current = false; setLogs(data || []) }
    }
    fetchLogs()
  }, [session])

  const registrar = useCallback(async (acao, entidade, entidade_id, dados = {}) => {
    const entrada = {
      timestamp:    new Date().toISOString(),
      tenant_id:    tid.current || null,
      usuario_id:   profile?.id   || null,
      usuario_nome: profile?.nome || 'Sistema',
      acao,
      entidade,
      entidade_id:  String(entidade_id || ''),
      descricao:    dados.descricao || '',
      antes:        dados.antes     || null,
      depois:       dados.depois    || null,
    }

    // Atualiza local imediatamente (otimista)
    setLogs(prev => {
      const next = [entrada, ...prev].slice(0, 2000)
      if (isMock.current) persistLocal(next)
      return next
    })

    // Persiste no Supabase se autenticado
    if (!isMock.current && session?.user) {
      await supabase.from('audit_logs').insert(entrada)
    }
  }, [profile, session])

  const limpar = useCallback(async () => {
    if (!window.confirm('Apagar todo o histórico de logs? Esta ação não pode ser desfeita.')) return
    if (isMock.current) {
      persistLocal([])
      setLogs([])
    } else {
      const { error } = await supabase.from('audit_logs').delete().eq('tenant_id', tid.current)
      if (!error) setLogs([])
    }
  }, [])

  return { logs, setLogs, registrar, limpar }
}
