-- Remove a função de diagnóstico de emergência usada pra investigar o erro
-- do Dashboard em produção (não era o fix de RLS — era um bug pré-existente
-- e não relacionado em useTasks.js selecionando uma coluna que não existe,
-- corrigido no frontend).
DROP FUNCTION IF EXISTS public.debug_emergency_check();
