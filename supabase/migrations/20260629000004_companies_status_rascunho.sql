alter table public.companies
  drop constraint if exists companies_status_check;

-- Padroniza status em PT-BR e adiciona 'rascunho' para empresas criadas via webhook
alter table public.companies
  add constraint companies_status_check
  check (status in ('rascunho', 'ativo', 'inativo', 'suspenso', 'negociacao'));
