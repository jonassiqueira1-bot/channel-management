---
id: comissoes
title: Comissões
---

# Comissões


---

## O que é

Gerencia as regras de cálculo de comissão/repasse e o histórico de lançamentos pagos a vendedores, parceiros e demais beneficiários. Os lançamentos são gerados automaticamente ao confirmar um recebimento em **Pagamentos**. A tela reúne três abas: **Acompanhamento de Repasses**, **Aprovação de Lotes** e **Regras de Configuração**.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso total |
| `vendedor` | Vê as próprias comissões (conforme permissão) |

---

## Conceito: Personas

Em vez de vincular uma regra direto a um usuário, a comissão é calculada por **persona** — um papel de beneficiário (ex: Executivo de Contas, Coordenador, Parceiro) configurado em **Personas**, cada uma associada opcionalmente a um usuário ou parceiro específico. Isso permite que uma mesma regra distribua percentuais diferentes entre várias personas na mesma venda (ex: 60% pro vendedor, 20% pro coordenador, 20% pro parceiro).

---

## Aba: Acompanhamento de Repasses

### O que mostra

Lista de lançamentos de comissão com: Beneficiário/Persona, contrato, valor, período e status (Calculado → Aprovado → Pago).

### Como usar

- Lançamentos são gerados automaticamente ao confirmar um pagamento em **Pagamentos**
- É possível criar um lançamento manual selecionando a persona, a regra aplicável e o valor
- **Aprovar** individualmente muda o status para Aprovado; **Marcar como pago** muda para Pago

---

## Aba: Aprovação de Lotes

Permite revisar e aprovar comissões de múltiplos beneficiários de uma vez, agrupadas por período.

### O que mostra

Lista de lotes de comissão com: Período, Beneficiário, Total calculado, Status de aprovação e Status de pagamento.

### Como usar

1. Selecione o período desejado
2. Revise os valores calculados por beneficiário
3. Marque os lotes que deseja aprovar
4. Clique em **Aprovar Selecionados**
5. Para registrar o pagamento, use o menu **Status pgto** para alterar em lote para **Pago**

### Colunas

| Coluna | Descrição |
|--------|-----------|
| Aprovação | Status da aprovação do lote (Pendente / Aprovado / Reprovado) |
| Pgto | Status do pagamento ao beneficiário (Pendente / Pago) |

---

## Aba: Regras de Configuração

Define as regras de cálculo de comissão aplicadas aos lançamentos gerados em Pagamentos.

### Fórmula de cálculo

Cada combinação (produto ou categoria) de uma regra define três percentuais que se multiplicam em cascata:

```
Base de cálculo = Valor líquido × Repasse distribuidor (%) × Base de cálculo (%)
Comissão        = Base de cálculo × % sobre a base
```

Dentro de uma combinação, o percentual "% sobre a base" pode ainda ser distribuído entre as **personas ativas**, com um percentual próprio por persona (ex: CDU/SMS/Serviços).

### Modelos adicionais por combinação

| Modelo | Uso |
|--------|-----|
| **Escala individual** | Percentual de comissão escalonado por faixa de valor recebido |
| **Escala de equipe** | Bônus adicional por faixa, aplicado quando a equipe atinge uma meta coletiva |

### Como usar

1. Clique em **Nova Regra**
2. Defina o nome e as condições de elegibilidade (produtos/categorias, funis, etapas)
3. Para cada combinação de produto/categoria, configure: percentual de repasse do distribuidor, base de cálculo, percentual sobre a base e a distribuição entre personas
4. Configure escalas individual e/ou de equipe, se aplicável
5. Vincule as personas aos usuários/parceiros correspondentes em **Personas**

---

## Regras de negócio

- Lançamentos são gerados automaticamente ao confirmar recebimento em Pagamentos
- O fluxo é: Calculado → Aprovado → Pago
- A aprovação em lote não impede ajustes individuais antes da aprovação
- Uma persona sem usuário/parceiro vinculado ainda pode receber lançamentos — fica identificada só pelo nome da persona até ser associada
