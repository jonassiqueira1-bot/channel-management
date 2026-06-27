-- Adiciona parceiro_id em commission_personas e commission_rules
-- Permite vincular comissões a parceiros (não só a usuários internos)

ALTER TABLE public.commission_personas
  ADD COLUMN IF NOT EXISTS parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL;

ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS parceiro_id   uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parceiro_nome text;

CREATE INDEX IF NOT EXISTS idx_commission_personas_parceiro ON public.commission_personas (parceiro_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_parceiro    ON public.commission_rules    (parceiro_id);
