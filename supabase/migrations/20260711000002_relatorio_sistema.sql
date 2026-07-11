-- ── 1. Colunas para relatórios de sistema ────────────────────────────────────
ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS is_system       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS elementos_padrao jsonb;

-- ── 2. Marca o relatório de pipeline como sistema + guarda padrão ────────────
UPDATE public.relatorios
SET
  is_system        = true,
  -- Remove a tabela de detalhamento (s-div6, s-t7, s-td1) dos elementos ativos
  elementos        = (
    SELECT jsonb_agg(el ORDER BY (el->>'y')::int)
    FROM jsonb_array_elements(elementos) el
    WHERE (el->>'id') NOT IN ('s-div6', 's-t7', 's-td1')
  ),
  -- Salva o padrão TAMBÉM sem a tabela de detalhamento
  elementos_padrao = (
    SELECT jsonb_agg(el ORDER BY (el->>'y')::int)
    FROM jsonb_array_elements(elementos) el
    WHERE (el->>'id') NOT IN ('s-div6', 's-t7', 's-td1')
  )
WHERE titulo = 'Acompanhamento de Pipeline'
  AND deleted_at IS NULL;

-- ── 3. RLS: impede exclusão de relatórios de sistema ─────────────────────────
-- A policy de DELETE já existe; substituímos por uma que bloqueia is_system=true
DROP POLICY IF EXISTS "relatorios: delete" ON public.relatorios;

CREATE POLICY "relatorios: delete" ON public.relatorios
  FOR DELETE USING (
    tenant_id = public.my_tenant_id()
    AND is_system = false
  );
