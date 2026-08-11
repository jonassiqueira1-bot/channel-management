// ─── Solicitação de conta (cadastro público) ──────────────────────────────────
// Substitui o antigo fluxo de Signup.js que criava usuário + tenant direto no
// navegador. Agora só registra a intenção — quem provisiona de verdade é um
// humano no Control Center (mesmo caminho de "+ Novo tenant", já testado).
// Público, sem auth — protegido só por validação básica + dedupe.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => null)
    const { org_name, nome, email } = body ?? {}
    if (!org_name || !nome || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'org_name, nome e email válidos são obrigatórios' }, 400)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Dedupe: não empilhar solicitações repetidas do mesmo e-mail enquanto a
    // anterior ainda não foi processada.
    const { data: existente } = await admin
      .from('signup_requests')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pendente')
      .maybeSingle()
    if (existente) {
      return json({ ok: true, ja_existia: true })
    }

    const { error } = await admin.from('signup_requests').insert({
      org_name, nome, email: email.toLowerCase(),
    })
    if (error) return json({ ok: false, error: error.message }, 500)

    return json({ ok: true })
  } catch (e) {
    console.error('[solicitar-conta] uncaught:', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
