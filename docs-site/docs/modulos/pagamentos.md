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

## Regras de negócio

- A confirmação de recebimento é irreversível — verifique os dados antes de confirmar
- As comissões geradas seguem as **Regras de Comissão** configuradas em `/comissoes`
- Pagamentos em atraso disparam alertas se configurado em `/settings/alertas`
