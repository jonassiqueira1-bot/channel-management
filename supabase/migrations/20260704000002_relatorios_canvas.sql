-- Editor de documentos canvas (relatórios + propostas)
-- RLS: tenant isolation + controle de acesso por papel

CREATE TABLE IF NOT EXISTS relatorios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id        uuid REFERENCES tenant_branches(id) ON DELETE SET NULL,
  owner_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  titulo           text NOT NULL DEFAULT 'Sem título',
  tipo             text NOT NULL DEFAULT 'relatorio',    -- 'relatorio' | 'proposta'
  projeto_id       uuid REFERENCES projects(id) ON DELETE SET NULL, -- proposta vinculada ao projeto

  config           jsonb NOT NULL DEFAULT '{}',          -- page config (margins, header, footer, watermark)
  elementos        jsonb NOT NULL DEFAULT '[]',          -- canvas elements array

  -- controle de acesso
  acesso           text NOT NULL DEFAULT 'privado',      -- 'privado' | 'equipe' | 'todos'
  papeis_permitidos text[] DEFAULT '{}',                 -- papel slugs que podem visualizar (e.g. ['admin_isv','vendedor'])

  status           text NOT NULL DEFAULT 'rascunho',     -- 'rascunho' | 'publicado'
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

-- SELECT: owner sempre vê; 'todos' = qualquer membro do tenant; 'equipe' = papeis_permitidos
CREATE POLICY "relatorios_select" ON relatorios
  FOR SELECT USING (
    tenant_id = my_tenant_id()
    AND deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR acesso = 'todos'
      OR (
        acesso = 'equipe'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
            AND role = ANY(papeis_permitidos)
        )
      )
    )
  );

-- INSERT: qualquer usuário autenticado do tenant
CREATE POLICY "relatorios_insert" ON relatorios
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id());

-- UPDATE/DELETE: apenas o owner
CREATE POLICY "relatorios_update" ON relatorios
  FOR UPDATE USING (owner_id = auth.uid() AND tenant_id = my_tenant_id())
  WITH CHECK (owner_id = auth.uid() AND tenant_id = my_tenant_id());

CREATE POLICY "relatorios_delete" ON relatorios
  FOR DELETE USING (owner_id = auth.uid() AND tenant_id = my_tenant_id());

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_relatorios_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_relatorios_updated_at
  BEFORE UPDATE ON relatorios
  FOR EACH ROW EXECUTE FUNCTION touch_relatorios_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios TO authenticated;

NOTIFY pgrst, 'reload schema';
