---
id: projetos
title: Projetos
---

# Projetos


---

## O que é

Gestão de projetos de implementação pós-venda em formato kanban, com fases baseadas na metodologia MIT. Vinculado ao Pipeline — projetos podem ser criados automaticamente ao ganhar uma oportunidade.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `projetos` | Acesso à filial |
| Demais papéis | Sem acesso direto |

---

## O que mostra

Kanban com colunas representando as fases do projeto. Cada card exibe: nome do projeto, empresa, responsável, criticidade e progresso.

---

## Fases do projeto (metodologia MIT)

| Fase | Descrição |
|------|-----------|
| Iniciação | Projeto recém-criado, planejamento inicial |
| Modelagem | Levantamento de requisitos e configuração |
| Implantação | Configuração e desenvolvimento |
| Treinamento | Capacitação dos usuários |
| Go-Live | Entrada em produção |
| Encerramento | Conclusão e entrega formal |

---

## Como usar

### Criar projeto

1. Clique em **+** na coluna desejada ou em **Novo Projeto**
2. Preencha: nome, empresa, responsável, fase inicial, criticidade e datas
3. Vincule a uma oportunidade ganha *(opcional)*
4. Adicione membros da equipe
5. Salva

### Avançar fase

Arraste o card para a próxima coluna ou edite a fase dentro do formulário.

### Registrar issues

Dentro do projeto, registre problemas e impedimentos com descrição e anexos.

### Importar do MS Project

Clique em **Importar .xml** dentro do projeto para importar tarefas e fases de um arquivo exportado pelo MS Project.

### Abas internas do projeto

Ao abrir um projeto, um painel lateral organiza o detalhe em abas:

| Aba | O que é |
|-----|---------|
| Projeto | Dados gerais, fase atual, criticidade e equipe |
| Cronograma MIT | Tarefas e datas organizadas pela metodologia MIT, com suporte a importação do MS Project |
| Proposta | Proposta comercial vinculada ao projeto (mesma origem da aba **Propostas**) |
| Timesheet | Lançamento de horas trabalhadas por membro da equipe |
| Financeiro | Custos, receita contratada e margem do projeto |
| Bloqueios | Issues/impedimentos registrados, com status aberto/resolvido |
| Documentos | Anexos vinculados ao projeto |

---

## Aba: Propostas

Gerencia as propostas comerciais vinculadas ao projeto, antes ou durante a implementação.

- Crie propostas com itens, valores e condições
- Vincule a proposta ao projeto e à empresa
- Acompanhe o status: Rascunho → Enviada → Aprovada → Recusada

---

## Aba: Recursos

Visão de alocação da equipe nos projetos ativos.

- Exibe os membros com papel `projetos` ou `admin_isv` cadastrados no sistema
- Mostra a disponibilidade semanal de cada recurso (configurada no cadastro do usuário em **Configurações → Usuários → Horas/semana**)
- Permite visualizar sobrecargas e redistribuir tarefas entre membros

---

## Aba: Financeiro

Acompanhamento financeiro do projeto: custos, receitas e margem.

- Registre custos de implementação (horas, fornecedores, despesas)
- Visualize o valor contratado vs. custo real
- Margem calculada automaticamente por projeto

---

## Aba: Fechamento

Consolida as horas trabalhadas no projeto para geração do fechamento mensal.

- Exibe o total de horas lançadas por membro no período
- Permite validar e aprovar o fechamento antes de gerar o faturamento
- Integrado com **Fechamento de Horas** para consolidação geral

---

## Regras de negócio

- Projetos podem ser criados automaticamente ao marcar uma oportunidade como **Ganha** no Pipeline
- A criticidade (Baixa, Média, Alta, Crítica) é usada para priorização na visão kanban
- Issues e anexos ficam vinculados ao projeto permanentemente
- A aba Recursos exibe apenas usuários com papel `projetos` ou `admin_isv`
