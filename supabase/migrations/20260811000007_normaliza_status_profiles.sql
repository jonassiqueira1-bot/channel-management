-- Achado ao investigar divergência entre a tela de Usuários (mostrava 2
-- ativos) e a contagem de billing (contava 1): existia pelo menos um profile
-- com status='active' (inglês, valor legado de antes do padrão em
-- português) — a UI da lista tratava como ativo visualmente, mas
-- count_active_users (correto, filtra 'ativo') não contava. Normaliza
-- qualquer resquício em inglês pro padrão atual.
UPDATE public.profiles SET status = 'ativo'   WHERE status = 'active';
UPDATE public.profiles SET status = 'inativo' WHERE status = 'inactive';
