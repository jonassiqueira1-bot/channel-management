import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { useBranchContext } from '../../contexts/BranchContext'
import { useCustomFields } from '../../hooks/useCustomFields'
import { FullPageEdit, FPESection } from '../../components/ui'
import { PAPEIS_OPTIONS } from '../../data/mockPerfis'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { Plus, Trash2, GitBranch, RotateCcw, Lock } from 'lucide-react'

// ─── Origens → tabelas reais ──────────────────────────────────────────────────
const ORIGENS = [
  { key: 'oportunidades',       label: 'Oportunidades', table: 'oportunidades' },
  { key: 'contracts',           label: 'Contratos',     table: 'contracts'     },
  { key: 'projects',            label: 'Projetos',      table: 'projects'      },
  { key: 'tasks',               label: 'Tarefas',       table: 'tasks'         },
  { key: 'actions',             label: 'Ações',         table: 'actions'       },
  { key: 'commission_payments', label: 'Comissões',          table: 'commission_payments' },
  { key: 'payments',           label: 'Pagamentos (contratos)', table: 'payments'       },
  { key: 'companies',           label: 'Empresas',      table: 'companies'     },
  { key: 'goals',               label: 'Metas & KPIs',  table: 'goals'         },
  { key: 'sellers',             label: 'Parceiros',     table: 'sellers'       },
  { key: 'contacts',           label: 'Contatos Canais', table: 'contacts'    },
  { key: 'customer_health',   label: 'Sucesso do Cliente (CS)', table: 'customer_health' },
  { key: 'provisoes',         label: 'Provisões',               table: 'provisoes'        },
]

