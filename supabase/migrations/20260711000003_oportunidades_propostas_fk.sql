-- Vincula oportunidades a propostas canvas (tipo='proposta') do módulo Relatórios
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS proposta_produto_id uuid REFERENCES public.relatorios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposta_servico_id uuid REFERENCES public.relatorios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opps_proposta_produto ON public.oportunidades (proposta_produto_id);
CREATE INDEX IF NOT EXISTS idx_opps_proposta_servico ON public.oportunidades (proposta_servico_id);
