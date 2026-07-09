-- Adiciona coluna inconsistencia_status em payments e provisoes
-- Valores: sem_inconsistencia | pendente | em_analise | fechada

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS inconsistencia_status text NOT NULL DEFAULT 'sem_inconsistencia';

ALTER TABLE public.provisoes
  ADD COLUMN IF NOT EXISTS inconsistencia_status text NOT NULL DEFAULT 'sem_inconsistencia';

-- Backfill payments: registros com inconsistencia=true → 'pendente'
UPDATE public.payments
  SET inconsistencia_status = 'pendente'
  WHERE inconsistencia = true AND inconsistencia_status = 'sem_inconsistencia';
