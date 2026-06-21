-- Metas Comerciais (Goals)
CREATE TABLE IF NOT EXISTS public.goals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id           uuid REFERENCES public.tenant_branches(id) ON DELETE SET NULL,

  -- Alvo
  tipo_alvo           text NOT NULL CHECK (tipo_alvo IN ('vendedor','unidade','categoria','produto','equipe')),
  alvo_id             text,
  alvo_nome           text,
  alvo_contexto       text,

  -- Tipo de meta
  tipo_meta           text NOT NULL DEFAULT 'valor' CHECK (tipo_meta IN ('valor','atividade','operacional')),
  subtipo_operacional text CHECK (subtipo_operacional IN ('quantidade','moeda')),
  valor_sufixo        text,

  -- Período
  periodo_mes         smallint NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_ano         smallint NOT NULL,

  -- Valores
  valor_planejado     numeric(15,2),
  valor_atual         numeric(15,2) NOT NULL DEFAULT 0,

  -- Status
  status              text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','cancelada')),

  -- IDs de referência (campos extras)
  custom_fields       jsonb NOT NULL DEFAULT '{}',

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.goals(tenant_id);
CREATE INDEX ON public.goals(branch_id);
CREATE INDEX ON public.goals(periodo_ano, periodo_mes);
CREATE UNIQUE INDEX ON public.goals(tenant_id, branch_id, tipo_alvo, alvo_id, periodo_ano, periodo_mes, tipo_meta);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: view"   ON public.goals FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "goals: manage" ON public.goals FOR ALL    USING (tenant_id = public.my_tenant_id());