// ─── Campos por origem ────────────────────────────────────────────────────────
const CAMPOS_PADRAO = {
  oportunidades: [
    { key: 'updated_at',    label: 'Última atualização',      tipo: 'date'  },
    { key: 'prazo',         label: 'Prazo de fechamento',     tipo: 'date'  },
    { key: 'created_at',    label: 'Data de cadastro',        tipo: 'date'  },
    { key: 'valor',         label: 'Valor total (R$)',        tipo: 'money' },
    { key: 'valor_cdu',     label: 'Valor CDU (R$)',          tipo: 'money' },
    { key: 'valor_sms',     label: 'Valor SMS (R$)',          tipo: 'money' },
    { key: 'valor_servico', label: 'Valor Serviços (R$)',     tipo: 'money' },
    { key: 'valor_desconto',label: 'Desconto (R$)',           tipo: 'money' },
    { key: 'situacao',      label: 'Situação', tipo: 'enum', opts: ['em_andamento','ganha','perdida','em_negociacao'] },
    { key: 'origem',        label: 'Origem',   tipo: 'enum', opts: ['Inbound','Outbound','Canal','Indicação'] },
    { key: 'responsavel',   label: 'Responsável',             tipo: 'text'  },
    { key: 'empresa',       label: 'Empresa',                 tipo: 'text'  },
    { key: 'contato',       label: 'Contato',                 tipo: 'text'  },
    { key: 'funil',         label: 'Funil',                   tipo: 'text'  },
    { key: 'etapa',         label: 'Etapa',                   tipo: 'text'  },
    { key: 'proxima_tarefa_data',    label: 'Data próxima tarefa',      tipo: 'date' },
    { key: 'proxima_tarefa_hora',    label: 'Hora próxima tarefa',      tipo: 'text' },
    { key: 'primeira_conclusao_data',label: 'Data 1ª conclusão tarefa', tipo: 'date' },
    { key: 'primeira_conclusao_hora',label: 'Hora 1ª conclusão tarefa', tipo: 'text' },
    { key: 'proposta_produto',       label: 'Proposta produto',         tipo: 'text'   },
    { key: 'proposta_servico',       label: 'Proposta serviço',         tipo: 'text'   },
    { key: 'n_tarefas',             label: 'Qtd. de tarefas',          tipo: 'number' },
  ],
  contracts: [
    { key: 'data_inicio',    label: 'Início da vigência',        tipo: 'date'   },
    { key: 'data_fim',       label: 'Fim da vigência',           tipo: 'date'   },
    { key: 'created_at',     label: 'Data de cadastro',          tipo: 'date'   },
    { key: 'updated_at',     label: 'Última atualização',        tipo: 'date'   },
    { key: 'data_pag_cdu',   label: 'Data pagamento CDU',        tipo: 'date'   },
    { key: 'data_pag_sms',   label: 'Data pagamento SMS',        tipo: 'date'   },
    { key: 'status',         label: 'Status', tipo: 'enum', opts: ['ativo','encerrado','cancelado','pendente'] },
    { key: 'inconsistencia_status', label: 'Status inconsistência', tipo: 'enum', opts: ['sem_inconsistencia','pendente','resolvida'] },
    { key: 'primeira_compra',label: 'Primeira compra',           tipo: 'enum',  opts: ['true','false'] },
    { key: 'numero',         label: 'Número do contrato',        tipo: 'text'   },
    { key: 'empresa_nome',   label: 'Empresa',                   tipo: 'text'   },
    { key: 'responsavel',    label: 'Responsável',               tipo: 'text'   },
    { key: 'origem',         label: 'Origem',                    tipo: 'text'   },
    { key: 'observacoes',    label: 'Observações',               tipo: 'text'   },
    { key: 'opportunity_titulo', label: 'Oportunidade vinculada',tipo: 'text'   },
  ],
  projects: [
    { key: 'data_inicio', label: 'Data de início',    tipo: 'date' },
    { key: 'data_fim',    label: 'Data de entrega',   tipo: 'date' },
    { key: 'updated_at',  label: 'Última atualização',tipo: 'date' },
    { key: 'created_at',  label: 'Data de cadastro',  tipo: 'date' },
    { key: 'status',      label: 'Status', tipo: 'enum', opts: ['em_andamento','concluido','cancelado','pausado'] },
    { key: 'phase',       label: 'Fase',   tipo: 'enum', opts: ['iniciacao','planejamento','execucao','encerramento'] },
    { key: 'responsavel', label: 'Responsável',        tipo: 'text'   },
    { key: 'nome',        label: 'Nome do projeto',    tipo: 'text'   },
    { key: 'cliente',     label: 'Cliente',            tipo: 'text'   },
    { key: 'fin_valor_contrato',   label: 'Valor do contrato (R$)',   tipo: 'money'  },
    { key: 'fin_custo_realizado',  label: 'Custo realizado (R$)',     tipo: 'money'  },
    { key: 'fin_receita_faturada', label: 'Receita faturada (R$)',    tipo: 'money'  },
    { key: 'fin_margem_bruta',     label: 'Margem bruta (R$)',        tipo: 'money'  },
    { key: 'fin_margem_pct',       label: 'Margem (%)',               tipo: 'number' },
    { key: 'fin_custo_forecast',   label: 'Custo estimado/forecast (R$)', tipo: 'money'  },
    { key: 'fin_margem_forecast',  label: 'Margem forecast (R$)',     tipo: 'money'  },
    { key: 'fin_horas_aprovadas',  label: 'Horas aprovadas',          tipo: 'number' },
    { key: 'fin_horas_executadas', label: 'Horas executadas',         tipo: 'number' },
    { key: 'fin_custo_hora',       label: 'Custo/hora (R$)',          tipo: 'money'  },
  ],
  tasks: [
    { key: 'prazo',       label: 'Prazo',             tipo: 'date' },
    { key: 'data_inicio', label: 'Data de início',    tipo: 'date' },
    { key: 'updated_at',  label: 'Última atualização',tipo: 'date' },
    { key: 'created_at',  label: 'Data de cadastro',  tipo: 'date' },
    { key: 'status',      label: 'Status',    tipo: 'enum', opts: ['pendente','em_andamento','concluida','cancelada'] },
    { key: 'prioridade',  label: 'Prioridade',tipo: 'enum', opts: ['alta','media','baixa'] },
    { key: 'responsavel', label: 'Responsável',tipo: 'text' },
    { key: 'tipo',        label: 'Tipo',       tipo: 'text' },
    { key: 'titulo',      label: 'Título',     tipo: 'text' },
  ],
  actions: [
    { key: 'data_prevista',       label: 'Data de início',         tipo: 'date'   },
    { key: 'data_conclusao',      label: 'Data de fim',            tipo: 'date'   },
    { key: 'created_at',          label: 'Data de cadastro',       tipo: 'date'   },
    { key: 'updated_at',          label: 'Última atualização',     tipo: 'date'   },
    { key: 'status',              label: 'Status',     tipo: 'enum', opts: ['agendado','em_andamento','realizado','cancelado'] },
    { key: 'tipo',                label: 'Tipo',       tipo: 'enum', opts: ['treinamento','capacitacao','reuniao','evento','campanha','visita','outros'] },
    { key: 'prioridade',          label: 'Prioridade', tipo: 'enum', opts: ['alta','media','baixa'] },
    { key: 'titulo',              label: 'Título',                 tipo: 'text'   },
    { key: 'descricao',           label: 'Descrição',              tipo: 'text'   },
    { key: 'responsavel_nome',    label: 'Responsável',            tipo: 'text'   },
    { key: 'empresa_nome',        label: 'Empresa / Parceiro',     tipo: 'text'   },
    { key: 'local',               label: 'Local',                  tipo: 'text'   },
    { key: 'vagas',               label: 'Vagas',                  tipo: 'number' },
    { key: 'inscritos',           label: 'Inscritos',              tipo: 'number' },
    { key: 'custo_previsto',      label: 'Custo previsto (R$)',    tipo: 'money'  },
    { key: 'n_custos',            label: 'Qtd. de custos',         tipo: 'number' },
    { key: 'custo_realizado',     label: 'Custo realizado (R$)',   tipo: 'money'  },
    { key: 'custos_aguardando',   label: 'Custos aguard. aprovação', tipo: 'number' },
    { key: 'custos_aprovados',    label: 'Custos aprovados',       tipo: 'number' },
    { key: 'custos_rejeitados',   label: 'Custos rejeitados',      tipo: 'number' },
    { key: 'custos_executados',   label: 'Custos executados',      tipo: 'number' },
    { key: 'n_documentos',        label: 'Qtd. de documentos',     tipo: 'number' },
    { key: 'n_anexos',            label: 'Qtd. de anexos',         tipo: 'number' },
  ],
  commission_payments: [
    { key: 'data_pagamento',   label: 'Data de pagamento',       tipo: 'date'   },
    { key: 'data_competencia', label: 'Período de competência',  tipo: 'date'   },
    { key: 'created_at',       label: 'Data de criação',         tipo: 'date'   },
    { key: 'valor_comissao',   label: 'Valor da comissão (R$)',  tipo: 'money'  },
    { key: 'valor_bruto',      label: 'Valor bruto (R$)',        tipo: 'money'  },
    { key: 'periodo_mes',      label: 'Mês do período',          tipo: 'number' },
    { key: 'periodo_ano',      label: 'Ano do período',          tipo: 'number' },
    { key: 'parcela_numero',   label: 'Nº da parcela',           tipo: 'number' },
    { key: 'total_parcelas',   label: 'Total de parcelas',       tipo: 'number' },
    { key: 'status',           label: 'Status', tipo: 'enum', opts: ['pendente','pago','cancelado','em_atraso'] },
    { key: 'beneficiario_nome',label: 'Beneficiário',            tipo: 'text'   },
    { key: 'persona_slug',     label: 'Persona/Perfil',          tipo: 'text'   },
    { key: 'observacoes',      label: 'Observações',             tipo: 'text'   },
  ],
  payments: [
    { key: 'due_date',          label: 'Data de vencimento',     tipo: 'date'   },
    { key: 'data_emissao',      label: 'Data de emissão',        tipo: 'date'   },
    { key: 'data_baixa',        label: 'Data de baixa',          tipo: 'date'   },
    { key: 'data_fechamento',   label: 'Data de fechamento',     tipo: 'date'   },
    { key: 'reference_month',   label: 'Mês de referência',      tipo: 'date'   },
    { key: 'created_at',        label: 'Data de criação',        tipo: 'date'   },
    { key: 'updated_at',        label: 'Última atualização',     tipo: 'date'   },
    { key: 'amount_total_net',  label: 'Valor total líquido (R$)', tipo: 'money' },
    { key: 'amount_cdu',        label: 'Valor CDU (R$)',         tipo: 'money'  },
    { key: 'amount_sms',        label: 'Valor SMS (R$)',         tipo: 'money'  },
    { key: 'amount_services',   label: 'Valor serviços (R$)',    tipo: 'money'  },
    { key: 'amount_discount',   label: 'Desconto (R$)',          tipo: 'money'  },
    { key: 'valor_recebido',    label: 'Valor recebido (R$)',    tipo: 'money'  },
    { key: 'status',            label: 'Status', tipo: 'enum', opts: ['pendente','pago','cancelado','em_atraso'] },
    { key: 'processed',         label: 'Processado', tipo: 'enum', opts: ['true','false'] },
    { key: 'inconsistencia',    label: 'Com inconsistência', tipo: 'enum', opts: ['true','false'] },
    { key: 'company_nome',      label: 'Empresa',               tipo: 'text'   },
    { key: 'produto_nome',      label: 'Produto',               tipo: 'text'   },
    { key: 'num_documento',     label: 'Nº do documento',       tipo: 'text'   },
    { key: 'parcela',              label: 'Parcela',               tipo: 'text'   },
    { key: 'notes',               label: 'Observações',           tipo: 'text'   },
    { key: 'inconsistencia_status', label: 'Status inconsistência', tipo: 'enum', opts: ['sem_inconsistencia','pendente','resolvida'] },
    { key: 'contract_numero',    label: 'Nº do contrato',         tipo: 'text'   },
    { key: 'origin_type',        label: 'Origem',                 tipo: 'text'   },
  ],
  companies: [
    { key: 'updated_at', label: 'Última atualização', tipo: 'date' },
    { key: 'created_at', label: 'Data de cadastro',   tipo: 'date' },
    { key: 'status',     label: 'Status', tipo: 'enum', opts: ['ativo','inativo','prospecto'] },
    { key: 'tipo',       label: 'Tipo',   tipo: 'enum', opts: ['cliente','parceiro','fornecedor','prospect'] },
    { key: 'segmento',   label: 'Segmento',            tipo: 'text' },
    { key: 'responsavel',label: 'Responsável',          tipo: 'text' },
    { key: 'cidade',     label: 'Cidade',               tipo: 'text' },
    { key: 'estado',     label: 'Estado',               tipo: 'text' },
  ],
  goals: [
    { key: 'valor_atual',        label: 'Valor atual (R$)',          tipo: 'money'  },
    { key: 'valor_planejado',    label: 'Valor planejado (R$)',       tipo: 'money'  },
    { key: 'percentual',         label: 'Percentual atingido',        tipo: 'number' },
    { key: 'periodo_percentual', label: 'Período decorrido (%)',      tipo: 'number' },
    { key: 'periodo_mes',        label: 'Mês do período',             tipo: 'number' },
    { key: 'periodo_ano',        label: 'Ano do período',             tipo: 'number' },
    { key: 'status',             label: 'Status',   tipo: 'enum', opts: ['ativa','pausada','encerrada'] },
    { key: 'tipo_meta',          label: 'Tipo de meta', tipo: 'enum', opts: ['valor','quantidade','percentual'] },
    { key: 'tipo_alvo',          label: 'Alvo',    tipo: 'enum', opts: ['vendedor','unidade','categoria','produto'] },
  ],
  sellers: [
    { key: 'created_at',    label: 'Data de cadastro',    tipo: 'date'   },
    { key: 'updated_at',    label: 'Última atualização',  tipo: 'date'   },
    { key: 'data_admissao', label: 'Data de admissão',    tipo: 'date'   },
    { key: 'meta_mensal',   label: 'Meta mensal (R$)',    tipo: 'money'  },
    { key: 'comissao_perc', label: 'Comissão (%)',        tipo: 'number' },
    { key: 'status',        label: 'Status', tipo: 'enum', opts: ['ativo','inativo'] },
    { key: 'nome',          label: 'Nome',                tipo: 'text'   },
    { key: 'email',         label: 'E-mail',              tipo: 'text'   },
    { key: 'cargo',         label: 'Cargo',               tipo: 'text'   },
    { key: 'regiao',        label: 'Região',              tipo: 'text'   },
    { key: 'equipe',        label: 'Equipe',              tipo: 'text'   },
  ],
  contacts: [
    { key: 'created_at',  label: 'Data de cadastro',    tipo: 'date' },
    { key: 'updated_at',  label: 'Última atualização',  tipo: 'date' },
    { key: 'nome',        label: 'Nome',                tipo: 'text' },
    { key: 'email',       label: 'E-mail',              tipo: 'text' },
    { key: 'phone',       label: 'Telefone',            tipo: 'text' },
    { key: 'cargo',       label: 'Cargo',               tipo: 'text' },
  ],
  provisoes: [
    { key: 'due_date',          label: 'Data de vencimento',     tipo: 'date'   },
    { key: 'data_emissao',      label: 'Data de emissão',        tipo: 'date'   },
    { key: 'data_baixa',        label: 'Data de baixa',          tipo: 'date'   },
    { key: 'data_fechamento',   label: 'Data de fechamento',     tipo: 'date'   },
    { key: 'reference_month',   label: 'Mês de referência',      tipo: 'date'   },
    { key: 'created_at',        label: 'Data de criação',        tipo: 'date'   },
    { key: 'updated_at',        label: 'Última atualização',     tipo: 'date'   },
    { key: 'amount_total_net',  label: 'Valor total líquido (R$)', tipo: 'money' },
    { key: 'amount_cdu',        label: 'Valor CDU (R$)',         tipo: 'money'  },
    { key: 'amount_sms',        label: 'Valor SMS (R$)',         tipo: 'money'  },
    { key: 'amount_services',   label: 'Valor serviços (R$)',    tipo: 'money'  },
    { key: 'amount_discount',   label: 'Desconto (R$)',          tipo: 'money'  },
    { key: 'valor_recebido',    label: 'Valor recebido (R$)',    tipo: 'money'  },
    { key: 'status',            label: 'Status', tipo: 'enum', opts: ['pendente','pago','cancelado','em_atraso'] },
    { key: 'processed',         label: 'Processado', tipo: 'enum', opts: ['true','false'] },
    { key: 'inconsistencia',    label: 'Com inconsistência', tipo: 'enum', opts: ['true','false'] },
    { key: 'inconsistencia_status', label: 'Status inconsistência', tipo: 'enum', opts: ['sem_inconsistencia','pendente','resolvida'] },
    { key: 'company_nome',      label: 'Empresa',               tipo: 'text'   },
    { key: 'produto_nome',      label: 'Produto',               tipo: 'text'   },
    { key: 'contract_numero',   label: 'Nº do contrato',        tipo: 'text'   },
    { key: 'num_documento',     label: 'Nº do documento',       tipo: 'text'   },
    { key: 'parcela',           label: 'Parcela',               tipo: 'text'   },
    { key: 'origin_type',       label: 'Tipo de origem',        tipo: 'text'   },
    { key: 'notes',             label: 'Observações',           tipo: 'text'   },
  ],
  customer_health: [
    { key: 'renewal_date',   label: 'Data de renovação',        tipo: 'date'   },
    { key: 'criado_em',      label: 'Data de cadastro',         tipo: 'date'   },
    { key: 'updated_at',     label: 'Última atualização',       tipo: 'date'   },
    { key: 'ultimo_checkin', label: 'Data do último check-in',  tipo: 'date'   },
    { key: 'health_score',   label: 'Health Score (0–100)',     tipo: 'number' },
    { key: 'n_action_plans', label: 'Qtd. planos de ação',      tipo: 'number' },
    { key: 'n_action_plans_pendentes', label: 'Planos de ação pendentes', tipo: 'number' },
    { key: 'n_checkins',     label: 'Qtd. check-ins',           tipo: 'number' },
    { key: 'laer_stage',     label: 'LAER Stage', tipo: 'enum', opts: ['Land','Adopt','Expand','Renew'] },
    { key: 'touch_model',    label: 'Modelo de toque', tipo: 'enum', opts: ['Tech-Touch','Mid-Touch','High-Touch'] },
    { key: 'company_name',   label: 'Empresa',                  tipo: 'text'   },
    { key: 'company_city',   label: 'Cidade',                   tipo: 'text'   },
    { key: 'company_uf',     label: 'Estado (UF)',              tipo: 'text'   },
    { key: 'csm',            label: 'CSM Responsável',          tipo: 'text'   },
    { key: 'notes',          label: 'Observações',              tipo: 'text'   },
  ],
}

