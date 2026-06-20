import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RD_BASE = 'https://api.rd.services'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Não autorizado' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Autentica usuário via JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return json({ ok: false, error: 'Token inválido' }, 401)

    // Busca tenant do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) return json({ ok: false, error: 'Tenant não encontrado' }, 400)

    // Busca credenciais RD do tenant
    const { data: integracao } = await supabase
      .from('integracoes')
      .select('credentials, config, last_sync_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('provider', 'rd_station')
      .maybeSingle()

    const token = integracao?.credentials?.token_privado
    if (!token) return json({ ok: false, error: 'Token RD Station não configurado para este tenant' }, 400)

    // Parâmetros da requisição
    const url = new URL(req.url)
    const page = url.searchParams.get('page') || '1'
    const pageSince = integracao?.last_sync_at
      ? `&created_at[from]=${integracao.last_sync_at}`
      : ''

    // Chama API do RD Station Marketing
    const rdUrl = `${RD_BASE}/platform/leads?page=${page}&page_size=50${pageSince}`
    const rdResp = await fetch(rdUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!rdResp.ok) {
      const errText = await rdResp.text()
      return json({ ok: false, error: `RD API ${rdResp.status}: ${errText}` }, 502)
    }

    const rdData = await rdResp.json()
    const leads: Record<string, unknown>[] = rdData.leads || rdData || []

    // Mapeia leads para formato de oportunidade
    const oportunidades = leads.map((lead) => ({
      titulo:       lead.name        || lead.email || 'Lead RD Station',
      empresa_nome: lead.company_name || '',
      contato_nome: lead.name         || '',
      contato_email:lead.email        || '',
      contato_fone: lead.mobile_phone || lead.phone || '',
      origem:       'RD Station Marketing',
      situacao:     'em_negociacao',
      valor:        0,
      descricao:    [
        lead.city    ? `Cidade: ${lead.city}`    : '',
        lead.state   ? `Estado: ${lead.state}`   : '',
        lead.tags    ? `Tags: ${(lead.tags as string[]).join(', ')}` : '',
        lead.personal_phone ? `Tel: ${lead.personal_phone}` : '',
      ].filter(Boolean).join('\n'),
      fonte:        'rd_station',
      rd_lead_id:   lead.uuid || lead.id,
    }))

    // Atualiza last_sync_at e status
    await supabase
      .from('integracoes')
      .update({ last_sync_at: new Date().toISOString(), status: 'active', updated_at: new Date().toISOString() })
      .eq('tenant_id', profile.tenant_id)
      .eq('provider', 'rd_station')

    return json({
      ok: true,
      total: rdData.total || leads.length,
      pagina: Number(page),
      oportunidades,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ ok: false, error: msg }, 500)
  }
})
