---
id: pagamentos
title: Pagamentos
---

# Pagamentos


---

## O que é

Controle dos pagamentos e cobranças vinculados aos contratos. Registra recebimentos, gera provisões e processa comissões automaticamente ao confirmar um pagamento.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de pagamentos com: Contrato, Empresa, Mês de referência, Valor, Status e data de vencimento.

---

## Como usar

### Lançar pagamento manual

1. Clique em **Novo Pagamento**
2. Selecione o contrato e mês de referência
3. Informe o valor e data de vencimento
4. Salva

### Confirmar recebimento

Clique na linha do pagamento → **Confirmar recebimento**. Ao confirmar:
- O status muda para **Recebido**
- Comissões são calculadas e geradas automaticamente
- Repasses são calculados conforme as regras de comissão vigentes

### Ver detalhes

Clique na linha para expandir: histórico de pagamentos do contrato, comissões geradas e repasses calculados.

---

## Aba: Provisões

Exibe as provisões financeiras geradas automaticamente na ativação de contratos — valores esperados de receita antes da confirmação efetiva do recebimento.

### O que mostra

Lista de provisões com: Empresa, Contrato, Produto, Mês de referência, Valor líquido e Status.

### Como usar

- Provisões são criadas automaticamente ao ativar um contrato
- Ao confirmar o recebimento em **Pagamentos**, a provisão correspondente é liquidada
- Provisões não liquidadas podem ser filtradas para identificar contratos sem recebimento no período

### Diferença entre Pagamentos e Provisões

| | Pagamentos | Provisões |
|---|---|---|
| Origem | Manual ou importação | Automática (ativação de contrato) |
| Status | Pendente → Recebido | Pendente → Liquidada |
| Comissão | Gerada ao confirmar | Não gera comissão diretamente |

---

## Regras de negócio

- A confirmação de recebimento é irreversível — verifique os dados antes de confirmar
- As comissões geradas seguem as **Regras de Comissão** configuradas em `/comissoes`
- Pagamentos em atraso disparam alertas se configurado em `/settings/alertas`
- Provisões não aparecem na lista de Pagamentos — são gerenciadas na aba própria
