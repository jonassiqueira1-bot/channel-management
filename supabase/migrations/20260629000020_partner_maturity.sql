-- ─── Parâmetros de maturidade de parceiros ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_maturity_params (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text,
  origem      text NOT NULL, -- contacts | oportunidades | contracts | actions | habilitacoes
  condicao    text NOT NULL DEFAULT 'exists', -- exists | count_gte | count_gte_days
  valor_min   integer NOT NULL DEFAULT 1,
  janela_dias integer, -- null = sem janela
  peso        integer NOT NULL DEFAULT 10,
  ativo       boolean NOT NULL DEFAULT true,
  ordem       integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.partner_maturity_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own" ON public.partner_maturity_params
  USING (tenant_id = my_tenant_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_maturity_params TO authenticated;

-- ─── Histórico de scores ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_maturity_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parceiro_id   uuid NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  score_pct     numeric(5,2) NOT NULL DEFAULT 0,
  detalhes      jsonb NOT NULL DEFAULT '{}',
  calculado_em  timestamptz DEFAULT now()
);

CREATE INDEX idx_partner_scores_parceiro ON public.partner_maturity_scores (parceiro_id, calculado_em DESC);
CREATE INDEX idx_partner_scores_tenant   ON public.partner_maturity_scores (tenant_id,   calculado_em DESC);

ALTER TABLE public.partner_maturity_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_own" ON public.partner_maturity_scores
  USING (tenant_id = my_tenant_id());
GRANT SELECT, INSERT ON public.partner_maturity_scores TO authenticated;
