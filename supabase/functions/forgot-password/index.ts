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
    const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
    const APP_URL          = Deno.env.get('APP_URL') || 'https://app.boostly.com.br'

    const { email } = await req.json()
    if (!email) return json({ error: 'email é obrigatório' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Gera link de recuperação sem disparar email pelo Supabase
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    })

    if (linkErr) {
      // Não revelamos se o email existe ou não (segurança)
      console.error('[forgot-password] generateLink:', linkErr.message)
      return json({ ok: true })
    }

    const actionLink = linkData?.properties?.action_link
    if (!actionLink) return json({ ok: true })

    // Envia via Resend com template da marca
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey':        ANON_KEY,
      },
      body: JSON.stringify({
        template: 'recuperar_senha',
        to:       email,
        data:     { link: actionLink },
      }),
    })

    return json({ ok: true })

  } catch (e) {
    console.error('[forgot-password] uncaught:', e)
    return json({ error: String(e) }, 500)
  }
})
