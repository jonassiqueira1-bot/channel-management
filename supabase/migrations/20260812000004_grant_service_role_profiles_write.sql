-- service_role só tinha SELECT em profiles (20260629000012, escopo estreito
-- pro process-alerts) — nunca teve INSERT/UPDATE. Isso quebra qualquer Edge
-- Function que escreva em profiles direto (não via RPC SECURITY DEFINER):
-- confirmado agora no backfill de perfis_acesso_ids, e o mesmo path afeta o
-- "usuário já existe" de invite-user (admin.from('profiles').update(...)).
GRANT INSERT, UPDATE ON public.profiles TO service_role;

NOTIFY pgrst, 'reload schema';
