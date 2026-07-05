import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'
import { useBranchContext } from '../contexts/BranchContext'

// Mapeamento: chave do módulo (UI) → nome(s) da tabela no banco
export const MODULO_TABELAS = {
  // ── Menu principal ────────────────────────────────────────────
  pipeline:         ['oportunidades'],
  tarefas:          ['tasks'],
  playbooks:        ['playbooks'],
  vendedores:       ['sellers'],
  acoes:            ['actions'],
  parceiros:        ['parceiros'],
  empresas:         ['companies'],
  contatos:         ['contacts'],
  projetos:         ['projects'],
  customer_success: ['customer_health'],
  contratos:        ['contracts'],
  pagamentos:       ['payments'],
  comissoes:        ['commission_rules'],
  questionarios:    ['questionnaire_templates'],
  documentos:       ['documents'],
  metas:            ['goals'],
  relatorios:       ['relatorios'],
  // ── Configurações ─────────────────────────────────────────────
  cfg_parceiros:    ['parceiros'],
  cfg_maturidade:   ['partner_maturity_params'],
  cfg_perfis:       ['perfis_acesso'],
  cfg_equipes:      ['equipes'],
  cfg_habilitacoes: ['habilitacoes'],
  cfg_produtos:     ['products'],
  cfg_funis:        ['form_layouts'],
  cfg_tipos_acoes:  ['tipos_acao'],
  cfg_campanhas:    ['campanhas'],
  cfg_indicadores:  ['indicadores'],
  cfg_metas_kpis:   ['metas_kpi'],
  cfg_alertas:      ['alert_rules'],
  // dashboard, cfg_usuarios, cfg_campos, cfg_integracoes, cfg_logs → sem tabela compartilhável
}

// Agrupa linhas do banco por regra_id → formato UI
function rowsToRegras(rows) {
  const map = {}
  for (const row of rows) {
    const rid = row.regra_id || row.id
    if (!map[rid]) {
      map[rid] = {
        id:         rid,
        filial_ids: new Set(),
        modulos:    new Set(),
        permissao:  row.can_edit ? 'leitura_escrita' : 'leitura',
        ...(row.meta || {}),
      }
    }
    map[rid].filial_ids.add(row.source_branch_id)
    map[rid].filial_ids.add(row.target_branch_id)
    // Converte entity_table de volta para module key
    for (const [key, tables] of Object.entries(MODULO_TABELAS)) {
      if (tables.includes(row.entity_table)) map[rid].modulos.add(key)
    }
  }
  return Object.values(map).map(r => ({
    ...r,
    filial_ids: [...r.filial_ids],
    modulos:    [...r.modulos],
  }))
}

export function useBranchSharing() {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { activeBranchId } = useBranchContext()
  const [regras, setRegras] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return }
    let q = supabase
      .from('branch_table_visibility')
      .select('*')
      .order('created_at')
    if (activeBranchId) q = q.or('source_branch_id.eq.' + activeBranchId + ',target_branch_id.eq.' + activeBranchId)
    const { data } = await q
    setRegras(data ? rowsToRegras(data) : [])
    setLoading(false)
  }, [session, activeBranchId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (regra) => {
    if (!profile?.tenant_id) return { ok: false, message: 'Sem tenant' }

    const regra_id = regra.id && typeof regra.id === 'string' && regra.id.includes('-')
      ? regra.id
      : crypto.randomUUID()

    const can_edit = regra.permissao === 'leitura_escrita'
    const meta = {
      descricao:   regra.descricao   || '',
      acesso:      regra.acesso      || 'todos',
      perfil_ids:  regra.perfil_ids  || [],
      usuario_ids: regra.usuario_ids || [],
      permissao:   regra.permissao   || 'leitura',
    }

    // Gera todas as combinações: cada par de filiais (bidirecional) × cada tabela de módulo
    const filiais = regra.filial_ids || []
    const rows = []
    for (let i = 0; i < filiais.length; i++) {
      for (let j = 0; j < filiais.length; j++) {
        if (i === j) continue
        for (const modKey of (regra.modulos || [])) {
          const tabelas = MODULO_TABELAS[modKey] || []
          for (const entity_table of tabelas) {
            rows.push({
              source_branch_id: filiais[i],
              target_branch_id: filiais[j],
              entity_table,
              can_view:  true,
              can_edit,
              meta,
            })
          }
        }
      }
    }

    if (rows.length === 0) return { ok: false, message: 'Nenhum módulo com tabela de dados mapeada' }

    // RPC atômica: deleta as linhas antigas e insere as novas em uma única transação
    const { error } = await supabase.rpc('save_branch_sharing_rule', {
      p_regra_id: regra_id,
      p_rows:     rows,
    })

    if (error) return { ok: false, message: error.message }
    await load()
    return { ok: true }
  }, [profile, load])

  const remove = useCallback(async (regra_id) => {
    const { error } = await supabase
      .from('branch_table_visibility')
      .delete()
      .eq('regra_id', regra_id)
    if (error) return { ok: false, message: error.message }
    setRegras(prev => prev.filter(r => r.id !== regra_id))
    return { ok: true }
  }, [])

  return { regras, loading, reload: load, save, remove }
}
