---
id: pipeline
title: Pipeline de Vendas
---

# Pipeline de Vendas


---

## O que é

Gerencia as oportunidades de venda em formato kanban, organizadas por funil e etapas. É o módulo central do ciclo comercial do canal.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor` | Acesso total à sua filial |
| `parceiro` | Acesso às próprias oportunidades |

---

## O que mostra

Kanban com colunas representando as etapas do funil selecionado. Cada card exibe: empresa, valor, responsável, prazo e origem.

Barra de métricas no topo: total de oportunidades, valor total, ticket médio e taxa de conversão.

---

## Como usar

### Criar oportunidade

1. Clique em **+** na coluna desejada ou no botão **Nova oportunidade**
2. Preencha:
   - Título, Empresa, Contato principal
   - Funil e Etapa
   - Valor total e breakdown (CDU, SMS, Serviços, Desconto)
   - Origem: Inbound, Outbound, Canal, Indicação, Evento ou Prospecção
   - Responsável e Prazo
   - Playbook vinculado *(opcional)*
3. Salva

### Avançar etapa

Arraste o card entre colunas ou edite a etapa dentro do formulário da oportunidade.

### Marcar como ganha ou perdida

Dentro do formulário da oportunidade, clique em **Ganha** ou **Perdida**.
- **Ganha** → opção de criar projeto automaticamente na fase Iniciação
- **Perdida** → campo de motivo de perda obrigatório

### Registrar atividade

Dentro do card, acesse a aba de atividades para registrar ligações, e-mails, reuniões, visitas, propostas e follow-ups com data e descrição.

### Adicionar tarefa

Dentro do card, crie tarefas vinculadas à oportunidade com prazo e responsável.

### Trocar funil

Use o seletor de funil no topo da tela para alternar entre os funis ativos.

---

## Regras de negócio

- Cada oportunidade pertence a um único funil
- Ao marcar como **Ganha**, o sistema oferece criação automática de projeto
- Ao marcar como **Perdida**, o motivo é obrigatório
- O valor total é calculado automaticamente somando os itens do breakdown
- Usuário `parceiro` só vê oportunidades vinculadas ao seu seller
