-- A aba Módulos (e a concessão de Habilitação via Participantes) de uma Ação
-- só liberava quando tipo === 'treinamento' (comparação exata, fixa no
-- código). Tenants que customizam Tipos de Ação substituem a lista padrão
-- inteira — se nenhum tipo customizado usar exatamente o slug "treinamento"
-- (ex: criaram "Capacitação" no lugar), a aba Módulos fica inacessível pra
-- sempre, em qualquer Ação. Este campo permite marcar qualquer Tipo de Ação
-- customizado como habilitador de Módulos, sem depender do slug literal.
ALTER TABLE public.tipos_acao
  ADD COLUMN IF NOT EXISTS habilita_modulos boolean NOT NULL DEFAULT false;

-- Tipos já existentes com slug "treinamento" continuam funcionando como
-- antes, sem precisar de ação manual do usuário.
UPDATE public.tipos_acao SET habilita_modulos = true WHERE slug = 'treinamento';
