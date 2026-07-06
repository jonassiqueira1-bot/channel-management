# Metas

**Rota:** `/metas`
**Arquivo:** `src/pages/Metas.js`

---

## O que é

Acompanhamento em tempo real do progresso das metas definidas em `/settings/metas`. Exibe o realizado versus o alvo com visualização mensal e barras de progresso.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Vê todas as metas da filial |
| `vendedor` | Vê as próprias metas e as da equipe (conforme permissão) |
| Demais papéis | Sem acesso |

---

## O que mostra

Grade de metas com: Nome, Indicador, Responsável (usuário ou equipe), valor realizado vs. alvo por mês, percentual de atingimento e barra de progresso colorida.

---

## Como usar

### Acompanhar progresso

Cada célula mensal exibe o percentual atingido, barra de progresso e os valores realizados/meta. A cor indica o status:
- **Verde** — meta atingida (≥ 100%)
- **Amarelo** — em progresso
- **Vermelho** — abaixo do esperado

### Registrar valor realizado

Clique na célula do mês atual para inserir ou atualizar o valor realizado.

---

## Regras de negócio

- As metas são criadas em `/settings/metas` — não é possível criar metas diretamente aqui
- O ano exibido pode ser navegado com os controles de período
- Metas com hierarquia (meta pai) somam o progresso das metas filhas
