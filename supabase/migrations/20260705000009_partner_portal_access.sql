-- Acesso de parceiros via portal: vincula profile ao seller (contato canal)

-- 1. Adiciona contact_id em profiles (FK para sellers/contatos_canais)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_contact_id_idx ON public.profiles(contact_id);

-- 2. Adiciona papel 'parceiro' à constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin_isv', 'vendedor', 'financeiro', 'cs', 'projetos', 'parceiro'));

-- 3. Coluna portal_invited_at em sellers para saber quem já foi convidado
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS portal_invited_at timestamptz;

-- 4. RLS: parceiro só vê oportunidades onde é o responsável (sellers.id = oportunidades.vendedor_id)
-- Função auxiliar para pegar o contact_id do usuário logado
CREATE OR REPLACE FUNCTION public.my_contact_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 5. Trigger: ao aceitar convite, preenche profiles.contact_id e role='parceiro'
--    a partir de raw_user_meta_data injetado no inviteUserByEmail
CREATE OR REPLACE FUNCTION public.handle_partner_invite()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact_id uuid;
BEGIN
  _contact_id := (NEW.raw_user_meta_data->>'contact_id')::uuid;
  IF _contact_id IS NOT NULL THEN
    UPDATE public.profiles
    SET contact_id = _contact_id,
        role       = 'parceiro',
        branch_id  = NULL
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_partner_invite_confirm ON auth.users;
CREATE TRIGGER on_partner_invite_confirm
  AFTER UPDATE OF confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_partner_invite();

-- Policy RESTRICTIVA para parceiros: usa AS RESTRICTIVE para sobrepor policies permissivas existentes
-- Sem RESTRICTIVE, o parceiro herdaria acesso de policies mais amplas (tenant_id) via OR
DO $$
DECLARE
  _check text :=
    'NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''parceiro'')' ||
    ' OR (' ||
    '  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''parceiro'' AND contact_id IS NOT NULL)' ||
    '  AND responsavel = (SELECT nome FROM public.sellers WHERE id = my_contact_id() LIMIT 1)' ||
    ')';
BEGIN
  -- Para DEV (tabela oportunidades direta)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='oportunidades') THEN
    DROP POLICY IF EXISTS "parceiro_own_opps"            ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_select_opps"         ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_update_opps"         ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_insert_opps"         ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_restrict_select_opps" ON public.oportunidades;
    DROP POLICY IF EXISTS "parceiro_restrict_update_opps" ON public.oportunidades;
    EXECUTE format('CREATE POLICY "parceiro_restrict_select_opps" ON public.oportunidades AS RESTRICTIVE FOR SELECT USING (%s)', _check);
    EXECUTE format('CREATE POLICY "parceiro_restrict_update_opps" ON public.oportunidades AS RESTRICTIVE FOR UPDATE USING (%s)', _check);
    CREATE POLICY "parceiro_insert_opps" ON public.oportunidades FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parceiro' AND contact_id IS NOT NULL));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='opportunities') THEN
    DROP POLICY IF EXISTS "parceiro_own_opps"            ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_select_opps"         ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_update_opps"         ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_insert_opps"         ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_restrict_select_opps" ON public.opportunities;
    DROP POLICY IF EXISTS "parceiro_restrict_update_opps" ON public.opportunities;
    EXECUTE format('CREATE POLICY "parceiro_restrict_select_opps" ON public.opportunities AS RESTRICTIVE FOR SELECT USING (%s)', _check);
    EXECUTE format('CREATE POLICY "parceiro_restrict_update_opps" ON public.opportunities AS RESTRICTIVE FOR UPDATE USING (%s)', _check);
    CREATE POLICY "parceiro_insert_opps" ON public.opportunities FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parceiro' AND contact_id IS NOT NULL));
  END IF;
END $$;
