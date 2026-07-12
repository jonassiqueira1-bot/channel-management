import { supabase } from './supabase'

async function count(table, field, value, tenantId) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true }).eq(field, value)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { count: c } = await q
  return c || 0
}

// Retorna mensagem de bloqueio ou null se pode excluir
export async function checkEmUso(tipo, id, label, tenantId) {
  switch (tipo) {
    case 'empresa': {
      const opps = await count('oportunidades', 'company_id', id, tenantId)
      const cts  = await count('contratos',     'company_id', id, tenantId)
      const acs  = await count('actions',       'company_id', id, tenantId)
      const total = opps + cts + acs
      if (total > 0) return `"${label}" está em uso (${opps} oportunidade(s), ${cts} contrato(s), ${acs} ação(ões)) e não pode ser excluída.`
      return null
    }
    case 'funil': {
      const opps    = await count('oportunidades', 'funil_id', id, tenantId)
      const sellers = await count('sellers',       'funil_id', id, tenantId)
      const total = opps + sellers
      if (total > 0) return `"${label}" está em uso (${opps} oportunidade(s), ${sellers} vendedor(es)) e não pode ser excluído.`
      return null
    }
    case 'produto': {
      const { data } = await supabase
        .from('contratos')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('custom_fields::text', `%"${id}"%`)
      const total = data?.length || 0
      if (total > 0) return `"${label}" está em uso em ${total} contrato(s) e não pode ser excluído.`
      return null
    }
    case 'habilitacao': {
      const n = await count('partner_habilitacoes', 'habilitacao_id', String(id))
      if (n > 0) return `"${label}" está vinculada a ${n} parceiro(s) e não pode ser excluída.`
      return null
    }
    case 'usuario': {
      const n = await count('tasks', 'responsavel_id', id, tenantId)
      if (n > 0) return `Este usuário possui ${n} tarefa(s) vinculada(s). Inative-o em vez de excluir.`
      return null
    }
    case 'tipo_acao': {
      const tasks   = await count('tasks',   'tipo', label, tenantId)
      const actions = await count('actions', 'tipo', label, tenantId)
      const total = tasks + actions
      if (total > 0) return `"${label}" está em uso em ${tasks} tarefa(s) e ${actions} ação(ões) e não pode ser excluído.`
      return null
    }
    case 'perfil_acesso': {
      const { data } = await supabase
        .from('branch_sharing_rules')
        .select('id')
        .eq('tenant_id', tenantId)
        .contains('perfil_ids', [id])
      const n = data?.length || 0
      if (n > 0) return `"${label}" está em uso em ${n} regra(s) de compartilhamento e não pode ser excluído.`
      return null
    }
    case 'vendedor_nome': {
      // sellers não têm FK direta — verifica pelo nome como responsável
      const n = await count('oportunidades', 'responsavel', id, tenantId)
      if (n > 0) return `"${label}" é responsável por ${n} oportunidade(s). Reassigne antes de excluir.`
      return null
    }
    case 'campanha': {
      // campanhas não possuem FK direto — bloquear preventivamente se houver ações vinculadas
      const { data } = await supabase
        .from('actions')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('custom_fields::text', `%${id}%`)
      const n = data?.length || 0
      if (n > 0) return `"${label}" está em uso em ${n} ação(ões) e não pode ser excluída.`
      return null
    }
    default:
      return null
  }
}
