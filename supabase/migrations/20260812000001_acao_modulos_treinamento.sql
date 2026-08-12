-- Módulos de treinamento — feature aditiva, só visível quando Tipo de Ação =
-- 'treinamento'. Não altera nenhuma tabela/coluna existente (actions,
-- acao_membros, documents ficam intocadas). Segue o mesmo padrão de
-- acao_membros: tenant_id + branch_id + FK pra actions ON DELETE CASCADE,
-- RLS tenant-wide, GRANT authenticated, NOTIFY no final.

-- handle_updated_at() é referenciada pelo trigger de public.actions desde
-- 20260627000012, mas nunca foi versionada em nenhuma migration (criada via
-- SQL Editor). CREATE OR REPLACE aqui só garante que existe, sem risco —
-- é o padrão universal (NEW.updated_at = now()).
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── acao_modulos — um módulo pertence a uma Ação ────────────────────────────
CREATE TABLE IF NOT EXISTS public.acao_modulos (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id                 uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  acao_id                   uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  titulo                    text NOT NULL,
  ordem                     int  NOT NULL DEFAULT 0,
  -- Mesmo padrão de "Responsável (ISV)" já usado na aba Dados — FK pra profiles.
  instrutor_responsavel_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acao_modulos_tenant ON public.acao_modulos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acao_modulos_acao   ON public.acao_modulos (acao_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.acao_modulos;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.acao_modulos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── acao_modulo_itens — item de um módulo, referencia um Documento já existente ──
-- Não duplica documento: só guarda o FK. Upload/cadastro continua exclusivo
-- do módulo Documentos.
CREATE TABLE IF NOT EXISTS public.acao_modulo_itens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modulo_id     uuid NOT NULL REFERENCES public.acao_modulos(id) ON DELETE CASCADE,
  documento_id  uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  ordem         int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acao_modulo_itens_tenant  ON public.acao_modulo_itens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acao_modulo_itens_modulo  ON public.acao_modulo_itens (modulo_id);
CREATE INDEX IF NOT EXISTS idx_acao_modulo_itens_doc     ON public.acao_modulo_itens (documento_id);

-- ─── acao_modulo_progresso — progresso individual, por participante e item ───
-- seller_id usa a MESMA semântica de acao_membros.user_id (é sellers.id, não
-- profiles.id) — participante "vendedor externo" loga como profiles.role=
-- 'parceiro' com profiles.contact_id apontando pro seller correspondente
-- (ver my_contact_id(), criada em 20260705000009_partner_portal_access.sql).
CREATE TABLE IF NOT EXISTS public.acao_modulo_progresso (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  acao_id          uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  modulo_item_id   uuid NOT NULL REFERENCES public.acao_modulo_itens(id) ON DELETE CASCADE,
  seller_id        uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  concluido        boolean NOT NULL DEFAULT false,
  concluido_em     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modulo_item_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_acao_modulo_progresso_tenant ON public.acao_modulo_progresso (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acao_modulo_progresso_acao   ON public.acao_modulo_progresso (acao_id);
CREATE INDEX IF NOT EXISTS idx_acao_modulo_progresso_seller ON public.acao_modulo_progresso (seller_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.acao_modulo_progresso;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.acao_modulo_progresso
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.acao_modulos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acao_modulo_itens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acao_modulo_progresso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_own" ON public.acao_modulos;
CREATE POLICY "tenant_own" ON public.acao_modulos
  USING (tenant_id = public.my_tenant_id()) WITH CHECK (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "tenant_own" ON public.acao_modulo_itens;
CREATE POLICY "tenant_own" ON public.acao_modulo_itens
  USING (tenant_id = public.my_tenant_id()) WITH CHECK (tenant_id = public.my_tenant_id());

-- Progresso: base é tenant-wide (equipe ISV vê/gerencia tudo), mas uma policy
-- RESTRICTIVE adicional trava quem é 'parceiro' a só mexer na própria linha —
-- mesmo padrão exato usado em oportunidades pra parceiro (AS RESTRICTIVE,
-- pra sobrepor a permissiva tenant-wide via AND, não OR).
DROP POLICY IF EXISTS "tenant_select" ON public.acao_modulo_progresso;
CREATE POLICY "tenant_select" ON public.acao_modulo_progresso
  FOR SELECT USING (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "tenant_manage" ON public.acao_modulo_progresso;
CREATE POLICY "tenant_manage" ON public.acao_modulo_progresso
  FOR ALL USING (tenant_id = public.my_tenant_id()) WITH CHECK (tenant_id = public.my_tenant_id());

DROP POLICY IF EXISTS "parceiro_restrict_own" ON public.acao_modulo_progresso;
CREATE POLICY "parceiro_restrict_own" ON public.acao_modulo_progresso
  AS RESTRICTIVE
  USING (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parceiro')
    OR seller_id = public.my_contact_id()
  )
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parceiro')
    OR seller_id = public.my_contact_id()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acao_modulos          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acao_modulo_itens     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acao_modulo_progresso TO authenticated;

NOTIFY pgrst, 'reload schema';