// ─── Operadores ───────────────────────────────────────────────────────────────
const OPS = {
  date:   [
    { key: 'em_branco',   label: 'está em branco (sem data)' },
    { key: 'igual_hoje',  label: 'é hoje' },
    { key: 'antes_hoje',  label: 'antes de hoje (já venceu)' },
    { key: 'apos_hoje',   label: 'após hoje (ainda no futuro)' },
    { key: 'dias_apos',   label: 'há mais de X dias sem atualização' },
    { key: 'dias_antes',  label: 'daqui a menos de X dias' },
    { key: 'antes_de',    label: 'antes de (data fixa)' },
    { key: 'apos_de',     label: 'após (data fixa)' },
  ],
  money:  [
    { key: 'em_branco', label: 'está em branco' },
    { key: 'gt', label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt', label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq', label: 'igual a' },
  ],
  number: [
    { key: 'em_branco', label: 'está em branco' },
    { key: 'gt', label: 'maior que' }, { key: 'gte', label: 'maior ou igual a' },
    { key: 'lt', label: 'menor que' }, { key: 'lte', label: 'menor ou igual a' },
    { key: 'eq', label: 'igual a' },
  ],
  enum: [{ key: 'em_branco', label: 'está em branco' }, { key: 'eq', label: 'é' }, { key: 'neq', label: 'não é' }],
  text: [{ key: 'em_branco', label: 'está em branco' }, { key: 'eq', label: 'é igual a' }, { key: 'neq', label: 'não é' }, { key: 'contains', label: 'contém' }],
}

const DEST_TIPOS = [
  { key: 'responsavel_origem', label: 'Responsável pelo registro'   },
  { key: 'lider_equipe',       label: 'Líder da equipe'             },
  { key: 'email_fixo',         label: 'Email fixo (digitar)'        },
  { key: 'usuario_sistema',    label: 'Usuário do sistema'          },
  { key: 'papel',              label: 'Papel / Perfil'              },
]

// ─── Estilos ──────────────────────────────────────────────────────────────────
const inp = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box' }
const sel = { ...inp, cursor: 'pointer' }
const btnSm = (accent) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: accent ? 'var(--accent)' : 'var(--surface2)', color: accent ? '#fff' : 'var(--text)', border: accent ? '1px solid var(--accent)' : '1px solid var(--border)' })
const lbl = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 5 }

function Sel({ value, onChange, children, style = {} }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...sel, ...style }}>{children}</select>
}

function cfTipo(type) {
  if (type === 'date')   return 'date'
  if (type === 'number') return 'number'
  if (type === 'select') return 'enum'
  return 'text'
}

function newCond()  { return { id: crypto.randomUUID(), campo: '', operador: '', valor: '', logico: 'E' } }
function newAcao()  { return { id: crypto.randomUUID(), tipo: 'notificar', destinatario_tipo: 'responsavel_origem', email_fixo: '', usuario_id: '', papel: '', prazo_dias: 3, titulo_tarefa: '', destinatarios_extra: [] } }
function newDestExtra() { return { id: crypto.randomUUID(), tipo: 'responsavel_origem', email_fixo: '', usuario_id: '', papel: '' } }
function emptyRule(){ return { origem: '', gatilho_nome: '', ativo: true, condicoes: [newCond()], acoes: [newAcao()], acoes_else: [], com_else: false } }

