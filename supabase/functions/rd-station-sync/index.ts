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
    const reqUrl = new URL(req.url)
    const page = reqUrl.searchParams.get('page') || '1'

    // RD Station Marketing API — token privado vai como query param
    // Endpoint: GET /platform/conversions lista eventos de conversão
    const rdUrl = new URL(`${RD_BASE}/platform/conversions`)
    rdUrl.searchParams.set('auth_token', token)
    rdUrl.searchParams.set('page', page)
    rdUrl.searchParams.set('page_size', '50')
    if (integracao?.last_sync_at) {
      rdUrl.searchParams.set('created_at[from]', integracao.last_sync_at)
    }

    const rdResp = await fetch(rdUrl.toString(), {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!rdResp.ok) {
      const errText = await rdResp.text()
      return json({ ok: false, error: `RD API ${rdResp.status}: ${errText}` }, 502)
    }

    const rdData = await rdResp.json()
    // /platform/conversions retorna { conversions: [...], total: N }
    // cada conversão tem { conversion_identifier, created_at, lead: { name, email, ... } }
    const conversions: Record<string, unknown>[] = rdData.conversions || rdData.leads || (Array.isArray(rdData) ? rdData : [])

    const oportunidades = conversions.map((conv) => {
      // suporte a conversão com lead aninhado ou lead direto
      const lead = (conv.lead as Record<string, unknown>) || conv
      return {
        titulo:        (lead.name as string)         || (lead.email as string) || 'Lead RD Station',
        empresa_nome:  (lead.company_name as string) || '',
        contato_nome:  (lead.name as string)         || '',
        contato_email: (lead.email as string)        || '',
        contato_fone:  (lead.mobile_phone as string) || (lead.phone as string) || '',
        origem:        'RD Station Marketing',
        fonte_conversao: (conv.conversion_identifier as string) || '',
        situacao:      'em_negociacao',
        valor:         0,
        descricao:     [
          lead.city          ? `Cidade: ${lead.city}`           : '',
          lead.state         ? `Estado: ${lead.state}`          : '',
          lead.personal_phone? `Tel: ${lead.personal_phone}`    : '',
          conv.conversion_identifier ? `Conversão: ${conv.conversion_identifier}` : '',
          lead.tags          ? `Tags: ${(lead.tags as string[]).join(', ')}` : '',
        ].filter(Boolean).join('\n'),
        fonte:        'rd_station',
        rd_lead_id:   (lead.uuid as string) || (lead.id as string) || (conv.id as string),
      }
    })

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
