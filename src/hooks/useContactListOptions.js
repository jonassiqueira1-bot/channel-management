import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

export const CARGOS_DEFAULT = [
  'Diretor(a)', 'C-Level (CEO/CTO/CFO/COO)', 'Gerente', 'Coordenador(a)',
  'Supervisor(a)', 'Analista', 'Assistente', 'Consultor(a)', 'Comprador(a)', 'Outro',
]

export const DEPARTAMENTOS_DEFAULT = [
  'Comercial / Vendas', 'Marketing', 'TI / Tecnologia', 'Financeiro', 'Operações',
  'Manutenção', 'Produção', 'RH', 'Jurídico', 'Compras', 'Diretoria / Presidência', 'Outro',
]

// Lista fechada por tenant+tipo — substitui os <input> de texto livre de
// Cargo/Departamento em Contatos (antes cada contato guardava uma string
// distinta, o que impedia qualquer comparação real contra o ICP do
// Playbook: "Analista PCM" e "Analista de PCM" nunca batiam).
export function useContactListOptions(tipo, defaults) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const tenantId = profile?.tenant_id

  const [opcoes, setOpcoesState] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session?.user || !tenantId) { setLoading(false); return }
    const { data, error } = await supabase.from('contact_list_options').select('nome').eq('tenant_id', tenantId).eq('tipo', tipo).order('nome')
    if (error) { setLoading(false); return }
    if (data && data.length > 0) {
      setOpcoesState(data.map(r => r.nome))
    } else {
      const rows = defaults.map(nome => ({ tenant_id: tenantId, tipo, nome }))
      const { data: seeded } = await supabase.from('contact_list_options').insert(rows).select('nome')
      setOpcoesState((seeded || []).map(r => r.nome).length ? seeded.map(r => r.nome) : defaults)
    }
    setLoading(false)
  }, [session, tenantId, tipo])

  useEffect(() => { load() }, [load])

  const setOpcoes = useCallback((updater) => {
    setOpcoesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const added   = next.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !next.includes(n))
      added.forEach(nome => {
        supabase.from('contact_list_options').upsert({ tenant_id: tenantId, tipo, nome }, { onConflict: 'tenant_id,tipo,nome' })
      })
      removed.forEach(async nome => {
        const { data } = await supabase.from('contact_list_options').select('id').eq('tenant_id', tenantId).eq('tipo', tipo).eq('nome', nome).single()
        if (data?.id) softDelete('contact_list_options', data.id)
      })
      return next
    })
  }, [tenantId, tipo])

  return { opcoes, setOpcoes, loading }
}
