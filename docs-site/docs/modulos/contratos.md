---
id: contratos
title: Contratos
---

# Contratos


---

## O que é

Gestão dos contratos firmados com os parceiros. Vinculado ao Pipeline — um contrato pode ser gerado a partir de uma oportunidade ganha. Cada contrato define os produtos vendidos e como cada um é cobrado ao longo do tempo; é a partir dele que **Provisões** (repasse do parceiro) e **Faturas** (cobrança ao cliente final) são geradas automaticamente.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de contratos com: Número, Empresa, Valor, Período de vigência, Status e indicador de inadimplência.

---

## Como usar

### Criar contrato

1. Clique em **Novo contrato**
2. Vincule a uma oportunidade *(opcional)*
3. Adicione um ou mais produtos ao contrato (lista de itens, igual a um carrinho)
4. Para cada produto, defina:
   - **Quantidade**, **valor** e **desconto**
   - **Status do item** (ativo/pendente/suspenso/cancelado)
   - **1º pagamento** — data de vencimento da primeira cobrança
   - **Cobrança**: À vista, Parcelado ou Recorrente (veja [Tipos de cobrança](#tipos-de-cobrança))
   - **Proposta** *(opcional)* — número da proposta/aditivo comercial que originou aquele item, só para rastreabilidade
5. Preencha vigência e demais condições
6. Salva

### Editar contrato

Clique na linha → formulário de edição. Produtos podem ser adicionados, removidos ou ter valores/condições de cobrança alterados a qualquer momento.

### Acompanhar inadimplência

Contratos com **Faturas** vencidas há mais de 1 dia e não pagas são destacados com o badge **INADIMPLENTE** na lista.

---

## Tipos de cobrança

Cada produto do contrato tem seu próprio tipo de cobrança, que define quantas ocorrências de Provisão/Fatura são geradas de uma vez ao ativar o contrato:

| Tipo | Comportamento |
|------|---------------|
| **À vista** | 1 única ocorrência, no vencimento do 1º pagamento |
| **Parcelado** | N ocorrências (número de parcelas definido), valor dividido igualmente, uma por mês a partir do 1º vencimento |
| **Recorrente** | N ocorrências mensais (padrão: 12 meses à frente), valor cheio repetido a cada mês |

Produtos do tipo SaaS nascem com cobrança **Recorrente** por padrão; os demais nascem **À vista** — qualquer um pode ser trocado manualmente.

O calendário inteiro é pré-gerado na ativação — não é criada só a próxima ocorrência depois que a anterior for paga. Isso permite identificar uma parcela ou mensalidade em atraso mesmo que nenhum pagamento anterior tenha sido processado.

---

## Regras de negócio

- Contratos podem ser gerados automaticamente a partir de uma oportunidade marcada como ganha
- Ao ativar um contrato (ou editar um contrato já ativo), são geradas automaticamente: **Provisões** (uma por ocorrência do calendário de cada produto), **Faturas** (idem) e, se houver regra configurada, **Comissões**
- Um contrato não pode ser criado sem pelo menos um produto — não existem contratos ou provisões sem produto
- Empresas com contrato ativo têm o **Tipo** automaticamente alterado para **Cliente final**
- Contratos vencendo em breve disparam alertas se configurado em `/settings/alertas`
