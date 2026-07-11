-- Histórico de movimentação de oportunidades entre etapas do funil
-- Habilita cohort completo: tempo em cada etapa, taxa de avanço, gargalos
--
-- Estratégia:
--   • Trigger em oportunidades: cada mudança de stage_id gera um registro
--   • Seed inicial: insere o estado atual de todas as opps (entrou_em = created_at)
--   • saiu_em NULL = etapa atual; preenchido quando a opp avança ou é encerrada

CREATE TABLE IF NOT EXISTS public.oportunidade_etapa_historico (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id        uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  oportunidade_id  uuid        NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  stage_id         uuid        REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  etapa_nome       text,
  situacao         text,
  entrou_em        timestamptz NOT NULL DEFAULT now(),
  saiu_em          timestamptz,
  dias_na_etapa    int GENERATED ALWAYS AS (
    EXTRACT(DAY FROM COALESCE(saiu_em, now()) - entrou_em)::int
  ) STORED,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oep_tenant         ON public.oportunidade_etapa_historico (tenant_id);
CREATE INDEX IF NOT EXISTS idx_oep_oportunidade   ON public.oportunidade_etapa_historico (oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_oep_stage          ON public.oportunidade_etapa_historico (stage_id);
CREATE INDEX IF NOT EXISTS idx_oep_entrou_em      ON public.oportunidade_etapa_historico (entrou_em);

ALTER TABLE public.oportunidade_etapa_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oep: select" ON public.oportunidade_etapa_historico
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "oep: insert" ON public.oportunidade_etapa_historico
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());
CREATE POLICY "oep: update" ON public.oportunidade_etapa_historico
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

-- ── Trigger: registra mudança de etapa ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_registra_mudanca_etapa()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_etapa_nome text;
BEGIN
  -- Só age quando stage_id ou situacao mudam
  IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id
     AND NEW.situacao IS NOT DISTINCT FROM OLD.situacao THEN
    RETURN NEW;
  END IF;

  -- Fecha o registro anterior (etapa que estava aberta)
  UPDATE public.oportunidade_etapa_historico
  SET saiu_em = now()
  WHERE oportunidade_id = NEW.id
    AND saiu_em IS NULL;

  -- Busca nome da nova etapa
  IF NEW.stage_id IS NOT NULL THEN
    SELECT name INTO v_etapa_nome FROM public.pipeline_stages WHERE id = NEW.stage_id;
  END IF;

  -- Abre novo registro
  INSERT INTO public.oportunidade_etapa_historico
    (tenant_id, branch_id, oportunidade_id, stage_id, etapa_nome, situacao, entrou_em)
  VALUES
    (NEW.tenant_id, NEW.branch_id, NEW.id, NEW.stage_id,
     COALESCE(v_etapa_nome, 'Sem etapa'), NEW.situacao, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_oportunidade_etapa ON public.oportunidades;
CREATE TRIGGER tg_oportunidade_etapa
  AFTER UPDATE OF stage_id, situacao ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.fn_registra_mudanca_etapa();

-- ── Seed inicial: estado atual de todas as oportunidades ─────────────────────
-- entrou_em = created_at da oportunidade (melhor aproximação que temos)
INSERT INTO public.oportunidade_etapa_historico
  (tenant_id, branch_id, oportunidade_id, stage_id, etapa_nome, situacao, entrou_em)
SELECT
  o.tenant_id,
  o.branch_id,
  o.id,
  o.stage_id,
  ps.name,
  o.situacao,
  o.created_at
FROM public.oportunidades o
LEFT JOIN public.pipeline_stages ps ON ps.id = o.stage_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.oportunidade_etapa_historico h
  WHERE h.oportunidade_id = o.id
);
