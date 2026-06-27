-- ============================================================
-- PRÉ-MIGRAÇÃO: remove tabelas criadas com text PKs pelo
-- supabase_migration.sql anterior. Seguro apenas se não houver
-- dados de produção nestas tabelas.
-- Execute ANTES de 20260626000001_missing_modules_final.sql
-- ============================================================

-- Desativa triggers temporariamente para evitar erros de FK ao dropar
SET session_replication_role = replica;

DROP TABLE IF EXISTS public.audit_logs           CASCADE;
DROP TABLE IF EXISTS public.customer_health      CASCADE;
DROP TABLE IF EXISTS public.fechamentos_horas    CASCADE;
DROP TABLE IF EXISTS public.commission_approvals CASCADE;
DROP TABLE IF EXISTS public.habilitacoes         CASCADE;
DROP TABLE IF EXISTS public.tipos_acao           CASCADE;
DROP TABLE IF EXISTS public.campanhas            CASCADE;
DROP TABLE IF EXISTS public.parceiros            CASCADE;
DROP TABLE IF EXISTS public.perfis_acesso        CASCADE;

-- Reativa comportamento normal
SET session_replication_role = DEFAULT;

-- Confirma que foram removidas
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_logs','customer_health','fechamentos_horas',
    'commission_approvals','habilitacoes','tipos_acao',
    'campanhas','parceiros','perfis_acesso'
  );
-- Se retornar 0 linhas, está limpo. Prossiga com o próximo script.
