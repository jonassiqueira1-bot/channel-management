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

  const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verifica que quem chama é admin do mesmo tenant
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autenticado' }, 401)

  const caller = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user: callerUser } } = await caller.auth.getUser()
  if (!callerUser) return json({ error: 'Não autenticado' }, 401)

  const { data: callerProfile } = await caller
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', callerUser.id)
    .single()

  if (callerProfile?.role !== 'admin_isv') return json({ error: 'Acesso negado' }, 403)

  const { userId } = await req.json()
  if (!userId) return json({ error: 'userId é obrigatório' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Verifica que o usuário alvo pertence ao mesmo tenant
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (targetProfile?.tenant_id !== callerProfile.tenant_id) {
    return json({ error: 'Acesso negado' }, 403)
  }

  // Deleta de auth.users (profiles é deletado via ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true })
})
