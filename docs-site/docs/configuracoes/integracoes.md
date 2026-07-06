---
id: integracoes
title: Integrações
---

# Integrações


---

## O que é

Conecta o Boostly a sistemas externos para sincronização automática de leads, oportunidades e notificações. Cada integração tem seu próprio fluxo de configuração.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Cards das integrações disponíveis com status de conexão (Conectado / Não conectado).

### Integrações disponíveis

| Integração | O que faz |
|-----------|-----------|
| **RD Station Marketing** | Importa leads e conversões como oportunidades no Pipeline |
| **HubSpot** | Sincronização bidirecional de contatos, negócios e pipeline |
| **Webhook Genérico** | Recebe eventos externos via HTTP POST de qualquer sistema |
| **Pipedrive** | Importação de negócios e atualização de estágio do pipeline |
| **Slack** | Notificações automáticas em canais para alertas e eventos críticos |
| **Zapier** | Conecta mais de 5.000 apps via automações sem código |

---

## Como usar

### Conectar uma integração

1. Clique no card da integração desejada
2. Preencha as credenciais ou configurações específicas (varia por integração)
3. Para integrações via **Webhook**: uma URL exclusiva é gerada — configure-a como destino no sistema externo
4. Salva

### Desconectar

No formulário da integração conectada, clique em **Desconectar**.

### Visualizar logs da integração

Dentro do formulário de cada integração há uma aba **Logs** com o histórico de eventos recebidos e sincronizações realizadas.

---

## Regras de negócio

- Cada tenant tem uma configuração independente por integração
- A URL de webhook é única por integração e tenant — não compartilhe com outras integrações
- Os logs de webhook ficam disponíveis por 90 dias
