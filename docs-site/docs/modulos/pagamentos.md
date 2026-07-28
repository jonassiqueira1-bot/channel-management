---
id: pagamentos
title: Pagamentos
---

# Pagamentos


---

## O que é

Controle dos pagamentos e cobranças vinculados aos contratos. Registra recebimentos, concilia com as **Provisões** e **Faturas** geradas pelo contrato, e processa comissões automaticamente ao confirmar um pagamento. A tela reúne três abas: **Pagamentos**, **Provisões** e **Faturas**.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## Aba: Pagamentos

### O que mostra

Lista de pagamentos com: Contrato, Empresa, Mês de referência, Valor, Status e data de vencimento.

### Lançar pagamento manual

1. Clique em **Novo Pagamento**
2. Selecione a empresa e o contrato — os produtos disponíveis já filtram pelos itens daquele contrato
3. Adicione um ou mais produtos (lista de itens, igual ao contrato) — cada um com seu próprio valor
4. Informe competência e data de vencimento
5. Salva

Um pagamento pode ter mais de um produto — os valores de cada item são somados automaticamente nos totais de Licença/Mensalidade/Serviços.

### Confirmar recebimento

Clique na linha do pagamento → **Confirmar recebimento**. Ao confirmar:
- O status muda para **Recebido**
- O sistema busca a Provisão correspondente e a concilia (veja [Conciliação](#conciliação-com-provisões) abaixo)
- Se o pagamento estiver vinculado a uma Fatura, ela é marcada como **Paga**
- Comissões são calculadas e geradas automaticamente
- Repasses são calculados conforme as regras de comissão vigentes

### Ver detalhes

Clique na linha para expandir: histórico de pagamentos do contrato, comissões geradas e repasses calculados.

---

## Aba: Provisões

Exibe as provisões financeiras geradas automaticamente na ativação de contratos — o valor que o parceiro espera receber, antes da confirmação efetiva do recebimento.

### O que mostra

Lista de provisões com: Empresa, Contrato, Produto, Mês de referência, Valor líquido e Status. Provisões parcialmente recebidas mostram o percentual já baixado.

### Como usar

- Provisões são criadas automaticamente ao ativar um contrato — uma ocorrência por produto para cada mês/parcela do calendário de cobrança (veja [Tipos de cobrança em Contratos](./contratos#tipos-de-cobrança))
- Ao confirmar o recebimento em **Pagamentos**, a provisão correspondente é conciliada
- Se o valor recebido for menor que o previsto, a provisão fica marcada como parcialmente baixada (e sinalizada como inconsistência) em vez de virar "Pago" — só é liquidada quando o valor recebido atinge o previsto
- O KPI **Vencidas sem conciliação** identifica provisões que passaram do vencimento sem nenhum pagamento registrado — é o indicador de "está em dia"

### Conciliação com Provisões

Quando um pagamento é confirmado, o sistema procura a provisão correspondente em camadas, da mais precisa para a mais genérica:

1. **Documento + parcela** — mesmo número de documento (`num_documento`) e parcela em ambos
2. **Contrato + produto + vencimento exato** — usa o calendário pré-gerado do contrato, onde cada ocorrência tem um vencimento único
3. **Contrato + mês de referência** — fallback para registros antigos sem produto/documento definidos

---

## Aba: Faturas

Exibe as faturas geradas automaticamente na ativação de contratos — a cobrança que efetivamente é (ou será) enviada ao cliente final, seja porque o parceiro repassa a cobrança, seja porque o cliente é cobrado diretamente pela ISV.

### O que mostra

Lista de faturas com: Empresa, Contrato, Produtos, Competência, Vencimento, Valor, Cadência (avulsa/recorrente), Origem da cobrança (parceiro/cliente direto) e Status (Gerada/Enviada/Paga/Cancelada).

### Como usar

- Faturas são criadas automaticamente ao ativar um contrato, junto com as Provisões — uma por ocorrência do calendário de cobrança de cada produto
- Quando um Pagamento vinculado a uma fatura é confirmado, a fatura passa automaticamente para **Paga**
- É possível alterar o status manualmente (em lote) e consultar/editar o detalhe de uma fatura

---

## Diferença entre Pagamentos, Provisões e Faturas

| | Pagamentos | Provisões | Faturas |
|---|---|---|---|
| Origem | Manual ou importação | Automática (ativação de contrato) | Automática (ativação de contrato) |
| Representa | O recebimento em si | O que o parceiro espera receber (repasse) | A cobrança enviada ao cliente final |
| Status | Pendente → Recebido | Pendente → Pago (ou parcialmente baixado) | Gerada → Enviada → Paga |
| Comissão | Gerada ao confirmar | Não gera comissão diretamente | Não gera comissão diretamente |

---

## Regras de negócio

- A confirmação de recebimento é irreversível — verifique os dados antes de confirmar
- As comissões geradas seguem as **Regras de Comissão** configuradas em `/comissoes`
- Pagamentos em atraso disparam alertas se configurado em `/settings/alertas`
- Provisões e Faturas não aparecem na lista de Pagamentos — são gerenciadas nas abas próprias
- Nenhum pagamento, provisão ou fatura existe sem produto vinculado
