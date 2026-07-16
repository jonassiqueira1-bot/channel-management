import { useState, useEffect, useCallback } from 'react'
import { supabase, softDelete } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { captureError } from '../lib/sentry'

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
    const existentes = (data || []).map(r => r.nome)
    // Semeia item a item (upsert idempotente) os defaults que ainda faltam —
    // antes só semeava se a tabela estivesse 100% vazia, então um único item
    // pré-existente (ou uma falha de insert nunca detectada, já que o erro
    // não era checado) travava o catálogo incompleto pra sempre.
    const faltando = defaults.filter(nome => !existentes.includes(nome))
    if (faltando.length > 0) {
      const rows = faltando.map(nome => ({ tenant_id: tenantId, tipo, nome }))
      const { error: seedError } = await supabase.from('contact_list_options')
        .upsert(rows, { onConflict: 'tenant_id,tipo,nome', ignoreDuplicates: true })
      if (seedError) captureError('useContactListOptions:seed', seedError)
    }
    setOpcoesState([...new Set([...existentes, ...defaults])])
    setLoading(false)
  }, [session, tenantId, tipo, defaults])

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
