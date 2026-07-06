# Customer Success

**Rota:** `/customer-success`
**Arquivo:** `src/pages/CustomerSuccess.js`

---

## O que é

Acompanha a saúde dos clientes pós-venda usando o framework LAER (Land, Adopt, Expand, Renew). Cada parceiro tem um health score, plano de ação e histórico de check-ins.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `cs` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de clientes com: Nome, CSM responsável, Estágio LAER, Modelo de toque, Health Score (0–100) e data de renovação.

O health score é exibido como anel colorido:
- **Verde** (≥ 80) — saudável
- **Amarelo** (50–79) — atenção
- **Vermelho** (< 50) — em risco

---

## Como usar

### Criar registro de saúde

1. Clique em **Novo**
2. Preencha: empresa, CSM responsável, estágio LAER, modelo de toque, health score e data de renovação
3. Adicione notas de contexto
4. Salva

### Gerenciar plano de ação

Dentro do registro, adicione itens ao plano de ação com descrição e marque como concluído conforme avançam.

### Registrar check-in

Dentro do registro, clique em **Novo check-in** e informe data, tipo (Reunião, E-mail, Ligação, etc.) e resumo do contato.

### Adicionar anexos

Faça upload de documentos relevantes (atas, relatórios, propostas de renovação) dentro do registro.

---

## Regras de negócio

- Cada empresa parceira pode ter um único registro de saúde ativo
- O health score é atualizado manualmente pelo CSM responsável
- Clientes com renovação próxima podem disparar alertas se configurado em `/settings/alertas`
