-- O perfil nativo "Vendedor" tinha contatos_canais.visualizar=false, mas o
-- Papel "Vendedor" lista /vendedores (Contatos Canais) como rota acessível
-- (PAPEIS_ROTAS em src/data/mockPerfis.js) — contradição no seed que fazia
-- o ProtectedRoute bloquear a tela e redirecionar pra primeira rota
-- permitida (Dashboard), mesmo o menu mostrando o item.
UPDATE public.perfis_acesso
SET permissions = jsonb_set(permissions, '{contatos_canais,visualizar}', 'true'::jsonb)
WHERE slug = 'vendedor';

NOTIFY pgrst, 'reload schema';