// Templates padrão dos alertas de sistema — usados para regeneração
const SYSTEM_RULE_DEFAULTS = {
  acoes_aprovacao_custos: {
    gatilho_nome: 'Ações aprovação de custos',
    origem: 'actions',
    condicoes: [{ campo: 'custos_aguardando', valor: 'true', logico: 'E', operador: 'eq' }],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'lider_equipe', papel: '', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'lider_equipe', assunto: 'Ações com parceiros', mensagem: 'Uma ação está pendente de sua aprovação:\n{{descricao}}\n{{empresa_nome}}', papel: '', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  contatos_desatualizados: {
    gatilho_nome: 'Contatos canais desatualizados',
    origem: 'contacts',
    condicoes: [{ campo: 'updated_at', valor: '180', logico: 'E', operador: 'dias_apos' }],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'papel', papel: 'admin_isv', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  contratos_inconsistencia: {
    gatilho_nome: 'Contratos com inconsistência',
    origem: 'contracts',
    condicoes: [
      { campo: 'inconsistencia_status', valor: 'pendente', logico: 'E', operador: 'eq' },
      { campo: 'updated_at', valor: '', logico: 'E', operador: 'igual_hoje' },
    ],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'papel', papel: 'financeiro', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'papel', papel: 'financeiro', assunto: 'Contrato com inconsistência', mensagem: 'Abaixo dados de contrato com inconsistência:\nEmpresa: {{empresa_nome}}\nContrato: {{numero}}\nObservações: {{observacoes}}', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  cs_sucesso_cliente: {
    gatilho_nome: 'Sucesso do cliente',
    origem: 'customer_health',
    condicoes: [
      { campo: 'health_score', valor: '49', logico: 'E', operador: 'lte' },
      { campo: 'n_action_plans_pendentes', valor: '1', logico: 'E', operador: 'lt' },
    ],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'papel', papel: 'cs', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'lider_equipe', assunto: 'Cliente com saúde crítica', mensagem: 'O cliente abaixo está numa zona de saúde crítica:\nEmppresa: {{company_name}}\nHealth score: {{health_score}}\nPlanos de ação: {{n_action_plans}}', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  meta_em_risco: {
    gatilho_nome: 'Meta em risco',
    origem: 'goals',
    condicoes: [
      { campo: 'periodo_mes', valor: '__mes_atual__', logico: 'E', operador: 'eq' },
      { campo: 'periodo_percentual', valor: '90%', logico: 'E', operador: 'lte' },
    ],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'lider_equipe', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'lider_equipe', assunto: 'Meta em risco', mensagem: 'Meta abaixo de 90% e período mês avançado.', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    metas_ids: ['categoria|Tradicinal-CDU|valor', 'categoria|Quírons|valor', 'categoria|MntNG|valor'],
    acoes_else: [], com_else: false,
  },
  oportunidade_sem_tarefa: {
    gatilho_nome: 'Oportunidade sem tarefa',
    origem: 'oportunidades',
    condicoes: [
      { campo: 'situacao', valor: 'em_andamento', logico: 'E', operador: 'eq' },
      { campo: 'proxima_tarefa_data', valor: '', logico: 'E', operador: 'em_branco' },
    ],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'responsavel_origem', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  pagamentos_inconsistencias: {
    gatilho_nome: 'Pagamentos com inconsistências',
    origem: 'payments',
    condicoes: [
      { campo: 'inconsistencia_status', valor: 'pendente', logico: 'E', operador: 'eq' },
      { campo: 'updated_at', valor: '', logico: 'E', operador: 'igual_hoje' },
    ],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'papel', papel: 'financeiro', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'papel', papel: 'financeiro', assunto: 'Pagamento com inconsistência', mensagem: 'Empresa: {{company_nome}}\nMês referência: {{reference_month}}\nCriação: {{created_at}}\nObservações {{notes}}', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  parceiros_maturidade: {
    gatilho_nome: 'Parceiros atualização de maturidade',
    origem: 'sellers',
    condicoes: [{ campo: 'updated_at', valor: '', logico: 'E', operador: 'igual_hoje' }],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'lider_equipe', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'lider_equipe', assunto: 'Parceiros atualização de maturidade', mensagem: 'Atualização de maturidade de Parceiro realizada.', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  projetos_fora_prazo: {
    gatilho_nome: 'Projetos fora do prazo',
    origem: 'projects',
    condicoes: [
      { campo: 'status', valor: 'em_andamento', logico: 'E', operador: 'eq' },
      { campo: 'data_fim', valor: '', logico: 'E', operador: 'antes_hoje' },
    ],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'papel', papel: 'projetos', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'notificar', destinatario_tipo: 'responsavel_origem', papel: '', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'papel', papel: 'projetos', assunto: 'Projeto com prazo estourado', mensagem: 'Projeto fora do prazo de entrega.', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  projetos_margem_ruim: {
    gatilho_nome: 'Projetos com margem ruim',
    origem: 'projects',
    condicoes: [
      { campo: 'status', valor: 'em_andamento', logico: 'E', operador: 'eq' },
      { campo: 'data_fim', valor: '20', logico: 'E', operador: 'dias_antes' },
      { campo: 'fin_margem_pct', valor: '10%', logico: 'E', operador: 'lt' },
    ],
    acoes: [
      { tipo: 'email', destinatario_tipo: 'lider_equipe', assunto: 'Projeto com margem abaixo do esperado', mensagem: 'Projeto chegando ao fim e abaixo da margem.', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'notificar', destinatario_tipo: 'lider_equipe', papel: '', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [{ tipo: 'papel', papel: 'projetos', email_fixo: '', usuario_id: '' }] },
    ],
    acoes_else: [], com_else: false,
  },
  projetos_novo_cadastrado: {
    gatilho_nome: 'Projetos novo projeto cadastrado',
    origem: 'projects',
    condicoes: [{ campo: 'created_at', valor: '', logico: 'E', operador: 'igual_hoje' }],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'lider_equipe', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  provisoes_inconsistencias: {
    gatilho_nome: 'Provisões com inconsistências',
    origem: 'provisoes',
    condicoes: [{ campo: 'inconsistencia_status', valor: 'pendente', logico: 'E', operador: 'eq' }],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'papel', papel: 'financeiro', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'papel', papel: 'financeiro', assunto: 'Provisões com inconsistências', mensagem: 'Empresa: {{company_nome}}\nCriado: {{created_at}}\nMês referência: {{reference_month}}\nObservações: {{notes}}', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
  tarefas_atrasadas: {
    gatilho_nome: 'Tarefas atrasadas',
    origem: 'tasks',
    condicoes: [{ campo: 'data_inicio', valor: '', logico: 'E', operador: 'antes_hoje' }],
    acoes: [
      { tipo: 'notificar', destinatario_tipo: 'responsavel_origem', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
      { tipo: 'email', destinatario_tipo: 'responsavel_origem', assunto: 'Tarefas atrasadas', mensagem: 'Constão no sistema tarefas atrasadas', email_fixo: '', prazo_dias: 3, usuario_id: '', titulo_tarefa: '', destinatarios_extra: [] },
    ],
    acoes_else: [], com_else: false,
  },
}

// ─── Engine de avaliação ──────────────────────────────────────────────────────
function avaliarCondicao(registro, cond) {
  const path = cond.campo.startsWith('cf.') ? null : cond.campo.split('.')
  let val = path ? path.reduce((o, k) => o?.[k], registro) : registro?.custom_fields?.[cond.campo.replace('cf.', '')]

  const hoje = Date.now()
  const agora = new Date()
  let v = cond.valor
  if (v === '__mes_atual__') v = String(agora.getMonth() + 1)
  if (v === '__ano_atual__') v = String(agora.getFullYear())

  switch (cond.operador) {
    case 'em_branco':  return !val || String(val).trim() === ''
    case 'igual_hoje': { const hoje = new Date().toISOString().slice(0,10); return val ? String(val).slice(0,10) === hoje : false }
    case 'antes_hoje': return val ? new Date(val) < new Date(new Date().toDateString()) : false
    case 'apos_hoje':  return val ? new Date(val) > new Date(new Date().toDateString()) : false
    case 'dias_apos': {
      if (!val) return false
      const diff = (hoje - new Date(val).getTime()) / 86400000
      return diff > Number(v)
    }
    case 'dias_antes': {
      if (!val) return false
      const diff = (new Date(val).getTime() - hoje) / 86400000
      return diff >= 0 && diff < Number(v)
    }
    case 'antes_de': return val ? new Date(val) < new Date(v) : false
    case 'apos_de':  return val ? new Date(val) > new Date(v) : false
    case 'gt':  return Number(val) > Number(v)
    case 'gte': return Number(val) >= Number(v)
    case 'lt':  return Number(val) < Number(v)
    case 'lte': return Number(val) <= Number(v)
    case 'eq':  return String(val ?? '') === String(v)
    case 'neq': return String(val ?? '') !== String(v)
    case 'contains': return String(val ?? '').toLowerCase().includes(String(v).toLowerCase())
    default: return false
  }
}

// Avalia condições com operadores por par (cada condição carrega seu `logico` que une ela com a próxima)
function avaliarRegra(rule, registro) {
  const conds = (rule.condicoes || []).filter(c => c.campo && c.operador)
  if (!conds.length) return false
  if (conds.length === 1) return avaliarCondicao(registro, conds[0])

  // Avalia encadeando: resultado acumula usando o `logico` de cada condição
  let resultado = avaliarCondicao(registro, conds[0])
  for (let i = 1; i < conds.length; i++) {
    const prev = conds[i - 1]
    const cur  = avaliarCondicao(registro, conds[i])
    resultado = (prev.logico === 'OU') ? (resultado || cur) : (resultado && cur)
  }
  return resultado
}

async function resolverUmDestinatario(tipo, emailFixo, usuarioId, registro, tenantId) {
  if (tipo === 'email_fixo') return emailFixo || null

  if (tipo === 'responsavel_origem') {
    const responsavelId = registro.responsavel_id || registro.responsavel || null
    if (!responsavelId) return null
    // Tenta por UUID primeiro, depois por nome
    const { data } = await supabase.from('profiles').select('email').eq('id', responsavelId).single()
    if (data?.email) return data.email
    const { data: d2 } = await supabase.from('profiles').select('email').eq('tenant_id', tenantId).ilike('nome', `%${responsavelId}%`).single()
    return d2?.email || null
  }

  if (tipo === 'usuario_sistema') {
    if (!usuarioId) return null
    const { data } = await supabase.from('profiles').select('email').eq('id', usuarioId).single()
    return data?.email || null
  }

  if (tipo === 'lider_equipe') {
    // Retorna todos os admin_isv do tenant como "líderes"
    const { data } = await supabase.from('profiles').select('email').eq('tenant_id', tenantId).eq('papel', 'admin_isv').limit(3)
    return data?.[0]?.email || null
  }

  return null
}

async function resolverPapel(papel, tenantId) {
  if (!papel || !tenantId) return []
  const { data } = await supabase.from('profiles').select('email').eq('tenant_id', tenantId).eq('papel', papel)
  return (data || []).map(p => p.email).filter(Boolean)
}

async function resolverTodosDestinatarios(acao, registro, tenantId) {
  const emails = new Set()

  async function addDestinatario(tipo, emailFixo, usuarioId, papel) {
    if (tipo === 'papel') {
      const lista = await resolverPapel(papel, tenantId)
      lista.forEach(e => emails.add(e))
    } else {
      const e = await resolverUmDestinatario(tipo, emailFixo, usuarioId, registro, tenantId)
      if (e) emails.add(e)
    }
  }

  await addDestinatario(acao.destinatario_tipo, acao.email_fixo, acao.usuario_id, acao.papel)
  for (const de of (acao.destinatarios_extra || [])) {
    await addDestinatario(de.tipo, de.email_fixo, de.usuario_id, de.papel)
  }
  return [...emails]
}

async function executarAcoes(acoes, registro, rule, tenantId) {
  for (const acao of acoes) {
    if (acao.tipo === 'email' || acao.tipo === 'notificar') {
      const emails = await resolverTodosDestinatarios(acao, registro, tenantId)
      if (!emails.length) continue

      const nomeReg = registro.titulo || registro.nome || registro.nome_fantasia || `#${registro.id?.slice(0,8)}`
      const interpolar = (str) => (str || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const v = registro[key]
        return v !== undefined && v !== null ? String(v) : ''
      }).replace('{titulo}', nomeReg).replace('{entidade}', nomeReg)

      if (acao.tipo === 'email') {
        const assunto  = interpolar(acao.assunto)  || rule.gatilho_nome || 'Alerta Boostly'
        const mensagem = interpolar(acao.mensagem) || `Regra <b>${rule.gatilho_nome}</b> acionada para: ${nomeReg}`
        for (const email of emails) {
          await supabase.functions.invoke('send-email', {
            body: { template: 'alerta_generico', to: email, data: { titulo: assunto, mensagem } },
          })
        }
      } else {
        // tipo: 'notificar' — email padronizado com layout do projeto
        const titulo = interpolar(acao.titulo_tarefa) || rule.gatilho_nome || 'Notificação Boostly'
        for (const email of emails) {
          await supabase.functions.invoke('send-email', {
            body: {
              template: 'notificacao',
              to: email,
              data: {
                titulo,
                entidade:  nomeReg,
                gatilho:   (rule.gatilho_nome || '').toUpperCase(),
                cor:       rule.cor || '#4F7FE8',
                link:      'https://boostly.com.br',
              },
            },
          })
        }
      }
    }
  }
}

async function executarEngine(tenantId) {
  if (!tenantId) return
  const { data: rules } = await supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).eq('ativo', true)
  if (!rules?.length) return

  const origemSet = [...new Set(rules.map(r => r.origem))]
  const dados = {}
  for (const origem of origemSet) {
    const origemDef = ORIGENS.find(o => o.key === origem)
    if (!origemDef) continue

    let registros = []
    if (origem === 'customer_health') {
      // CS ainda usa localStorage — lê diretamente e filtra por tenant_id
      try {
        const raw = localStorage.getItem('cs:customer_health_v1')
        const todos = raw ? JSON.parse(raw) : []
        registros = todos.filter(r => !r.tenant_id || r.tenant_id === tenantId)
      } catch { registros = [] }
    } else {
      const { data } = await supabase.from(origemDef.table).select('*').eq('tenant_id', tenantId).limit(500)
      registros = data || []
    }

    // Enriquece oportunidades com tarefas (contagem + próxima tarefa + 1ª conclusão)
    if (origem === 'oportunidades' && registros.length > 0) {
      const ids = registros.map(r => r.id)
      const { data: taskRows } = await supabase
        .from('tasks')
        .select('entidade_id, status, data_inicio, concluida_em')
        .in('entidade_id', ids)

      const tasksByOpp = {}
      for (const t of (taskRows || [])) {
        const eid = t.entidade_id
        if (!eid) continue
        if (!tasksByOpp[eid]) tasksByOpp[eid] = { pendentes: [], concluidas: [] }
        if (t.status === 'concluida' && t.concluida_em) tasksByOpp[eid].concluidas.push(t)
        else if (t.status !== 'cancelada') tasksByOpp[eid].pendentes.push(t)
      }

      registros = registros.map(r => {
        const g = tasksByOpp[r.id] || { pendentes: [], concluidas: [] }
        const proxima = g.pendentes
          .filter(t => t.data_inicio)
          .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))[0]
        const primeira = g.concluidas
          .sort((a, b) => a.concluida_em.localeCompare(b.concluida_em))[0]
        return {
          ...r,
          n_tarefas:              g.pendentes.length + g.concluidas.length,
          proxima_tarefa_data:    proxima?.data_inicio?.slice(0, 10) || '',
          proxima_tarefa_hora:    proxima?.data_inicio?.slice(11, 16) || '',
          primeira_conclusao_data: primeira?.concluida_em?.slice(0, 10) || '',
          primeira_conclusao_hora: primeira?.concluida_em?.slice(11, 16) || '',
        }
      })
    }

    // Enriquece provisões com campos de custom_fields
    if (origem === 'provisoes' && registros.length > 0) {
      registros = registros.map(r => {
        const cf = r.custom_fields || {}
        return {
          ...r,
          company_nome:     cf.company_nome     || '',
          produto_nome:     cf.produto_nome     || '',
          contract_numero:  cf.contract_numero  || '',
          num_documento:    cf.num_documento    || '',
          parcela:          cf.parcela          || '',
          origin_type:      cf.origin_type      || '',
          data_emissao:     cf.data_emissao     || null,
          data_baixa:       cf.data_baixa       || null,
          valor_recebido:   cf.valor_recebido   ?? null,
          amount_total_net: Number(r.amount_cdu || 0) + Number(r.amount_sms || 0) + Number(r.amount_services || 0) - Number(r.amount_discount || 0),
        }
      })
    }

    // Enriquece CS com campos calculados de action_plans e checkins
    if (origem === 'customer_health' && registros.length > 0) {
      registros = registros.map(r => {
        const plans    = r.action_plans || []
        const checkins = r.checkins || []
        const checkinDatas = checkins.map(c => c.date).filter(Boolean).sort()
        return {
          ...r,
          n_action_plans:           plans.length,
          n_action_plans_pendentes: plans.filter(p => !p.done).length,
          n_checkins:               checkins.length,
          ultimo_checkin:           checkinDatas[checkinDatas.length - 1] || null,
        }
      })
    }

    // Enriquece projetos com campos financeiros de custom_fields
    if (origem === 'projects' && registros.length > 0) {
      registros = registros.map(r => {
        const cf = r.custom_fields || {}
        return {
          ...r,
          fin_valor_contrato:   cf.fin_valor_contrato   ?? null,
          fin_custo_realizado:  cf.fin_custo_realizado  ?? null,
          fin_receita_faturada: cf.fin_receita_faturada ?? null,
          fin_margem_bruta:     cf.fin_margem_bruta     ?? null,
          fin_margem_pct:       cf.fin_margem_pct       ?? null,
          fin_custo_forecast:   cf.fin_custo_forecast   ?? null,
          fin_margem_forecast:  cf.fin_margem_forecast  ?? null,
          fin_horas_aprovadas:  cf.fin_horas_aprovadas  ?? null,
          fin_horas_executadas: cf.fin_horas_executadas ?? null,
          fin_custo_hora:       cf.fin_custo_hora       ?? null,
        }
      })
    }

    // Enriquece payments com campos vindos de custom_fields
    if (origem === 'payments' && registros.length > 0) {
      registros = registros.map(r => {
        const cf = r.custom_fields || {}
        return {
          ...r,
          company_nome:          r.companies?.nome_fantasia || r.companies?.razao_social || cf.company_nome || '',
          produto_nome:          cf.produto_nome       || '',
          num_documento:         cf.num_documento      || '',
          parcela:               cf.parcela            || '',
          data_emissao:          cf.data_emissao       || '',
          data_baixa:            cf.data_baixa         || '',
          valor_recebido:        cf.valor_recebido     || 0,
          contract_numero:       cf.contract_numero    || '',
          origin_type:           cf.origin_type        || cf._origem || '',
          inconsistencia_status: r.inconsistencia_status || cf.inconsistencia_status || 'sem_inconsistencia',
        }
      })
    }

    // Enriquece contracts com campos vindos de custom_fields
    if (origem === 'contracts' && registros.length > 0) {
      registros = registros.map(r => {
        const cf = r.custom_fields || {}
        return {
          ...r,
          empresa_nome:          r.companies?.nome_fantasia || r.companies?.razao_social || cf.empresa_nome || '',
          responsavel:           cf.responsavel      || '',
          origem:                cf.origem           || '',
          data_pag_cdu:          cf.data_pag_cdu     || '',
          data_pag_sms:          cf.data_pag_sms     || '',
          inconsistencia_status: cf.inconsistencia_status || 'sem_inconsistencia',
          opportunity_titulo:    cf.opportunity_titulo || '',
        }
      })
    }

    // Enriquece ações com campos calculados de custos/documentos/anexos
    if (origem === 'actions' && registros.length > 0) {
      registros = registros.map(r => {
        const cf = r.custom_fields || {}
        const custos = cf.custos || []
        const ultimoStatus = (c) => {
          const aprovs = c.aprovacoes || []
          if (!aprovs.length) return 'pendente'
          return aprovs[aprovs.length - 1].status || 'pendente'
        }
        const custosRealizadoTotal = custos.filter(c => c.executado).reduce((s, c) => s + (Number(c.valor_realizado) || 0), 0)
        return {
          ...r,
          responsavel_nome:  cf.responsavel_nome || '',
          empresa_nome:      cf.empresa_nome || '',
          local:             cf.local || '',
          vagas:             cf.vagas || 0,
          inscritos:         cf.inscritos || 0,
          custo_previsto:    Number(cf.custo_previsto) || 0,
          custo_realizado:   custosRealizadoTotal,
          n_custos:          custos.length,
          custos_aguardando: custos.filter(c => ultimoStatus(c) === 'aguardando').length,
          custos_aprovados:  custos.filter(c => ultimoStatus(c) === 'aprovado').length,
          custos_rejeitados: custos.filter(c => ultimoStatus(c) === 'rejeitado').length,
          custos_executados: custos.filter(c => c.executado).length,
          n_documentos:      (cf.documentos || []).length,
          n_anexos:          (cf.anexos || []).length,
        }
      })
    }

    if (origem === 'goals') {
      // Agrupa meses por meta lógica (tipo_alvo + alvo_id + tipo_meta)
      const grupos = {}
      for (const g of registros) {
        const key = `${g.tipo_alvo}|${g.alvo_id || ''}|${g.tipo_meta}`
        if (!grupos[key]) grupos[key] = []
        grupos[key].push(g)
      }
      const agora = new Date()
      const anoAtual = agora.getFullYear()
      const mesAtual = agora.getMonth() + 1
      registros = registros.map(g => {
        const key = `${g.tipo_alvo}|${g.alvo_id || ''}|${g.tipo_meta}`
        const grupo = grupos[key]
        const sorted = [...grupo].sort((a, b) => a.periodo_ano !== b.periodo_ano ? a.periodo_ano - b.periodo_ano : a.periodo_mes - b.periodo_mes)
        const primeiro = sorted[0]
        const ultimo   = sorted[sorted.length - 1]
        const totalMeses = (ultimo.periodo_ano - primeiro.periodo_ano) * 12 + (ultimo.periodo_mes - primeiro.periodo_mes)
        const decorridos = (anoAtual - primeiro.periodo_ano) * 12 + (mesAtual - primeiro.periodo_mes)
        const pp = totalMeses <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((decorridos / totalMeses) * 100)))
        return { ...g, periodo_percentual: pp, _goal_key: key }
      })
    }
    dados[origem] = registros
  }

  const { data: existentes } = await supabase.from('alerts').select('id, rule_id, entidade_id').eq('tenant_id', tenantId).eq('resolvido', false)
  // mapa chave → alert_id para poder auto-resolver
  const jaAlertadoMap = {}
  for (const a of (existentes || [])) jaAlertadoMap[`${a.rule_id}:${a.entidade_id}`] = a.id

  const novos = []
  const autoResolver = [] // ids de alertas a resolver automaticamente
  for (const rule of rules) {
    const cf = rule.custom_fields || {}
    const metasIds = cf.metas_ids || []
    let registros = dados[rule.origem] || []
    if (rule.origem === 'goals' && metasIds.length > 0) {
      registros = registros.filter(g => metasIds.includes(g._goal_key))
    }
    const fullRule = { ...rule, condicoes: cf.condicoes || [], acoes: cf.acoes || [], acoes_else: cf.acoes_else || [], com_else: cf.com_else || false }
    for (const reg of registros) {
      const chave = `${rule.id}:${reg.id}`
      const alertaExistenteId = jaAlertadoMap[chave]
      const passou = avaliarRegra(fullRule, reg)

      // Auto-resolver: alerta existe mas condição não é mais verdadeira
      if (alertaExistenteId && !passou) {
        autoResolver.push(alertaExistenteId)
        continue
      }

      // Já alertado e condição ainda é verdadeira — não duplicar
      if (alertaExistenteId) continue

      if (!passou && !fullRule.com_else) continue

      const nomeReg = reg.titulo || reg.nome_fantasia || reg.razao_social || reg.name || reg.nome || `#${reg.id?.slice(0,8)}`
      const acoesFire = passou ? fullRule.acoes : fullRule.acoes_else

      // Cria notificação no painel para ações do tipo notificar
      const temNotificar = acoesFire.some(a => a.tipo === 'notificar')
      if (passou && temNotificar) {
        novos.push({
          tenant_id:     tenantId,
          rule_id:       rule.id,
          gatilho:       rule.gatilho_nome,
          entidade_tipo: rule.origem,
          entidade_id:   String(reg.id),
          entidade_nome: nomeReg,
          titulo:        rule.gatilho_nome,
          mensagem:      `Regra "${rule.gatilho_nome}" acionada para: ${nomeReg}`,
          prioridade:    'media',
          resolvido:     false,
          created_at:    new Date().toISOString(),
        })
      }

      // Executa ações de email
      await executarAcoes(acoesFire.filter(a => a.tipo === 'email'), reg, fullRule, tenantId)
    }
  }

  if (autoResolver.length) {
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).in('id', autoResolver)
  }
  if (novos.length) {
    await supabase.from('alerts').insert(novos)
  }
  return { criados: novos.length, resolvidos: autoResolver.length }
}

// ─── Selector de usuário do sistema ──────────────────────────────────────────
function UsuarioSelector({ tenantId, value, onChange }) {
  const [usuarios, setUsuarios] = useState([])
  useEffect(() => {
    if (!tenantId) return
    supabase.from('profiles').select('id, full_name, email').eq('tenant_id', tenantId).order('full_name')
      .then(({ data }) => setUsuarios(data || []))
  }, [tenantId])
  return (
    <Sel value={value || ''} onChange={onChange}>
      <option value="">Selecione o usuário…</option>
      {usuarios.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
    </Sel>
  )
}

// ─── Editor de Condições ──────────────────────────────────────────────────────
function CondicoesEditor({ origem, condicoes, onChangeCondicoes }) {
  const [cfDefs] = useCustomFields(origem || 'oportunidades')
  const padrao  = CAMPOS_PADRAO[origem] || []
  const custom  = (cfDefs || []).map(f => ({ key: `cf.${f.key}`, label: `${f.label} ✦`, tipo: cfTipo(f.type), opts: f.options || [] }))
  const campos  = [...padrao, ...custom]

  function update(id, patch) {
    onChangeCondicoes(condicoes.map(c => c.id === id ? { ...c, ...patch, ...(patch.campo ? { operador: '', valor: '' } : {}) } : c))
  }
  function toggleLogico(id) {
    onChangeCondicoes(condicoes.map(c => c.id === id ? { ...c, logico: c.logico === 'E' ? 'OU' : 'E' } : c))
  }
  function add()      { onChangeCondicoes([...condicoes, newCond()]) }
  function remove(id) { onChangeCondicoes(condicoes.filter(c => c.id !== id)) }

  if (!origem) return <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Selecione uma origem primeiro.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {condicoes.map((c, idx) => {
        const campo = campos.find(f => f.key === c.campo)
        const ops   = campo ? (OPS[campo.tipo] || OPS.text) : []
        return (
          <div key={c.id}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, alignItems: 'center' }}>
              <Sel value={c.campo} onChange={v => update(c.id, { campo: v })}>
                <option value="">Campo…</option>
                {campos.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </Sel>
              <Sel value={c.operador} onChange={v => update(c.id, { operador: v })}>
                <option value="">Operador…</option>
                {ops.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Sel>
              {(c.operador === 'em_branco' || c.operador === 'igual_hoje' || c.operador === 'antes_hoje' || c.operador === 'apos_hoje')
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>— data atual —</div>
                : campo?.tipo === 'enum'
                  ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })}>
                      <option value="">Valor…</option>
                      {(campo.opts || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </Sel>
                  : (c.operador === 'dias_apos' || c.operador === 'dias_antes')
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" min={1} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })}
                          style={{ ...inp, width: 70 }} placeholder="0" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>dias</span>
                      </div>
                    : c.campo === 'periodo_mes'
                      ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })}>
                          <option value="">Valor…</option>
                          <option value="__mes_atual__">Mês atual</option>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={String(m)}>{m}</option>)}
                        </Sel>
                    : c.campo === 'periodo_ano'
                      ? <Sel value={c.valor} onChange={v => update(c.id, { valor: v })}>
                          <option value="">Valor…</option>
                          <option value="__ano_atual__">Ano atual</option>
                          {[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </Sel>
                    : campo?.tipo === 'money'
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$</span>
                          <input type="number" min={0} step={0.01} value={c.valor} onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="0,00" />
                        </div>
                      : <input type={campo?.tipo === 'date' ? 'date' : 'text'} value={c.valor}
                          onChange={e => update(c.id, { valor: e.target.value })} style={{ ...inp }} placeholder="Valor…" />
              }
              <button onClick={() => remove(c.id)} title="Remover condição"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px 4px', flexShrink: 0 }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
            {/* Separador E/OU entre condições */}
            {idx < condicoes.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <button
                  onClick={() => toggleLogico(c.id)}
                  title="Clique para alternar E / OU"
                  style={{ padding: '2px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
                    background: c.logico === 'OU' ? 'color-mix(in srgb, #f59e0b 15%, transparent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: c.logico === 'OU' ? '#d97706' : 'var(--accent)',
                    border: c.logico === 'OU' ? '1px solid #f59e0b' : '1px solid var(--accent)',
                  }}>
                  {c.logico || 'E'}
                </button>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            )}
          </div>
        )
      })}
      <button onClick={add} style={{ ...btnSm(false), alignSelf: 'flex-start', marginTop: 8 }}>
        <Plus size={11} strokeWidth={2.5} /> Adicionar condição
      </button>
    </div>
  )
}

