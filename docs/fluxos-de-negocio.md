# Fluxos de Negócio

Visão funcional dos módulos do sistema — o que cada um faz, como os dados se conectam e quais são as entidades envolvidas.

---

## Pipeline de Vendas

Módulo central do sistema. Gerencia oportunidades de venda organizadas em funis com etapas configuráveis.

### Estrutura de dados

```
Funil (funnels)
  └── Etapas (funnel_stages)
        └── Oportunidades (oportunidades)
              ├── Empresa (companies)
              ├── Contato principal (contacts)
              ├── Tarefas vinculadas (tasks)
              ├── Membros (opp_members)
              ├── Playbook vinculado (playbooks)
              └── Campos customizados (jsonb)
```

### Campos da oportunidade

| Campo | Descrição |
|-------|-----------|
| `titulo` | Nome da oportunidade |
| `funil_id` | Funil ao qual pertence |
| `stage_id` | Etapa atual dentro do funil |
| `valor` | Valor total do negócio |
| `valor_cdu`, `valor_sms`, `valor_servico` | Breakdown do valor por categoria |
| `valor_desconto` | Desconto aplicado |
| `origem` | Canal de origem: Inbound, Outbound, Canal, Indicação, Evento, Prospecção |
| `situacao` | `em_andamento`, `ganho`, `perdido` |
| `prazo` | Data prevista de fechamento |
| `responsavel` | Nome do responsável |
| `motivo_perda` | Preenchido ao marcar como perdida |
| `proxima_acao_data` | Data da próxima ação agendada |

### Ciclo de vida de uma oportunidade

```
Criação → [Etapa 1] → [Etapa 2] → ... → [Etapa N]
                                              │
                                    ┌─────────┴──────────┐
                                  Ganho               Perdido
                                    │                    │
                            Contrato gerado      Motivo registrado
```

### Playbook integrado

Cada oportunidade pode ter um playbook vinculado. O playbook define um roteiro de etapas (checklist) que o vendedor deve seguir durante a negociação. O progresso do playbook é acompanhado dentro do card da oportunidade.

---

## Tarefas

Motor de execução do sistema. Praticamente todos os módulos geram ou consomem tarefas.

### Vínculos possíveis

Uma tarefa pode estar vinculada a qualquer entidade via `entidade_tipo` + `entidade_id`:

| `entidade_tipo` | Origem |
|----------------|--------|
| `oportunidade` | Pipeline |
| `seller` | Contatos de Canal |
| `company` | Empresas parceiras |
| `project` | Projetos |
| `alert` | Gerada automaticamente pelo motor de alertas |

### Campos principais

| Campo | Valores |
|-------|---------|
| `tipo` | Ligação, Email, Reunião, Visita, Proposta, Follow-up |
| `status` | `pendente`, `em_andamento`, `concluida`, `cancelada` |
| `prioridade` | `baixa`, `media`, `alta`, `urgente` |
| `prazo` | Data limite |
| `responsavel` | Usuário responsável pela execução |

### Tarefas geradas automaticamente

O motor de alertas (`process-alerts`) pode criar tarefas automaticamente quando uma regra de alerta dispara com ação do tipo `tarefa`. Isso fecha o ciclo: alerta detectado → tarefa criada → execução rastreada.

---

## Alertas (Motor de Regras)

Sistema de regras configuráveis que monitora dados e dispara ações automaticamente.

### Arquitetura

```
Regras (alerts_rules)
  ├── Origem: qual tabela monitorar
  ├── Condições: filtros sobre os campos da origem
  └── Ações: o que fazer quando as condições são atendidas
        ├── notificar  → cria registro em alerts (painel in-app)
        ├── email      → chama Edge Function send-email
        └── tarefa     → cria registro em tasks
```

### Origens monitoradas

| Origem | Tabela | Exemplos de uso |
|--------|--------|----------------|
| Oportunidades | `oportunidades` | Oportunidade parada há N dias, prazo vencendo |
| Contratos | `contracts` | Contrato vencendo em N dias |
| Projetos | `projects` | Projeto atrasado |
| Tarefas | `tasks` | Tarefa vencida |
| Pagamentos | `commission_payments` | Pagamento em atraso |
| Empresas | `companies` | Empresa sem atividade |
| Metas & KPIs | `goals` | Meta abaixo do threshold |

### Condições

Cada regra tem uma lista de condições com operador lógico global (`E` / `OU`):

```
campo      operador       valor
updated_at  há mais de    7 dias
valor       maior que     50000
situacao    igual a       em_andamento
```

Campos disponíveis por origem incluem campos padrão da tabela + campos customizados cadastrados pelo tenant.

### Ações

| Tipo | O que faz |
|------|-----------|
| `notificar` | Cria alerta no painel in-app (tabela `alerts`) |
| `email` | Envia e-mail via Edge Function `send-email` |
| `tarefa` | Cria tarefa vinculada à entidade que disparou o alerta |

