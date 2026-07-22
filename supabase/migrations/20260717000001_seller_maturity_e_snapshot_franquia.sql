-- ═══════════════════════════════════════════════════════════════════════════
-- Contato Canal (sellers) pode trocar de franquia ou sair/voltar da empresa.
-- Duas peças pra manter histórico correto:
--   1) oportunidade_membros.franquia_id_na_epoca — snapshot da franquia do
--      vendedor no momento em que ele foi associado à Oportunidade (o vínculo
--      já é por sellers.id, estável; só a franquia era "viva" e mudava
--      retroativamente o histórico se o vendedor trocasse de franquia depois).
--   2) seller_maturity_params/scores — mesmo modelo de benchmark já usado em
--      Parceiros (partner_maturity_params/scores), só que por Contato Canal
--      (pessoa) em vez de por Franquia (entidade), com origens diferentes.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.oportunidade_membros
  ADD COLUMN IF NOT EXISTS franquia_id_na_epoca uuid REFERENCES public.parceiros(id) ON DELETE SET NULL;

-- ─── Parâmetros de maturidade de Contatos Canais (vendedores/parceiros pessoa) ─
CREATE TABLE IF NOT EXISTS public.seller_maturity_params (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text,
  origem      text NOT NULL, -- oportunidades | oportunidades_ganhas | contracts
  condicao    text NOT NULL DEFAULT 'exists', -- exists | count_gte | count_gte_days
  valor_min   integer NOT NULL DEFAULT 1,
  janela_dias integer,
  peso        integer NOT NULL DEFAULT 10,
  ativo       boolean NOT NULL DEFAULT true,
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.seller_maturity_params ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own" ON public.seller_maturity_params;
CREATE POLICY "tenant_own" ON public.seller_maturity_params
  USING (tenant_id = public.my_tenant_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_maturity_params TO authenticated;

-- ─── Histórico de scores por Contato Canal ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_maturity_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  seller_id     uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  score_pct     numeric(5,2) NOT NULL DEFAULT 0,
  detalhes      jsonb NOT NULL DEFAULT '{}',
  calculado_em  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_scores_seller ON public.seller_maturity_scores (seller_id, calculado_em DESC);
CREATE INDEX IF NOT EXISTS idx_seller_scores_tenant ON public.seller_maturity_scores (tenant_id, calculado_em DESC);

ALTER TABLE public.seller_maturity_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_own" ON public.seller_maturity_scores;
CREATE POLICY "tenant_own" ON public.seller_maturity_scores
  USING (tenant_id = public.my_tenant_id());
GRANT SELECT, INSERT ON public.seller_maturity_scores TO authenticated;

-- ─── Permissão de módulo (mesmo padrão de maturidade_parceiros) ───────────────
UPDATE public.perfis_acesso
SET permissions = jsonb_set(permissions, '{maturidade_vendedores}', '{"acessar":true,"criar_editar":true}'::jsonb)
WHERE slug IN ('master', 'gestor');

UPDATE public.perfis_acesso
SET permissions = jsonb_set(permissions, '{maturidade_vendedores}', '{"acessar":false,"criar_editar":false}'::jsonb)
WHERE slug NOT IN ('master', 'gestor');

NOTIFY pgrst, 'reload schema';
