-- Insere os 13 alertas de sistema para todos os tenants que ainda não os têm.
-- Usa INSERT ... ON CONFLICT DO NOTHING para ser idempotente.
-- Os campos condicoes/acoes ficam dentro de custom_fields (jsonb), não em colunas separadas.

DO $$
DECLARE
  _tid uuid;
BEGIN
  FOR _tid IN SELECT id FROM public.tenants LOOP

    INSERT INTO public.alert_rules
      (tenant_id, gatilho, gatilho_nome, origem, ativo, dias_aviso, modo, destinatarios, custom_fields, is_system, system_key)
    VALUES

    (_tid, 'Ações aprovação de custos', 'Ações aprovação de custos', 'actions', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"custos_aguardando","valor":"true","logico":"E","operador":"eq"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"lider_equipe","papel":"","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"lider_equipe","assunto":"Ações com parceiros","mensagem":"Uma ação está pendente de sua aprovação:\n{{descricao}}\n{{empresa_nome}}","papel":"","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'acoes_aprovacao_custos'),

    (_tid, 'Contatos canais desatualizados', 'Contatos canais desatualizados', 'contacts', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"updated_at","valor":"180","logico":"E","operador":"dias_apos"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"papel","papel":"admin_isv","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'contatos_desatualizados'),

    (_tid, 'Contratos com inconsistência', 'Contratos com inconsistência', 'contracts', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"inconsistencia_status","valor":"pendente","logico":"E","operador":"eq"},{"campo":"updated_at","valor":"","logico":"E","operador":"igual_hoje"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"papel","papel":"financeiro","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"papel","papel":"financeiro","assunto":"Contrato com inconsistência","mensagem":"Abaixo dados de contrato com inconsistência:\nEmpresa: {{empresa_nome}}\nContrato: {{numero}}\nObservações: {{observacoes}}","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'contratos_inconsistencia'),

    (_tid, 'Sucesso do cliente', 'Sucesso do cliente', 'customer_health', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"health_score","valor":"49","logico":"E","operador":"lte"},{"campo":"n_action_plans_pendentes","valor":"1","logico":"E","operador":"lt"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"papel","papel":"cs","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"lider_equipe","assunto":"Cliente com saúde crítica","mensagem":"O cliente abaixo está numa zona de saúde crítica:\nEmpresa: {{company_name}}\nHealth score: {{health_score}}\nPlanos de ação: {{n_action_plans}}","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'cs_sucesso_cliente'),

    (_tid, 'Meta em risco', 'Meta em risco', 'goals', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"periodo_mes","valor":"__mes_atual__","logico":"E","operador":"eq"},{"campo":"periodo_percentual","valor":"90%","logico":"E","operador":"lte"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"lider_equipe","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"lider_equipe","assunto":"Meta em risco","mensagem":"Meta abaixo de 90% e período mês avançado.","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'meta_em_risco'),

    (_tid, 'Oportunidade sem tarefa', 'Oportunidade sem tarefa', 'oportunidades', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"situacao","valor":"em_andamento","logico":"E","operador":"eq"},{"campo":"proxima_tarefa_data","valor":"","logico":"E","operador":"em_branco"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"responsavel_origem","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'oportunidade_sem_tarefa'),

    (_tid, 'Pagamentos com inconsistências', 'Pagamentos com inconsistências', 'payments', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"inconsistencia_status","valor":"pendente","logico":"E","operador":"eq"},{"campo":"updated_at","valor":"","logico":"E","operador":"igual_hoje"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"papel","papel":"financeiro","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"papel","papel":"financeiro","assunto":"Pagamento com inconsistência","mensagem":"Empresa: {{company_nome}}\nMês referência: {{reference_month}}\nCriação: {{created_at}}\nObservações {{notes}}","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'pagamentos_inconsistencias'),

    (_tid, 'Parceiros atualização de maturidade', 'Parceiros atualização de maturidade', 'sellers', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"updated_at","valor":"","logico":"E","operador":"igual_hoje"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"lider_equipe","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"lider_equipe","assunto":"Parceiros atualização de maturidade","mensagem":"Atualização de maturidade de Parceiro realizada.","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'parceiros_maturidade'),

    (_tid, 'Projetos fora do prazo', 'Projetos fora do prazo', 'projects', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"status","valor":"em_andamento","logico":"E","operador":"eq"},{"campo":"data_fim","valor":"","logico":"E","operador":"antes_hoje"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"papel","papel":"projetos","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"notificar","destinatario_tipo":"responsavel_origem","papel":"","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"papel","papel":"projetos","assunto":"Projeto com prazo estourado","mensagem":"Projeto fora do prazo de entrega.","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'projetos_fora_prazo'),

    (_tid, 'Projetos com margem ruim', 'Projetos com margem ruim', 'projects', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"status","valor":"em_andamento","logico":"E","operador":"eq"},{"campo":"data_fim","valor":"20","logico":"E","operador":"dias_antes"},{"campo":"fin_margem_pct","valor":"10%","logico":"E","operador":"lt"}],"acoes":[{"tipo":"email","destinatario_tipo":"lider_equipe","assunto":"Projeto com margem abaixo do esperado","mensagem":"Projeto chegando ao fim e abaixo da margem.","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"notificar","destinatario_tipo":"lider_equipe","papel":"","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[{"tipo":"papel","papel":"projetos","email_fixo":"","usuario_id":""}]}],"acoes_else":[],"com_else":false}',
      true, 'projetos_margem_ruim'),

    (_tid, 'Projetos novo projeto cadastrado', 'Projetos novo projeto cadastrado', 'projects', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"created_at","valor":"","logico":"E","operador":"igual_hoje"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"lider_equipe","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'projetos_novo_cadastrado'),

    (_tid, 'Provisões com inconsistências', 'Provisões com inconsistências', 'provisoes', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"inconsistencia_status","valor":"pendente","logico":"E","operador":"eq"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"papel","papel":"financeiro","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"papel","papel":"financeiro","assunto":"Provisões com inconsistências","mensagem":"Empresa: {{company_nome}}\nCriado: {{created_at}}\nMês referência: {{reference_month}}\nObservações: {{notes}}","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'provisoes_inconsistencias'),

    (_tid, 'Tarefas atrasadas', 'Tarefas atrasadas', 'tasks', true, 1, 'notificar', '[]',
      '{"condicoes":[{"campo":"data_inicio","valor":"","logico":"E","operador":"antes_hoje"}],"acoes":[{"tipo":"notificar","destinatario_tipo":"responsavel_origem","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]},{"tipo":"email","destinatario_tipo":"responsavel_origem","assunto":"Tarefas atrasadas","mensagem":"Constão no sistema tarefas atrasadas","email_fixo":"","prazo_dias":3,"usuario_id":"","titulo_tarefa":"","destinatarios_extra":[]}],"acoes_else":[],"com_else":false}',
      true, 'tarefas_atrasadas')

    ON CONFLICT (tenant_id, system_key) WHERE system_key IS NOT NULL DO NOTHING;

  END LOOP;
END $$;
