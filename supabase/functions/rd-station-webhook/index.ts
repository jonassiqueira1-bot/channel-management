import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = new URL(req.url)
    const webhookToken = url.searchParams.get('token')
    if (!webhookToken) return json({ ok: false, error: 'Token ausente' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Identifica o tenant pelo webhook_token salvo em integracoes
    const { data: integracao } = await supabase
      .from('integracoes')
      .select('tenant_id')
      .eq('provider', 'rd_station')
      .eq('config->>webhook_token', webhookToken)
      .maybeSingle()

    if (!integracao?.tenant_id) {
      return json({ ok: false, error: 'Token inválido' }, 401)
    }

    const payload = await req.json()

    // Salva na fila para o app processar
    const { error } = await supabase
      .from('rd_leads_queue')
      .insert({
        tenant_id: integracao.tenant_id,
        payload,
        processed: false,
      })

    if (error) return json({ ok: false, error: error.message }, 500)

    // Atualiza last_sync_at
    await supabase
      .from('integracoes')
      .update({ last_sync_at: new Date().toISOString(), status: 'active' })
      .eq('tenant_id', integracao.tenant_id)
      .eq('provider', 'rd_station')

    return json({ ok: true })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return json({ ok: false, error: msg }, 500)
  }
})
