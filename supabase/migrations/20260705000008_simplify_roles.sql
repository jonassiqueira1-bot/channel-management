-- Simplifica papéis para 5: admin_isv, vendedor, financeiro, cs, projetos
-- Mantém admin_isv como está; migra os demais para o papel mais próximo.

-- 1. Remover constraint antiga
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_papel_check;

-- 2. Migrar valores legados → novos papéis
UPDATE public.profiles SET role = 'admin_isv'  WHERE role IN ('admin_franquia', 'gestor_canais');
UPDATE public.profiles SET role = 'vendedor'   WHERE role IN ('gestor', 'vendedor_interno', 'vendedor', 'gestor_comercial');
UPDATE public.profiles SET role = 'financeiro' WHERE role IN ('financeiro', 'gestor_administrativo', 'assistente_administrativo');
UPDATE public.profiles SET role = 'cs'         WHERE role IN ('cs', 'customer_success', 'gestor_cs');
UPDATE public.profiles SET role = 'projetos'   WHERE role IN ('projetos', 'gestor_projetos', 'coordenador_projetos', 'analista_implantacao');

-- Qualquer role desconhecido vira vendedor
UPDATE public.profiles
SET role = 'vendedor'
WHERE role NOT IN ('admin_isv', 'vendedor', 'financeiro', 'cs', 'projetos');

-- 3. Nova constraint
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin_isv', 'vendedor', 'financeiro', 'cs', 'projetos'));
