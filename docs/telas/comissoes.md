# Comissões

**Rota:** `/comissoes`
**Arquivo:** `src/pages/Comissoes.js`

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

## Regras de negócio

- Regras de comissão são vinculadas a usuários em `/settings/usuarios`
- Lançamentos são gerados automaticamente ao confirmar recebimento em Pagamentos
- O fluxo é: Calculado → Aprovado → Pago
