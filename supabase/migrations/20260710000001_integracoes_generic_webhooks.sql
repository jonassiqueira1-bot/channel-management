-- Remove UNIQUE constraint que limitava 1 integração por provider por tenant
-- Agora múltiplos webhooks genéricos podem coexistir no mesmo tenant
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'integracoes_tenant_id_provider_key'
      AND conrelid = 'public.integracoes'::regclass
  ) THEN
    ALTER TABLE public.integracoes DROP CONSTRAINT integracoes_tenant_id_provider_key;
  END IF;
END $$;

-- Adiciona integration_id em rd_leads_queue para isolar logs por webhook
ALTER TABLE public.rd_leads_queue
  ADD COLUMN IF NOT EXISTS integration_id uuid REFERENCES public.integracoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rd_leads_queue_integration ON public.rd_leads_queue(integration_id);
