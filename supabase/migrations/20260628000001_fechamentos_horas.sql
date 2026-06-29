-- fechamentos_horas: controle de aprovação de horas por período/analista
CREATE TABLE IF NOT EXISTS public.fechamentos_horas (
  id              text        NOT NULL,
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  periodo         text        NOT NULL, -- YYYY-MM
  user_name       text        NOT NULL,
  status          text        NOT NULL DEFAULT 'aberto', -- aberto|enviado|aprovado|rejeitado
  log_ids         jsonb       NOT NULL DEFAULT '[]',
  horas_total     numeric     NOT NULL DEFAULT 0,
  enviado_em      date,
  aprovado_em     date,
  rejeitado_em    date,
  obs             text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fechamentos_horas_pkey PRIMARY KEY (id),
  CONSTRAINT fechamentos_horas_unique UNIQUE (tenant_id, periodo, user_name)
);

CREATE INDEX IF NOT EXISTS idx_fechamentos_horas_tenant  ON public.fechamentos_horas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_horas_periodo ON public.fechamentos_horas (tenant_id, periodo);

ALTER TABLE public.fechamentos_horas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fechamentos_horas: view"   ON public.fechamentos_horas;
DROP POLICY IF EXISTS "fechamentos_horas: manage" ON public.fechamentos_horas;

CREATE POLICY "fechamentos_horas: view" ON public.fechamentos_horas
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "fechamentos_horas: manage" ON public.fechamentos_horas
  FOR ALL USING (tenant_id = public.my_tenant_id());
