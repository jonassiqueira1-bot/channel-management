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

-- Policy para parceiros no pipeline (tabela opportunities / view oportunidades)
-- Parceiro só vê onde ele é o vendedor responsável
DO $$
BEGIN
  -- Para DEV (tabela oportunidades direta)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='oportunidades') THEN
    DROP POLICY IF EXISTS "parceiro_own_opps" ON public.oportunidades;
    CREATE POLICY "parceiro_own_opps" ON public.oportunidades
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parceiro' AND contact_id IS NOT NULL)
        AND responsavel = (SELECT nome FROM public.sellers WHERE id = my_contact_id() LIMIT 1)
      );
  END IF;

  -- Para PROD (tabela opportunities)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='opportunities') THEN
    DROP POLICY IF EXISTS "parceiro_own_opps" ON public.opportunities;
    CREATE POLICY "parceiro_own_opps" ON public.opportunities
      FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parceiro' AND contact_id IS NOT NULL)
        AND responsavel = (SELECT nome FROM public.sellers WHERE id = my_contact_id() LIMIT 1)
      );
  END IF;
END $$;
