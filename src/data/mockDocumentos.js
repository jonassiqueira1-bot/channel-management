// ─── Mock: Módulo de Documentos ───────────────────────────────────────────────

export const STORAGE_KEY_DOCS = 'documentos:templates_v1'
export const STORAGE_KEY_LOGS = 'documentos:logs_v1'

export const CATEGORIA_CFG = {
  proposta:      { label: 'Proposta Comercial', icon: '📄', color: 'var(--accent)', bg: '#EEF2FF', text: '#3730A3' },
  apresentacao:  { label: 'Apresentação',       icon: '📊', color: '#3B82F6', bg: '#DBEAFE', text: '#1E3A5F' },
  contrato:      { label: 'Contrato',           icon: '📝', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  nda:           { label: 'NDA / Sigilo',       icon: '🔒', color: 'var(--accent)', bg: '#EDE9FE', text: '#5B21B6' },
  onboarding:    { label: 'Onboarding',         icon: '🚀', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  outro:         { label: 'Outro',              icon: '📌', color: '#6B7280', bg: '#F3F4F6', text: '#374151' },
}

export const STATUS_CFG = {
  rascunho:  { label: 'Rascunho',  dot: '#9CA3AF', bg: '#F3F4F6', text: '#374151' },
  ativo:     { label: 'Ativo',     dot: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  arquivado: { label: 'Arquivado', dot: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
}

export const EVENTO_CFG = {
  criado:     { icon: '✦', label: 'Documento criado',   color: '#10B981', bg: '#D1FAE5' },
  editado:    { icon: '✎', label: 'Dados alterados',    color: '#3B82F6', bg: '#DBEAFE' },
  publicado:  { icon: '◉', label: 'Publicado / Ativo',  color: 'var(--accent)', bg: '#EEF2FF' },
  arquivado:  { icon: '⊘', label: 'Arquivado',          color: '#EF4444', bg: '#FEE2E2' },
  restaurado: { icon: '↺', label: 'Restaurado',         color: '#F59E0B', bg: '#FEF3C7' },
}

// ─── Templates ────────────────────────────────────────────────────────────────
export const MOCK_DOCS = [
  {
    id: 'doc-1',
    tenant_id: 't1',
    title: 'Proposta Comercial — Boostly Pro',
    description: 'Modelo padrão de proposta para novos parceiros. Inclui apresentação da solução, preços e condições de implantação.',
    categoria: 'proposta',
    status: 'ativo',
    version: 3,
    content: `# Proposta Comercial — {{EMPRESA}}

**Oportunidade:** {{OPORTUNIDADE}}
**Responsável:** {{RESPONSAVEL}}
**Contato principal:** {{CONTATO}}
**Prazo de fechamento:** {{PRAZO}}

---

## Apresentação

A {{EMPRESA}} tem o prazer de receber a proposta para implantação do Boostly Pro, plataforma especializada em gestão de redes de parceiros ISV.

## Solução Proposta

**Módulo Boostly Pro** inclui:
- Gestão de Pipeline e Funil de Vendas
- Controle de Metas e Comissões
- Módulo de Projetos e Cronograma
- Relatórios de Performance

## Investimento

| Item              | Valor Mensal     |
|-------------------|-----------------|
| CDU (por usuário) | {{VALOR_CDU}}   |
| SMS               | {{VALOR_SMS}}   |
| Serviço / Implant.| {{VALOR_SERVICO}}|
| **Total Líquido** | **{{VALOR_TOTAL}}** |

## Condições

- Contrato de 12 meses com renovação automática
- Suporte incluso no plano
- Treinamento inicial de até 8 horas

## Próximos Passos

1. Aprovação da proposta por {{CONTATO}}
2. Assinatura do contrato
3. Kickoff de implantação com {{RESPONSAVEL}}`,
    created_by: 'Admin',
    created_at: '2026-04-01T10:00:00',
    updated_at: '2026-05-20T14:30:00',
  },
  {
    id: 'doc-2',
    tenant_id: 't1',
    title: 'Contrato de Parceria — Franquia',
    description: 'Contrato padrão de parceria para novos franqueados, incluindo cláusulas de exclusividade territorial e metas mínimas.',
    categoria: 'contrato',
    status: 'ativo',
    version: 2,
    content: `# Contrato de Parceria Comercial

## Partes

**CONTRATANTE:** [NOME DO ISV], inscrita no CNPJ n.º XX.XXX.XXX/0001-XX
**CONTRATADO:** [NOME DA FRANQUIA], inscrita no CNPJ n.º XX.XXX.XXX/0001-XX

## Objeto

O presente contrato tem por objeto a formalização da parceria comercial para distribuição e comercialização dos produtos e serviços do CONTRATANTE na região de [REGIÃO].

## Obrigações do Contratado

1. Manter metas mínimas mensais de R$ X.XXX,00 em receita recorrente
2. Participar dos treinamentos obrigatórios
3. Utilizar materiais de marketing aprovados
4. Respeitar a política de preços mínimos

## Vigência

12 (doze) meses, com renovação automática, salvo notificação contrária com 30 dias de antecedência.

## Comissões

| Faixa de MRR     | Comissão |
|------------------|----------|
| Até R$ 10.000    | 20%      |
| R$ 10.001–30.000 | 25%      |
| Acima de R$ 30.000 | 30%   |`,
    created_by: 'Admin',
    created_at: '2026-04-10T09:00:00',
    updated_at: '2026-06-01T11:15:00',
  },
  {
    id: 'doc-3',
    tenant_id: 't1',
    title: 'Deck de Apresentação Institucional',
    description: 'Apresentação institucional do Boostly para uso em reuniões com prospects e eventos.',
    categoria: 'apresentacao',
    status: 'ativo',
    version: 5,
    content: `# Boostly — Apresentação Institucional

## Sobre Nós

O Boostly é a plataforma líder em gestão de redes de parceiros ISV no Brasil, com mais de [X] parceiros ativos em [X] estados.

## Nossos Diferenciais

✓ Plataforma all-in-one para gestão de canal
✓ Onboarding rápido (48h)
✓ Suporte dedicado ao parceiro
✓ Relatórios de performance em tempo real

## Números

- [X]+ parceiros ativos
- [X]% de retenção anual
- NPS médio de [X]

## Módulos da Plataforma

1. **Pipeline** — Gestão de oportunidades e funil de vendas
2. **Projetos** — Acompanhamento de implantações
3. **Metas** — Controle de metas e comissões
4. **Questionários** — Diagnósticos e pré-vendas

## Planos e Preços

[A ser personalizado conforme perfil do prospect]

## Contato

[Nome do responsável]
[Email] | [Telefone]`,
    created_by: 'Mariana Silva',
    created_at: '2026-03-15T08:00:00',
    updated_at: '2026-06-05T16:00:00',
  },
  {
    id: 'doc-4',
    tenant_id: 't1',
    title: 'NDA — Acordo de Não Divulgação',
    description: 'Acordo de confidencialidade padrão para parceiros em fase de avaliação da plataforma.',
    categoria: 'nda',
    status: 'ativo',
    version: 1,
    content: `# Acordo de Não Divulgação (NDA)

## Partes

**Parte Divulgadora:** [NOME DO ISV]
**Parte Receptora:** [NOME DA EMPRESA PARCEIRA]

## Informações Confidenciais

Para os fins deste Acordo, "Informações Confidenciais" significam toda e qualquer informação técnica, comercial, financeira ou de negócios divulgada pela Parte Divulgadora, incluindo, mas não se limitando a:

- Dados de clientes e prospects
- Estratégias comerciais e de pricing
- Tecnologia, código-fonte e arquitetura de sistemas
- Resultados financeiros e projeções

## Obrigações

A Parte Receptora se compromete a:
1. Manter sigilo absoluto sobre todas as Informações Confidenciais
2. Não reproduzir, copiar ou distribuir as informações sem autorização
3. Limitar o acesso apenas a funcionários com necessidade direta

## Vigência

Este Acordo tem vigência de 2 (dois) anos a partir da data de assinatura.

## Penalidades

O descumprimento deste Acordo sujeitará a Parte Receptora ao pagamento de multa de R$ XX.XXX,00, além de perdas e danos apurados judicialmente.`,
    created_by: 'Admin',
    created_at: '2026-05-01T10:00:00',
    updated_at: '2026-05-01T10:00:00',
  },
  {
    id: 'doc-5',
    tenant_id: 't1',
    title: 'Roteiro de Onboarding — Novos Parceiros',
    description: 'Documento guia para o processo de integração de novos parceiros, com checklist e cronograma sugerido.',
    categoria: 'onboarding',
    status: 'rascunho',
    version: 1,
    content: `# Roteiro de Onboarding — Novos Parceiros

## Visão Geral

Este documento descreve o processo padrão de integração de novos parceiros à rede Boostly, cobrindo as 4 semanas iniciais.

## Semana 1 — Kickoff

- [ ] Reunião de kickoff com time de CS
- [ ] Cadastro no sistema e criação de usuários
- [ ] Envio de credenciais de acesso
- [ ] Configuração inicial do ambiente

## Semana 2 — Treinamento

- [ ] Treinamento: Pipeline e Funil de Vendas (2h)
- [ ] Treinamento: Clientes e Contatos (1h)
- [ ] Treinamento: Projetos e Tarefas (2h)
- [ ] Teste de acesso e validação

## Semana 3 — Operação Assistida

- [ ] Acompanhamento das primeiras oportunidades
- [ ] Revisão do pipeline junto ao gestor de canal
- [ ] Ajuste de configurações personalizadas

## Semana 4 — Go Live

- [ ] Validação de todos os módulos
- [ ] Entrega de materiais de apoio
- [ ] Definição de cadência de acompanhamento mensal
- [ ] Pesquisa de satisfação NPS`,
    created_by: 'Carla Menezes',
    created_at: '2026-06-08T09:00:00',
    updated_at: '2026-06-08T09:00:00',
  },
]

// ─── Logs de alteração ────────────────────────────────────────────────────────
// campos: [{ campo, de, para }]
export const MOCK_LOGS = [
  // doc-1
  { id: 'l101', doc_id: 'doc-1', evento: 'criado',    campos: [], usuario: 'Admin', criado_em: '2026-04-01T10:00:00' },
  { id: 'l102', doc_id: 'doc-1', evento: 'editado',   campos: [{ campo: 'Título', de: 'Proposta Comercial', para: 'Proposta Comercial — Boostly Pro' }, { campo: 'Descrição', de: '—', para: 'Modelo padrão de proposta para novos parceiros' }], usuario: 'Admin', criado_em: '2026-04-15T11:20:00' },
  { id: 'l103', doc_id: 'doc-1', evento: 'publicado', campos: [{ campo: 'Status', de: 'Rascunho', para: 'Ativo' }], usuario: 'Mariana Silva', criado_em: '2026-04-20T09:00:00' },
  { id: 'l104', doc_id: 'doc-1', evento: 'editado',   campos: [{ campo: 'Conteúdo', de: 'v1', para: 'v2 — Tabela de preços atualizada' }], usuario: 'Mariana Silva', criado_em: '2026-05-05T14:00:00' },
  { id: 'l105', doc_id: 'doc-1', evento: 'editado',   campos: [{ campo: 'Conteúdo', de: 'v2', para: 'v3 — Módulo de Projetos incluído na proposta' }, { campo: 'Versão', de: '2', para: '3' }], usuario: 'Admin', criado_em: '2026-05-20T14:30:00' },

  // doc-2
  { id: 'l201', doc_id: 'doc-2', evento: 'criado',    campos: [], usuario: 'Admin', criado_em: '2026-04-10T09:00:00' },
  { id: 'l202', doc_id: 'doc-2', evento: 'editado',   campos: [{ campo: 'Cláusula de Comissões', de: 'Tabela antiga', para: 'Tabela com 3 faixas' }, { campo: 'Versão', de: '1', para: '2' }], usuario: 'Admin', criado_em: '2026-06-01T11:15:00' },
  { id: 'l203', doc_id: 'doc-2', evento: 'publicado', campos: [{ campo: 'Status', de: 'Rascunho', para: 'Ativo' }], usuario: 'Admin', criado_em: '2026-06-01T11:16:00' },

  // doc-3
  { id: 'l301', doc_id: 'doc-3', evento: 'criado',    campos: [], usuario: 'Mariana Silva', criado_em: '2026-03-15T08:00:00' },
  { id: 'l302', doc_id: 'doc-3', evento: 'editado',   campos: [{ campo: 'Seção Números', de: '—', para: 'Adicionada seção de métricas da plataforma' }], usuario: 'Mariana Silva', criado_em: '2026-03-28T10:00:00' },
  { id: 'l303', doc_id: 'doc-3', evento: 'publicado', campos: [{ campo: 'Status', de: 'Rascunho', para: 'Ativo' }], usuario: 'Mariana Silva', criado_em: '2026-04-01T08:30:00' },
  { id: 'l304', doc_id: 'doc-3', evento: 'editado',   campos: [{ campo: 'Planos e Preços', de: 'Valores fixos', para: 'Personalizado por perfil' }], usuario: 'Admin', criado_em: '2026-05-10T15:00:00' },
  { id: 'l305', doc_id: 'doc-3', evento: 'editado',   campos: [{ campo: 'Módulos listados', de: '3 módulos', para: '4 módulos — Questionários adicionado' }, { campo: 'Versão', de: '4', para: '5' }], usuario: 'Mariana Silva', criado_em: '2026-06-05T16:00:00' },

  // doc-4
  { id: 'l401', doc_id: 'doc-4', evento: 'criado',    campos: [], usuario: 'Admin', criado_em: '2026-05-01T10:00:00' },
  { id: 'l402', doc_id: 'doc-4', evento: 'publicado', campos: [{ campo: 'Status', de: 'Rascunho', para: 'Ativo' }], usuario: 'Admin', criado_em: '2026-05-01T10:05:00' },

  // doc-5
  { id: 'l501', doc_id: 'doc-5', evento: 'criado', campos: [], usuario: 'Carla Menezes', criado_em: '2026-06-08T09:00:00' },
]
