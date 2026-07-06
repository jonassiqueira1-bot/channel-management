# Equipes

**Rota:** `/settings/equipes`
**Arquivo:** `src/pages/settings/Equipes.js`

---

## O que é

Agrupa usuários em equipes para acompanhar métricas, metas e desempenho coletivo. As equipes podem ser vinculadas a metas em `/settings/metas`.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de equipes com: Nome, Líder, número de membros e Status (Ativa / Inativa).

---

## Como usar

### Criar nova equipe

1. Clique em **Nova equipe**
2. Preencha:
   - **Nome da equipe** (obrigatório)
   - **Status** — Ativa ou Inativa
   - **Descrição**
   - **Líder da equipe** — usuário responsável pela equipe
   - **Membros** — selecione os usuários que compõem a equipe
3. Salva

### Vincular a metas

A seção **Métricas e Metas** informa que as metas são vinculadas às equipes em `/settings/metas`. Após salvar a equipe, acesse o cadastro de metas para fazer a associação.

### Editar ou remover

Clique na linha da equipe → formulário com os mesmos campos. O botão **Remover** exclui a equipe.

---

## Regras de negócio

- O líder da equipe não é adicionado automaticamente como membro — adicione-o manualmente na lista de membros se desejar
- Equipes inativas não aparecem nos seletores de outros módulos
- Uma equipe pode ter qualquer número de membros
