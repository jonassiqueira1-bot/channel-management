create table if not exists public.tenant_branches (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  name          text not null,
  custom_fields jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

alter table public.tenant_branches enable row level security;

create policy "tenant members can manage branches"
  on public.tenant_branches for all
  using (tenant_id = my_tenant_id())
  with check (tenant_id = my_tenant_id());

grant select, insert, update, delete on public.tenant_branches to authenticated;
