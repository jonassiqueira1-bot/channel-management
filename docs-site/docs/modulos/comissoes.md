# Comissões


---

## O que é

Gerencia as regras de cálculo de comissões e o histórico de pagamentos de repasse aos vendedores e parceiros. As comissões são geradas automaticamente ao confirmar recebimentos em Pagamentos.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso total |
| `vendedor` | Vê as próprias comissões (conforme permissão) |

---

## O que mostra

Duas visões: **Regras de comissão** e **Lançamentos de repasse**.

**Regras:** Nome, modelo de cálculo (individual/equipe), percentual e condições de elegibilidade.

**Lançamentos:** Beneficiário, contrato, valor, período e status (Calculado / Aprovado / Pago).

---

## Como usar

### Criar regra de comissão

1. Clique em **Nova Regra de Comissão**
2. Configure o modelo de cálculo:
   - **Escala individual** — percentual por faixa de valor
   - **Bônus de equipe** — percentual adicional por meta de equipe
3. Defina condições de elegibilidade (produtos, funis, etapas)
4. Salva

### Aprovar e pagar comissão

No lançamento gerado após confirmação de pagamento:
- **Aprovar** → status muda para Aprovado
- **Marcar como pago** → status muda para Pago

---

## Aba: Aprovação em Lote

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

### Como usar

1. Clique em **Nova Regra**
2. Defina o nome e o modelo de cálculo:
   - **Escala individual** — percentual por faixa de valor recebido
   - **Bônus de equipe** — percentual adicional ao atingir meta coletiva
3. Configure condições de elegibilidade (produtos, funis, etapas do pipeline)
4. Vincule a regra aos usuários em **Configurações → Usuários**

---

## Regras de negócio

- Regras de comissão são vinculadas a usuários em `/settings/usuarios`
- Lançamentos são gerados automaticamente ao confirmar recebimento em Pagamentos
- O fluxo é: Calculado → Aprovado → Pago
- A aprovação em lote não impede ajustes individuais antes da aprovação
