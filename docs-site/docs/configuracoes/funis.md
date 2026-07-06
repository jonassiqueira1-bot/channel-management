---
id: funis
title: Funis de Vendas
---

# Funis de Vendas


---

## O que é

Configura os funis do Pipeline de Vendas — cada funil tem suas próprias etapas e representa um fluxo de negociação diferente (ex: Venda Direta, Venda via Canal, Renovação).

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de funis com: Nome, número de etapas, Status e indicação de Funil Padrão.

---

## Como usar

### Criar funil

1. Clique em **Novo Funil**
2. Preencha:
   - **Nome** (obrigatório)
   - **Status** — Ativo ou Inativo
   - **Funil Padrão** — se ativado, este funil é selecionado automaticamente ao criar oportunidades
   - **Descrição**
3. Na seção **Etapas do funil**, adicione as etapas em ordem:
   - Cada etapa tem Nome e percentual de probabilidade de fechamento
   - Reordene arrastando as etapas
4. A seção **Preview do pipeline** mostra como o funil ficará visualmente
5. Salva

### Editar ou remover

Clique na linha do funil → formulário com os mesmos campos.

---

## Regras de negócio

- Apenas um funil pode ser definido como **Padrão** — ao marcar um novo, o anterior perde o status
- Funis inativos não aparecem no Pipeline para novas oportunidades
- Oportunidades existentes vinculadas a um funil inativo continuam funcionando normalmente
- A ordem das etapas determina o fluxo do kanban no Pipeline
