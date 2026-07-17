-- Participantes de Ações — Contatos Canal (vendedores/franquia) relacionados a
-- uma Ação, mesmo padrão de oportunidade_membros (bench: Aba Equipe da
-- Oportunidade). user_id aqui é profiles.id (usuário com papel='contato_canal'
-- e vínculo em profiles.contact_id -> sellers.id), não sellers.id diretamente
-- — mesmo modelo já usado em oportunidade_membros/OppEquipeTab.
CREATE TABLE IF NOT EXISTS public.acao_membros (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id      uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  acao_id        uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  papel          text NOT NULL DEFAULT 'participante',
  tipo_membro    text NOT NULL DEFAULT 'canal',
  franquia_id_na_epoca uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acao_membros_tenant ON public.acao_membros (tenant_id);
CREATE INDEX IF NOT EXISTS idx_acao_membros_acao   ON public.acao_membros (acao_id);

ALTER TABLE public.acao_membros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own" ON public.acao_membros
  USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acao_membros TO authenticated;

NOTIFY pgrst, 'reload schema';