Destinatários configuráveis: responsável pelo registro, responsável da tarefa, contato da empresa, ou e-mail fixo.

### Painel de alertas (inbox)

Alertas gerados ficam visíveis em um painel flutuante dentro do sistema. Cada alerta pode ser marcado como resolvido. Alertas duplicados para a mesma entidade dentro de 3 dias são suprimidos automaticamente.

---

## Customer Success

Gerenciamento da saúde dos clientes pós-venda usando o framework **LAER**.

### Framework LAER

| Estágio | Descrição |
|---------|-----------|
| **Land** | Cliente recém-adquirido, em processo de onboarding |
| **Adopt** | Cliente usando o produto, sendo guiado na adoção |
| **Expand** | Cliente expandindo uso para mais áreas ou filiais |
| **Renew** | Cliente próximo da renovação de contrato |

### Modelos de toque

| Modelo | Perfil |
|--------|--------|
| Tech-Touch | Clientes menores, atendimento automatizado |
| Mid-Touch | Clientes médios, mix de automação e contato humano |
| High-Touch | Clientes estratégicos, CSM dedicado |

### Health Score

Cada cliente tem um **health score** de 0–100 calculado com base em:
- Engajamento com o produto
- Progresso no plano de ação
- Frequência de check-ins
- Proximidade da renovação

| Score | Status |
|-------|--------|
| ≥ 80 | Verde — saudável |
| 50–79 | Amarelo — atenção |
| < 50 | Vermelho — em risco |

### Estrutura de dados por cliente

```
customer_health
  ├── laer_stage
  ├── touch_model
  ├── health_score
  ├── renewal_date
  ├── csm (Customer Success Manager)
  ├── action_plans[]   — plano de ação com checklist
  └── checkins[]       — histórico de contatos (data, tipo, resumo)
```

---

## Ações de Canal

Ações de marketing e capacitação direcionadas aos parceiros.

### Tipos de ação

| Tipo | Exemplos |
|------|---------|
| Treinamento | Workshop de produto, certificação |
| Evento | Roadshow, summit de parceiros |
| Campanha | Incentivo de vendas, SPIFs |
| Webinar | Apresentação de novidades, cases |
| Visita | Visita técnica ou comercial ao parceiro |

### Campos principais

| Campo | Descrição |
|-------|-----------|
| `empresa_id` | Empresa parceira alvo |
| `tipo` | Tipo de ação |
| `data_inicio` / `data_fim` | Período da ação |
| `vagas` / `inscritos` | Controle de participação |
| `status` | `agendado`, `em_andamento`, `concluido`, `cancelado` |
| `responsavel` | Usuário responsável pela execução |

---

## Empresas Parceiras (Companies)

Cadastro das empresas do canal: revendedores, distribuidores, integradores.

### Hierarquia

```
Tenant (ISV)
  └── Branch (Filial do ISV)
        └── Company (Empresa Parceira)
              ├── Sellers (Contatos de Canal)
              ├── Oportunidades
              ├── Contratos
              ├── Projetos
              └── Usuários parceiro (profiles com role='parceiro')
```

---

## Sellers (Contatos de Canal)

Pessoas físicas ou jurídicas vinculadas a uma empresa parceira. São o ponto de partida para o fluxo de convite do Portal do Parceiro.

### Vínculo com usuário parceiro

```
Seller (sellers)
  └── contact_id referenciado em profiles
        └── profiles.role = 'parceiro'
              └── branch_id herdado de sellers.branch_id
```

Quando o seller é deletado (soft ou hard delete), o trigger `on_seller_delete` marca o profile vinculado como `inativo`, bloqueando o acesso do usuário parceiro automaticamente.

---

## Comissões

Cálculo e aprovação de comissões para vendedores e parceiros.

### Fluxo

```
Oportunidade Ganha
  → Cálculo de comissão (commission_payments)
       ├── Aprovação pelo admin
       └── Pagamento registrado
```

### Status de pagamento

`calculado` → `aprovado` → `pago`

---

## Projetos

Gestão de projetos de implementação após venda.

### Estrutura

```
Projeto (projects)
  ├── Fases (project_phases)
  │     └── Tarefas de fase
  ├── Membros (project_members)
  ├── Issues (project_issues)
  │     └── Anexos (project_attachments)
  └── Timelogs (timelogs) — fechamento de horas
```

---

## Conexões entre módulos

```
Seller ──────────────────── convida ──→ Usuário Parceiro
  │
  └── vinculado a ──→ Company
                          │
              ┌───────────┼───────────┐
              │           │           │
         Oportunidade  Contrato   Projeto
              │
         ┌────┴────┐
       Tarefa    Alerta
              │
           Ação (CS / Marketing)
```

Os módulos se conectam via `entidade_tipo` + `entidade_id`, permitindo que tarefas, alertas e logs de auditoria referenciem qualquer entidade do sistema sem acoplamento rígido entre tabelas.
