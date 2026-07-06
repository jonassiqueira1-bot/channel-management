# Metas e KPIs


---

## O que é

Define as metas atribuídas a usuários ou equipes com base nos indicadores configurados. As metas são acompanhadas em tempo real no módulo `/metas`.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de metas com: Nome, Indicador, Responsável, Valor-alvo, Período e Status.

---

## Como usar

### Criar meta

1. Clique em **Nova Meta**
2. Preencha:
   - **Nome** (obrigatório)
   - **Indicador** — KPI base para a meta (obrigatório, vem de `/settings/indicadores`)
   - **Escopo** — a quem a meta pertence: Usuário individual ou Equipe
   - **Usuário** ou **Equipe** — conforme o escopo escolhido
   - **Valor-alvo** — número a atingir (unidade exibida conforme o indicador)
   - **Período** — Mensal, Trimestral, Semestral ou Anual
   - **Data início** e **Data fim**
   - **Meta pai** — para criar hierarquia de metas (meta filha contribui para a pai)
   - **Status** — Ativa ou Inativa
3. Salva

### Editar ou remover

Clique na linha da meta → formulário com os mesmos campos.

---

## Regras de negócio

- Uma meta exige um indicador ativo como base — sem indicador, não é possível criar a meta
- O campo **Valor-alvo** exibe a unidade de medida do indicador selecionado
- Metas com **Meta pai** contribuem para o progresso da meta hierarquicamente superior
- O acompanhamento das metas é feito no módulo `/metas`, não aqui
