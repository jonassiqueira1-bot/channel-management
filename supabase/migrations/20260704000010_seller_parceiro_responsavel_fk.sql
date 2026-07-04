-- ─── 1. sellers: coluna parceiro_id (FK própria, migra de custom_fields) ──────
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sellers_parceiro ON public.sellers (parceiro_id);

-- Migra valores existentes de custom_fields->franquia_id para a nova coluna
UPDATE public.sellers
  SET parceiro_id = (custom_fields->>'franquia_id')::uuid
  WHERE custom_fields->>'franquia_id' IS NOT NULL
    AND parceiro_id IS NULL;

-- ─── 2. parceiros: coluna responsavel_id (FK para profiles) ───────────────────
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parceiros_responsavel ON public.parceiros (responsavel_id);

-- ─── 3. Função helper: retorna os parceiro_ids que o usuário é responsável ────
CREATE OR REPLACE FUNCTION public.my_parceiro_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT id FROM public.parceiros
    WHERE tenant_id = public.my_tenant_id()
      AND responsavel_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.my_parceiro_ids() TO authenticated;
