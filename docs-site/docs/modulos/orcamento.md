---
id: orcamento
title: Orçamento
---

# Orçamento

---

## O que é

Controle de orçamento por Centro de Custo e mês (competência): planejado x realizado, com lançamentos manuais que seguem o mesmo fluxo de aprovação usado em Ações e Campanhas. Módulo restrito a administradores — pensado pro dono do negócio acompanhar gasto x planejamento antes de repassar os números pro contador.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Uma linha por Centro de Custo + Competência (mês), com: Planejado, Realizado automático (Campanhas/Ações executados), Realizado manual (lançamentos), Total realizado (despesa), Receita realizada, Desvio e Status (Dentro do orçamento / Estourado / Sem planejado).

KPIs no topo: Total planejado, Total realizado (despesa), Receita realizada, Centros estourados, Gasto sem planejado — recolhíveis, com o estado lembrado entre acessos.

---

## Como usar

### Definir o planejado

Clique na linha do Centro de Custo/mês desejado → no painel lateral, preencha **Planejado (R$)** e observações. Se o centro ainda não tem nenhum lançamento no mês, ele aparece na lista mesmo assim (com Planejado zerado), permitindo lançar o valor.

### Realizado automático

Somado sozinho, a partir dos itens de **Custos** marcados como executados em Campanhas e Ações vinculados àquele Centro de Custo, filtrados pela data de cada item. Não precisa de nenhuma ação manual aqui.

### Lançamentos manuais

No mesmo painel lateral, seção **Lançamentos manuais** — segue o mesmo fluxo de Ações → Custos:

1. **+ Adicionar lançamento**
2. Escolha o tipo — **Despesa** ou **Receita**
3. Preencha descrição e valor previsto
4. **Solicitar aprovação**
5. O responsável do Centro de Custo (ou `admin_isv`/`financeiro`) aprova ou rejeita
6. Só depois de aprovado é possível marcar como **Executado** e informar o valor realizado — se o valor realizado não for preenchido, assume o valor previsto

Receitas manuais entram subtraindo do total realizado; despesas somam.

### Receita realizada

Somada sozinho, sem ação manual: pagamentos com status **Pago** são atribuídos ao Centro de Custo herdado do(s) produto(s) do pagamento (mesmo elo de Contratos/Provisões/Faturas/Pagamentos → Produto → Centro de Custo), agrupados pela competência (`reference_month`). Quando o pagamento tem mais de um produto, o valor é rateado proporcionalmente entre eles.

### Custo de Projetos

Exibido à parte, como informativo — é o custo acumulado desde o início do projeto (não é mensal), então não entra na soma automática do orçamento.

---

## Regras de negócio

- Módulo restrito a `admin_isv`
- Um Centro de Custo só aparece se estiver com status Ativo
- Aprovação de lançamento manual: `admin_isv`, `financeiro`, ou o Responsável cadastrado no Centro de Custo (veja [Centros de Custo](../configuracoes/centros-custo))
- Só lançamentos executados entram no Realizado; previstos ainda pendentes aparecem só na coluna de previsto itemizado
- O Desvio é sempre Total realizado − Planejado
