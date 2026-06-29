alter table public.customer_health
  add column if not exists playbook_id uuid references public.playbooks(id) on delete set null;
