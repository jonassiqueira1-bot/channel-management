-- Gestão de ativação/desativação via Control Center: o site não cria conta
-- nem cancela assinatura sozinho mais — só registra a SOLICITAÇÃO. Quem
-- ativa (libera acesso) ou desativa (processa cancelamento) é sempre um
-- humano no Control Center.

-- ─── Solicitações de conta (cadastro público) ────────────────────────────────
-- Signup.js passa a só gravar aqui (via Edge Function solicitar-conta) — não
-- cria mais usuário nem tenant direto. O Control Center lê as pendentes e,
-- ao aprovar, dispara o mesmo provisionar-tenant já usado pra clientes pagos.
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name          text NOT NULL,
  nome              text NOT NULL,
  email             text NOT NULL,
  status            text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  boostly_tenant_id uuid,
  erro              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON public.signup_requests (status);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
-- Sem policy pra authenticated/anon de propósito: só a Edge Function
-- solicitar-conta (service_role) escreve; só o Control Center (via Edge
-- Function com service_role) lê. Ninguém acessa direto via PostgREST.

-- ─── Solicitações de cancelamento ────────────────────────────────────────────
-- Assinatura.js → "Solicitar cancelamento" passa a só gravar aqui, sem tocar
-- em tenants.cancellation_requested_at/cancel_at. O cancelamento em si (Asaas
-- + status do tenant) continua manual, feito pelo admin no Control Center.
CREATE TABLE IF NOT EXISTS public.tenant_cancellation_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  solicitado_por uuid REFERENCES auth.users(id),
  motivo        text,
  status        text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendida')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tenant_cancellation_requests_status ON public.tenant_cancellation_requests (status);
CREATE INDEX IF NOT EXISTS idx_tenant_cancellation_requests_tenant ON public.tenant_cancellation_requests (tenant_id);

ALTER TABLE public.tenant_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- O próprio tenant (qualquer usuário autenticado dele) pode solicitar e ver
-- as próprias solicitações — mas nunca resolver (isso é só Control Center
-- via service_role).
DROP POLICY IF EXISTS "tenant_insere_propria_solicitacao_cancelamento" ON public.tenant_cancellation_requests;
CREATE POLICY "tenant_insere_propria_solicitacao_cancelamento" ON public.tenant_cancellation_requests
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "tenant_ve_propria_solicitacao_cancelamento" ON public.tenant_cancellation_requests;
CREATE POLICY "tenant_ve_propria_solicitacao_cancelamento" ON public.tenant_cancellation_requests
  FOR SELECT USING (tenant_id = public.my_tenant_id());

GRANT SELECT, INSERT ON public.tenant_cancellation_requests TO authenticated;
GRANT ALL ON public.signup_requests, public.tenant_cancellation_requests TO service_role;

NOTIFY pgrst, 'reload schema';
