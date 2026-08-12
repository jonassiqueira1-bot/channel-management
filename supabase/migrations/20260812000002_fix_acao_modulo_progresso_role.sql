-- Bug na migration anterior (20260812000001): a policy restritiva checava
-- role = 'parceiro', mas esse valor foi renomeado pra 'contato_canal' em
-- 20260713000007_papel_contato_canal.sql — o CHECK constraint de
-- profiles.role nem aceita mais 'parceiro'. Na prática a policy restritiva
-- nunca disparava (NOT EXISTS ... role='parceiro' sempre verdadeiro), então
-- Contato Canal tinha acesso de gerenciar o progresso de qualquer
-- participante, não só o próprio. Corrige pro valor real.
DROP POLICY IF EXISTS "parceiro_restrict_own" ON public.acao_modulo_progresso;
CREATE POLICY "parceiro_restrict_own" ON public.acao_modulo_progresso
  AS RESTRICTIVE
  USING (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'contato_canal')
    OR seller_id = public.my_contact_id()
  )
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'contato_canal')
    OR seller_id = public.my_contact_id()
  );

NOTIFY pgrst, 'reload schema';
