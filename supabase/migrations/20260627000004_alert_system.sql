-- Sistema de alertas: regras configuráveis + inbox de alertas gerados

CREATE TABLE IF NOT EXISTS public.alert_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gatilho     text NOT NULL, -- pagamento_vencido | contrato_vencendo | oportunidade_parada | score_cs_critico
  ativo       boolean NOT NULL DEFAULT true,
  dias_aviso  integer NOT NULL DEFAULT 1,           -- quantos dias antes/depois do evento
  modo        text NOT NULL DEFAULT 'notificar',    -- notificar | criar_tarefa
  prazo_tarefa_dias integer,                        -- prazo da tarefa gerada (modo criar_tarefa)
  destinatarios jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{tipo: 'responsavel'|'email', valor: '...'}]
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id     uuid REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  usuario_id  uuid,                                 -- destinatário (null = todos do tenant)
  gatilho     text NOT NULL,
  titulo      text NOT NULL,
  mensagem    text,
  entidade_tipo text,                               -- oportunidade | contrato | pagamento | projeto
  entidade_id   text,
  entidade_nome text,
  link        text,
  prioridade  text NOT NULL DEFAULT 'media',        -- alta | media | baixa
  resolvido   boolean NOT NULL DEFAULT false,
  resolvido_em timestamptz,
  tarefa_id   uuid,                                 -- se gerou tarefa, referência
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant ON public.alert_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_usuario ON public.alerts (tenant_id, usuario_id, resolvido);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts (created_at DESC);

-- RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_rules_tenant" ON public.alert_rules
  FOR ALL USING (tenant_id = public.my_tenant_id()) WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "alerts_tenant" ON public.alerts
  FOR ALL USING (tenant_id = public.my_tenant_id()) WITH CHECK (tenant_id = public.my_tenant_id());

-- Gatilhos padrão (inseridos na criação do tenant — pode rodar manualmente por enquanto)
-- INSERT INTO public.alert_rules (tenant_id, gatilho, dias_aviso, modo) VALUES ...
