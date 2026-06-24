-- ============================================================
-- MIGRAÇÃO: módulos que estavam apenas em localStorage
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. LOGS DE AUDITORIA
create table if not exists audit_logs (
  id            text        primary key,
  tenant_id     text,
  timestamp     timestamptz not null default now(),
  usuario_id    text,
  usuario_nome  text,
  acao          text        not null,   -- criar | editar | excluir | aprovar | rejeitar | pagar | enviar | reabrir
  entidade      text        not null,
  entidade_id   text,
  descricao     text,
  antes         jsonb,
  depois        jsonb,
  created_at    timestamptz default now()
);
create index if not exists audit_logs_tenant_idx   on audit_logs (tenant_id);
create index if not exists audit_logs_entidade_idx on audit_logs (entidade);
create index if not exists audit_logs_ts_idx       on audit_logs (timestamp desc);

-- 2. CUSTOMER SUCCESS
create table if not exists customer_health (
  id            text        primary key,
  tenant_id     text,
  company_id    text,
  company_name  text,
  company_city  text,
  company_uf    text,
  csm           text,
  laer_stage    text,
  touch_model   text,
  health_score  int         default 0,
  renewal_date  date,
  notes         text,
  action_plans  jsonb       default '[]',
  checkins      jsonb       default '[]',
  attachments   jsonb       default '[]',
  contract_id   text,
  contract_numero text,
  criado_em     date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists customer_health_tenant_idx on customer_health (tenant_id);

-- 3. FECHAMENTO DE HORAS
create table if not exists fechamentos_horas (
  id            text        primary key,
  tenant_id     text,
  periodo       text        not null,   -- 'YYYY-MM'
  user_name     text        not null,
  status        text        not null default 'aberto',  -- aberto|enviado|aprovado|rejeitado
  log_ids       jsonb       default '[]',
  horas_total   numeric     default 0,
  enviado_em    date,
  aprovado_em   date,
  rejeitado_em  date,
  obs           text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (tenant_id, periodo, user_name)
);
create index if not exists fechamentos_horas_tenant_idx on fechamentos_horas (tenant_id, periodo);

-- 4. APROVAÇÕES DE COMISSÕES
create table if not exists commission_approvals (
  id                text      primary key,
  tenant_id         text,
  periodo           text      not null,
  beneficiario_nome text      not null,
  status            text      not null default 'aberto',  -- aberto|enviado|aprovado|rejeitado
  total_valor       numeric   default 0,
  payment_ids       jsonb     default '[]',
  enviado_em        date,
  aprovado_em       date,
  rejeitado_em      date,
  obs               text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (tenant_id, periodo, beneficiario_nome)
);
create index if not exists commission_approvals_tenant_idx on commission_approvals (tenant_id, periodo);

-- 5. HABILITAÇÕES
create table if not exists habilitacoes (
  id          text        primary key,
  tenant_id   text,
  nome        text        not null,
  situacao    text        not null default 'ativo',
  produto_id  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists habilitacoes_tenant_idx on habilitacoes (tenant_id);

-- 6. TIPOS DE AÇÃO
create table if not exists tipos_acao (
  id          text        primary key,
  tenant_id   text,
  label       text        not null,
  slug        text,
  icon        text,
  color       text,
  bg          text,
  text_color  text,
  criado_em   date,
  created_at  timestamptz default now()
);
create index if not exists tipos_acao_tenant_idx on tipos_acao (tenant_id);

-- 7. CAMPANHAS
create table if not exists campanhas (
  id            text        primary key,
  tenant_id     text,
  nome          text        not null,
  tipo          text,
  status        text        default 'rascunho',
  inicio        date,
  fim           date,
  objetivo      text,
  meta          numeric     default 0,
  descricao     text,
  produtos      jsonb       default '[]',
  participantes jsonb       default '[]',
  pontua_metas  boolean     default false,
  extra         jsonb       default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists campanhas_tenant_idx on campanhas (tenant_id);

-- 8. PARCEIROS / FRANQUIAS
create table if not exists parceiros (
  id              text        primary key,
  tenant_id       text,
  nome            text        not null,
  classificacao   text        default 'franquia',   -- franquia | unidade
  tipo_parceiro   text,
  franquia_id     text,
  cnpj            text,
  email           text,
  telefone        text,
  responsavel     text,
  cidade          text,
  uf              text,
  status          text        default 'ativo',
  extra           jsonb       default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists parceiros_tenant_idx on parceiros (tenant_id);

-- 9. PERFIS DE ACESSO
create table if not exists perfis_acesso (
  id            text        primary key,
  tenant_id     text,
  slug          text,
  nome          text        not null,
  nativo        boolean     default false,
  cor           text,
  icon          text,
  desc          text,
  franquia_ids  jsonb       default '[]',
  permissions   jsonb       default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists perfis_acesso_tenant_idx on perfis_acesso (tenant_id);

-- 10. USUÁRIOS DE CONFIGURAÇÕES (settings:perfis_v2)
-- Estes complementam a tabela profiles já existente
-- Campos extras que não estão na tabela profiles padrão
alter table profiles add column if not exists perfis_acesso_ids  jsonb    default '[]';
alter table profiles add column if not exists branch_ids         jsonb    default '[]';
alter table profiles add column if not exists regras_comissao_ids jsonb   default '[]';
alter table profiles add column if not exists cargo              text;
alter table profiles add column if not exists senioridade        text;
alter table profiles add column if not exists tipo_recurso       text;
alter table profiles add column if not exists billing_rate       numeric;
alter table profiles add column if not exists custo_hora         numeric;
alter table profiles add column if not exists horas_semana       int      default 40;
alter table profiles add column if not exists habilidades        jsonb    default '[]';
alter table profiles add column if not exists linkedin_url       text;
alter table profiles add column if not exists whatsapp           text;
alter table profiles add column if not exists franquia_id        text;

-- ============================================================
-- RLS POLICIES (ajuste conforme sua política de acesso)
-- Exemplo: cada tenant vê apenas seus próprios dados
-- ============================================================
alter table audit_logs          enable row level security;
alter table customer_health     enable row level security;
alter table fechamentos_horas   enable row level security;
alter table commission_approvals enable row level security;
alter table habilitacoes        enable row level security;
alter table tipos_acao          enable row level security;
alter table campanhas           enable row level security;
alter table parceiros           enable row level security;
alter table perfis_acesso       enable row level security;

-- Policies permissivas para authenticated (refine conforme necessário)
do $$ declare tbl text; begin
  foreach tbl in array array['audit_logs','customer_health','fechamentos_horas',
    'commission_approvals','habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso']
  loop
    execute format('
      create policy if not exists "%s_select" on %s for select to authenticated using (true);
      create policy if not exists "%s_insert" on %s for insert to authenticated with check (true);
      create policy if not exists "%s_update" on %s for update to authenticated using (true);
      create policy if not exists "%s_delete" on %s for delete to authenticated using (true);
    ', tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl);
  end loop;
end $$;
