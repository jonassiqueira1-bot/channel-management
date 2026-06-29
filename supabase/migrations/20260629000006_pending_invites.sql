create table if not exists public.pending_invites (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  nome         text,
  email        text not null,
  papel        text,
  tipo_usuario text,
  criado_em    timestamptz default now(),
  expires_at   timestamptz default (now() + interval '7 days')
);

alter table public.pending_invites enable row level security;

create policy "tenant members can manage invites"
  on public.pending_invites
  for all
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));