// ─── Editor de Ações ──────────────────────────────────────────────────────────
function VarPicker({ origem, onInsert }) {
  const [open, setOpen] = useState(false)
  const campos = CAMPOS_PADRAO[origem] || []
  if (!campos.length) return null
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13 }}>{'{ }'}</span> Inserir variável
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 200, top: '100%', left: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: 220, maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
          {campos.map(c => (
            <div key={c.key} onClick={() => { onInsert(`{{${c.key}}}`); setOpen(false) }}
              style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--text)' }}>{c.label}</span>
              <code style={{ color: 'var(--accent)', fontSize: 10 }}>{`{{${c.key}}}`}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AcoesEditor({ acoes, onChange, tenantId, label = 'Ação', origem }) {
  function update(id, patch) { onChange(acoes.map(a => a.id === id ? { ...a, ...patch } : a)) }
  function add()      { onChange([...acoes, newAcao()]) }
  function remove(id) { onChange(acoes.filter(a => a.id !== id)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {acoes.map((a, idx) => (
        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label} {idx + 1}
            </span>
            {acoes.length > 1 && (
              <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                <Trash2 size={13} strokeWidth={2} />
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: (a.tipo !== 'notificar' || a.destinatario_tipo === 'email_fixo' || a.destinatario_tipo === 'usuario_sistema') ? 10 : 0 }}>
            <div>
              <div style={lbl}>Tipo</div>
              <Sel value={a.tipo} onChange={v => update(a.id, { tipo: v })}>
                <option value="notificar">Notificar no painel</option>
                <option value="email">Enviar e-mail</option>
                <option value="tarefa">Criar tarefa</option>
              </Sel>
            </div>
            <div>
              <div style={lbl}>Para quem</div>
              <Sel value={a.destinatario_tipo} onChange={v => update(a.id, { destinatario_tipo: v })}>
                {DEST_TIPOS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Sel>
            </div>
          </div>
          {a.destinatario_tipo === 'email_fixo' && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>Email</div>
              <input value={a.email_fixo} onChange={e => update(a.id, { email_fixo: e.target.value })}
                placeholder="email@exemplo.com" style={inp} type="email" />
            </div>
          )}
          {a.destinatario_tipo === 'usuario_sistema' && tenantId && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>Usuário</div>
              <UsuarioSelector tenantId={tenantId} value={a.usuario_id} onChange={v => update(a.id, { usuario_id: v })} />
            </div>
          )}
          {a.destinatario_tipo === 'papel' && (
            <div style={{ marginBottom: 10 }}>
              <div style={lbl}>Papel</div>
              <Sel value={a.papel || ''} onChange={v => update(a.id, { papel: v })}>
                <option value="">— Selecione —</option>
                {PAPEIS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Sel>
            </div>
          )}

          {/* Destinatários extras */}
          {(a.destinatarios_extra || []).map((de, dei) => {
            const updDe = (patch) => update(a.id, {
              destinatarios_extra: (a.destinatarios_extra || []).map(d => d.id === de.id ? { ...d, ...patch } : d)
            })
            const remDe = () => update(a.id, { destinatarios_extra: (a.destinatarios_extra || []).filter(d => d.id !== de.id) })
            return (
              <div key={de.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Sel value={de.tipo} onChange={v => updDe({ tipo: v })}>
                    {DEST_TIPOS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </Sel>
                  {de.tipo === 'email_fixo' && (
                    <input value={de.email_fixo} onChange={e => updDe({ email_fixo: e.target.value })}
                      placeholder="email@exemplo.com" style={inp} type="email" />
                  )}
                  {de.tipo === 'usuario_sistema' && tenantId && (
                    <UsuarioSelector tenantId={tenantId} value={de.usuario_id} onChange={v => updDe({ usuario_id: v })} />
                  )}
                  {de.tipo === 'papel' && (
                    <Sel value={de.papel || ''} onChange={v => updDe({ papel: v })}>
                      <option value="">— Selecione —</option>
                      {PAPEIS_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </Sel>
                  )}
                </div>
                <button onClick={remDe} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '7px 4px' }}>
                  <Trash2 size={13} strokeWidth={2}/>
                </button>
              </div>
            )
          })}
          <button onClick={() => update(a.id, { destinatarios_extra: [...(a.destinatarios_extra || []), newDestExtra()] })}
            style={{ ...btnSm(false), fontSize: 11, marginBottom: 8 }}>
            + Adicionar destinatário
          </button>

          {a.tipo === 'email' && (() => {
            const assuntoRef = { current: null }
            const mensagemRef = { current: null }
            const insertAt = (ref, fieldKey, token) => {
              const el = ref.current
              if (!el) { update(a.id, { [fieldKey]: (a[fieldKey] || '') + token }); return }
              const start = el.selectionStart ?? (a[fieldKey] || '').length
              const end   = el.selectionEnd   ?? start
              const val   = a[fieldKey] || ''
              const next  = val.slice(0, start) + token + val.slice(end)
              update(a.id, { [fieldKey]: next })
              setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length) }, 0)
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={lbl}>Assunto</div>
                    <VarPicker origem={origem} onInsert={t => insertAt(assuntoRef, 'assunto', t)} />
                  </div>
                  <input ref={el => assuntoRef.current = el}
                    value={a.assunto || ''} onChange={e => update(a.id, { assunto: e.target.value })}
                    style={inp} placeholder="Ex: Alerta — {{titulo}}" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={lbl}>Mensagem</div>
                    <VarPicker origem={origem} onInsert={t => insertAt(mensagemRef, 'mensagem', t)} />
                  </div>
                  <textarea ref={el => mensagemRef.current = el}
                    value={a.mensagem || ''} onChange={e => update(a.id, { mensagem: e.target.value })}
                    style={{ ...inp, minHeight: 96, resize: 'vertical' }}
                    placeholder={`Corpo do e-mail. Use {{campo}} para inserir dados dinâmicos.\nEx: O projeto {{titulo}} está com margem em {{fin_margem_pct}}%.`} />
                </div>
              </div>
            )
          })()}
          {a.tipo === 'tarefa' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
              <div>
                <div style={lbl}>Título da tarefa</div>
                <input value={a.titulo_tarefa} onChange={e => update(a.id, { titulo_tarefa: e.target.value })}
                  style={inp} placeholder="Ex: Ligar para cliente" />
              </div>
              <div>
                <div style={lbl}>Prazo (dias)</div>
                <input type="number" min={1} max={90} value={a.prazo_dias}
                  onChange={e => update(a.id, { prazo_dias: Number(e.target.value) })} style={{ ...inp, width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={add} style={{ ...btnSm(false), alignSelf: 'flex-start' }}>
        <Plus size={11} strokeWidth={2.5} /> Adicionar ação
      </button>
    </div>
  )
}

// ─── Serialização ─────────────────────────────────────────────────────────────
function rowToRule(r) {
  const cf = r.custom_fields || {}
  return {
    id:          r.id,
    gatilho_nome:r.gatilho_nome || r.gatilho || '',
    origem:      r.origem || '',
    ativo:       r.ativo,
    is_system:   r.is_system || false,
    system_key:  r.system_key || null,
    condicoes:   cf.condicoes   || [newCond()],
    acoes:       cf.acoes       || [newAcao()],
    acoes_else:  cf.acoes_else  || [],
    com_else:    cf.com_else    || false,
    metas_ids:   cf.metas_ids   || [],
  }
}

function ruleToRow(f, tenantId, branchId) {
  return {
    tenant_id:    tenantId,
    branch_id:    branchId || null,
    gatilho:      f.gatilho_nome,
    gatilho_nome: f.gatilho_nome,
    origem:       f.origem,
    ativo:        f.ativo,
    dias_aviso:   1,
    modo:         'notificar',
    destinatarios: [],
    custom_fields: {
      condicoes:  f.condicoes,
      acoes:      f.acoes,
      acoes_else: f.acoes_else || [],
      com_else:   f.com_else   || false,
      metas_ids:  f.metas_ids  || [],
    },
    updated_at: new Date().toISOString(),
  }
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsAlertas() {
  const { profile }            = useProfile()
  const { activeBranchId }     = useBranchContext()
  const [rules, setRules]      = useState([])
  const [loading, setLoading]  = useState(true)
  const [editing, setEditing]  = useState(null)
  const [search, setSearch]    = useState('')
  const [saving, setSaving]    = useState(false)
  const [running, setRunning]  = useState(false)
  const [lastRun, setLastRun]  = useState(null)
  const [goalsAtivas, setGoalsAtivas]   = useState([])
  const [goalSearch, setGoalSearch]     = useState('')
  const [goalDropOpen, setGoalDropOpen] = useState(false)
  const engineRef = useRef(false)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('alert_rules').select('*').eq('tenant_id', tenantId).order('created_at')
    if (activeBranchId) q = q.or(`branch_id.eq.${activeBranchId},branch_id.is.null`)
    const { data } = await q
    setRules((data || []).map(rowToRule))
    setLoading(false)
  }, [tenantId, activeBranchId])

  useEffect(() => { if (tenantId) load(); else setLoading(false) }, [load, tenantId])

  useEffect(() => {
    if (!tenantId) return
    supabase.from('goals').select('id, alvo_nome, tipo_alvo, alvo_id, tipo_meta, periodo_mes, periodo_ano, status').order('periodo_ano', { ascending: false }).order('periodo_mes', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('[Alertas] goals fetch:', error); return }
        const ativas = (data || []).filter(g => g.status === 'ativa' || g.status === 'pausada' || !g.status)
        // Agrupa por meta lógica (tipo_alvo + alvo_id + tipo_meta)
        const grupos = {}
        for (const g of ativas) {
          const key = `${g.tipo_alvo}|${g.alvo_id || ''}|${g.tipo_meta}`
          if (!grupos[key]) {
            const sorted = ativas.filter(x => `${x.tipo_alvo}|${x.alvo_id || ''}|${x.tipo_meta}` === key)
              .sort((a, b) => a.periodo_ano !== b.periodo_ano ? a.periodo_ano - b.periodo_ano : a.periodo_mes - b.periodo_mes)
            const primeiro = sorted[0]
            const ultimo   = sorted[sorted.length - 1]
            grupos[key] = {
              key,
              titulo: `${g.alvo_nome || g.tipo_alvo} — ${g.tipo_meta}`,
              subtitulo: primeiro === ultimo
                ? `${primeiro.periodo_mes}/${primeiro.periodo_ano}`
                : `${primeiro.periodo_mes}/${primeiro.periodo_ano} → ${ultimo.periodo_mes}/${ultimo.periodo_ano}`,
              tipo_alvo: g.tipo_alvo,
            }
          }
        }
        setGoalsAtivas(Object.values(grupos))
      })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId || engineRef.current) return
    engineRef.current = true
    const run = async () => {
      setRunning(true)
      await executarEngine(tenantId)
      setLastRun(new Date())
      setRunning(false)
    }
    run()
    const interval = setInterval(run, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tenantId])

  async function runNow() {
    setRunning(true)
    const n = await executarEngine(tenantId)
    setLastRun(new Date())
    setRunning(false)
    if (n === 0) alert('Nenhum alerta novo gerado.')
    else alert(`${n} alerta(s) gerado(s) com sucesso!`)
  }

  async function handleSave(form) {
    setSaving(true)
    const row = ruleToRow(form, tenantId, activeBranchId)
    if (form.id) {
      const { error } = await supabase.from('alert_rules').update(row).eq('id', form.id)
      if (error) { alert('Erro: ' + error.message); setSaving(false); return }
      setRules(prev => prev.map(r => r.id === form.id ? { ...form } : r))
    } else {
      const { data, error } = await supabase.from('alert_rules').insert(row).select().single()
      if (error) { alert('Erro: ' + error.message); setSaving(false); return }
      setRules(prev => [...prev, rowToRule(data)])
    }
    setSaving(false)
    setEditing(null)
  }

  async function handleRemove(id) {
    const rule = rules.find(r => r.id === id)
    if (rule?.is_system) return
    if (!window.confirm('Excluir esta regra?')) return
    await supabase.from('alert_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function toggleAtivo(rule) {
    await supabase.from('alert_rules').update({ ativo: !rule.ativo }).eq('id', rule.id)
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ativo: !r.ativo } : r))
  }

  async function handleRegenerate(rule) {
    if (!rule.system_key) return
    const defaults = SYSTEM_RULE_DEFAULTS[rule.system_key]
    if (!defaults) return alert('Template padrão não encontrado para esta regra.')
    if (!window.confirm(`Restaurar "${rule.gatilho_nome}" para as configurações originais do sistema?\n\nSuas alterações serão perdidas.`)) return
    const row = {
      gatilho:      defaults.gatilho_nome,
      gatilho_nome: defaults.gatilho_nome,
      origem:       defaults.origem,
      ativo:        true,
      custom_fields: {
        condicoes:  defaults.condicoes.map(c => ({ ...c, id: crypto.randomUUID() })),
        acoes:      defaults.acoes.map(a => ({ ...a, id: crypto.randomUUID() })),
        acoes_else: [],
        com_else:   false,
        metas_ids:  [],
      },
    }
    const { error } = await supabase.from('alert_rules').update(row).eq('id', rule.id)
    if (error) return alert('Erro ao restaurar: ' + error.message)
    const updated = { ...rule, ...defaults, ativo: true }
    setRules(prev => prev.map(r => r.id === rule.id ? updated : r))
  }

  const origemMap = Object.fromEntries(ORIGENS.map(o => [o.key, o.label]))

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rules.filter(r => !q || r.gatilho_nome.toLowerCase().includes(q) || (origemMap[r.origem] || '').toLowerCase().includes(q))
  }, [rules, search, origemMap])

  // ── Tela de edição ──────────────────────────────────────────────────────────
  if (editing) {
    const isNew = !editing.id
    const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px' }
    const secTitle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 14 }

    function doSave() {
      if (!editing.origem)               return alert('Selecione a origem.')
      if (!editing.gatilho_nome?.trim()) return alert('Informe um nome para a regra.')
      if (!editing.acoes?.length)        return alert('Adicione pelo menos uma ação.')
      handleSave(editing)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
        {/* Header */}
        <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              {[
                { label: 'Configurações' },
                { label: 'Alertas', onClick: () => setEditing(null) },
                { label: isNew ? 'Nova regra' : editing.gatilho_nome },
              ].map((crumb, i, arr) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <span style={{ color: 'var(--border2)', fontSize: 12 }}>›</span>}
                  {crumb.onClick
                    ? <button onClick={crumb.onClick} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>{crumb.label}</button>
                    : <span style={{ fontSize: 12, color: i === arr.length - 1 ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === arr.length - 1 ? 500 : 400 }}>{crumb.label}</span>
                  }
                </span>
              ))}
            </nav>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px' }}>
              {isNew ? 'Nova regra de alerta' : editing.gatilho_nome}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editing.id && (
              <button onClick={() => { handleRemove(editing.id); setEditing(null) }}
                style={{ ...btnSm(false), color: 'var(--red, #ef4444)', borderColor: 'var(--red, #ef4444)' }}>
                <Trash2 size={12} strokeWidth={2}/> Excluir
              </button>
            )}
            <button onClick={() => setEditing(null)} style={btnSm(false)}>Cancelar</button>
            <button onClick={doSave} disabled={saving}
              style={{ ...btnSm(true), opacity: saving ? 0.7 : 1, minWidth: 110 }}>
              {saving ? 'Salvando…' : 'Salvar regra'}
            </button>
          </div>
        </div>

        {/* Body — largura total, empilhado */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identidade */}
          <div style={card}>
            <div style={secTitle}>Identidade</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={lbl}>Nome da regra</div>
                <input value={editing.gatilho_nome}
                  onChange={e => setEditing(f => ({ ...f, gatilho_nome: e.target.value }))}
                  style={inp} placeholder="Ex: Contrato vencendo em 30 dias" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', paddingTop: 18 }}>
                <input type="checkbox" checked={editing.ativo}
                  onChange={e => setEditing(f => ({ ...f, ativo: e.target.checked }))} />
                Regra ativa
              </label>
            </div>
          </div>

          {/* Origem */}
          <div style={card}>
            <div style={secTitle}>Origem dos dados</div>
            <Sel value={editing.origem} onChange={v => setEditing(f => ({ ...f, origem: v, condicoes: [newCond()], metas_ids: [] }))}>
              <option value="">Selecione a entidade…</option>
              {ORIGENS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Sel>
            {editing.origem === 'goals' && (() => {
              const selecionadas = editing.metas_ids || []
              const filtradas = goalsAtivas.filter(g => g.titulo?.toLowerCase().includes(goalSearch.toLowerCase()))
              const toggle = key => setEditing(f => {
                const cur = f.metas_ids || []
                return { ...f, metas_ids: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] }
              })
              return (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Aplicar a metas específicas
                  </div>
                  {selecionadas.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {selecionadas.map(key => {
                        const g = goalsAtivas.find(x => x.key === key)
                        return g ? (
                          <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                            {g.titulo}
                            <button onClick={() => toggle(key)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12 }}>×</button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                  <input
                    value={goalSearch} onChange={e => setGoalSearch(e.target.value)}
                    onFocus={() => setGoalDropOpen(true)}
                    onBlur={() => setTimeout(() => setGoalDropOpen(false), 150)}
                    placeholder={selecionadas.length === 0 ? 'Todas as metas ativas (buscar para filtrar)…' : 'Buscar meta…'}
                    style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 4 }}
                  />
                  {(goalDropOpen || goalSearch) && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', maxHeight: 180, overflowY: 'auto' }}>
                      {filtradas.length > 0 && (() => {
                        const todasSel = filtradas.every(g => selecionadas.includes(g.key))
                        return (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', borderBottom: '2px solid var(--border)', fontSize: 12, fontWeight: 600 }}>
                            <input type="checkbox" checked={todasSel}
                              onChange={() => setEditing(f => ({ ...f, metas_ids: todasSel ? (f.metas_ids || []).filter(k => !filtradas.some(g => g.key === k)) : [...new Set([...(f.metas_ids || []), ...filtradas.map(g => g.key)])] }))}
                              style={{ accentColor: 'var(--accent)' }} />
                            {todasSel ? 'Desmarcar todas' : 'Selecionar todas'}
                          </label>
                        )
                      })()}
                      {filtradas.length === 0
                        ? <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhuma meta encontrada</div>
                        : filtradas.map(g => (
                          <label key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            <input type="checkbox" checked={selecionadas.includes(g.key)} onChange={() => toggle(g.key)} style={{ accentColor: 'var(--accent)' }} />
                            <span>
                              {g.titulo}
                              <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>{g.subtitulo}</span>
                            </span>
                          </label>
                        ))
                      }
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {selecionadas.length === 0 ? 'Sem filtro: avalia todas as metas ativas.' : `${selecionadas.length} meta(s) selecionada(s).`}
                  </p>
                </div>
              )
            })()}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              A engine avalia todos os registros desta entidade e dispara o alerta quando as condições forem atendidas.
            </p>
          </div>

          {/* Condições */}
          <div style={card}>
            <div style={secTitle}>Condições</div>
            <CondicoesEditor
              origem={editing.origem}
              condicoes={editing.condicoes}
              onChangeCondicoes={v => setEditing(f => ({ ...f, condicoes: v }))}
            />
          </div>

          {/* Ações SE */}
          <div style={card}>
            <div style={secTitle}>Ações — SE condições atendidas</div>
            <AcoesEditor
              acoes={editing.acoes}
              onChange={v => setEditing(f => ({ ...f, acoes: v }))}
              tenantId={tenantId}
              origem={editing.origem}
            />
          </div>

          {/* Ramificação SENÃO */}
          <div style={{ ...card, borderStyle: 'dashed', borderColor: editing.com_else ? 'color-mix(in srgb, #f59e0b 60%, var(--border))' : 'var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={editing.com_else || false}
                onChange={e => setEditing(f => ({
                  ...f,
                  com_else:   e.target.checked,
                  acoes_else: e.target.checked && !f.acoes_else?.length ? [newAcao()] : f.acoes_else || [],
                }))} />
              <GitBranch size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <span>Ramificação <strong>SENÃO</strong> — ações quando as condições <strong>não</strong> forem atendidas</span>
            </label>
            {editing.com_else && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid color-mix(in srgb, #f59e0b 30%, var(--border))' }}>
                <AcoesEditor
                  acoes={editing.acoes_else || []}
                  onChange={v => setEditing(f => ({ ...f, acoes_else: v }))}
                  tenantId={tenantId}
                  label="Ação SENÃO"
                  origem={editing.origem}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ── Listagem ────────────────────────────────────────────────────────────────
  const COLS = [
    { key: 'gatilho_nome', label: 'Nome', render: (_, r) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.gatilho_nome}</span>
        {r.is_system && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'color-mix(in srgb, #6366f1 12%, transparent)', color: '#6366f1', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
            <Lock size={9} strokeWidth={2.5} /> Sistema
          </span>
        )}
      </span>
    )},
    { key: 'origem',    label: 'Origem',    render: (_, r) => origemMap[r.origem] || r.origem },
    { key: 'condicoes', label: 'Condições', render: (_, r) => {
      const n = (r.condicoes || []).filter(c => c.campo).length
      return `${n} condição(ões)`
    }},
    { key: 'acoes', label: 'Ações', render: (_, r) => {
      const tipos = { notificar: 'Painel', tarefa: 'Tarefa', email: 'Email' }
      const se    = (r.acoes || []).map(a => tipos[a.tipo] || a.tipo).join(' + ')
      const senao = r.com_else && r.acoes_else?.length ? ` / SE NÃO: ${(r.acoes_else || []).map(a => tipos[a.tipo] || a.tipo).join(' + ')}` : ''
      return se + senao
    }},
    { key: 'ativo', label: 'Status', render: (_, r) => (
      <button onClick={e => { e.stopPropagation(); toggleAtivo(r) }}
        style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: r.ativo ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface2)',
          color: r.ativo ? 'var(--accent)' : 'var(--text-muted)' }}>
        {r.ativo ? 'Ativa' : 'Inativa'}
      </button>
    )},
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: running ? 'var(--accent)' : '#22c55e', flexShrink: 0, display: 'inline-block' }} />
        <span>
          {running ? 'Avaliando regras…' : lastRun ? `Engine rodou às ${lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Engine aguardando…'}
        </span>
        <button onClick={runNow} disabled={running} style={{ ...btnSm(false), padding: '2px 10px', fontSize: 10, marginLeft: 4 }}>
          {running ? 'Rodando…' : 'Rodar agora'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <SettingsLayout
          title="Alertas"
          description="Regras automáticas que geram notificações no painel, enviam e-mails ou criam tarefas."
          columns={COLS} data={filtered} keyField="id"
          loading={loading} search={search} onSearchChange={setSearch}
          newLabel="Nova regra" onNew={() => setEditing(emptyRule())}
          emptyLabel="Nenhuma regra de alerta configurada."
          onRowClick={r => setEditing(r)}
          rowActions={r => r.is_system
            ? [
                { label: 'Editar', onClick: () => setEditing(r) },
                { label: r.ativo ? 'Inativar' : 'Ativar', onClick: () => toggleAtivo(r) },
                ...(r.system_key && SYSTEM_RULE_DEFAULTS[r.system_key]
                  ? [{ label: 'Restaurar padrão', icon: <RotateCcw size={12} />, onClick: () => handleRegenerate(r) }]
                  : []),
              ]
            : [
                { label: 'Editar',  onClick: () => setEditing(r) },
                { label: 'Excluir', danger: true, onClick: () => handleRemove(r.id) },
              ]
          }
        />
      </div>
    </div>
  )
}
