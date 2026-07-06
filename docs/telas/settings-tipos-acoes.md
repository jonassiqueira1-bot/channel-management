# Tipos de Atividades

**Rota:** `/settings/tipos-acoes`
**Arquivo:** `src/pages/settings/TiposAcao.js`

---

## O que é

Categorias customizáveis usadas no cadastro de Ações de Canal e Tarefas. Permite criar tipos com nome, ícone e cor próprios para refletir a nomenclatura do ISV.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de tipos cadastrados com prévia visual (ícone + badge colorido), Nome, onde é usado e Situação.

---

## Como usar

### Criar tipo de atividade

1. Clique em **Novo Tipo**
2. Preencha:
   - **Nome** (obrigatório)
   - **Usado em** — Ações, Tarefas ou ambos (obrigatório)
   - **Situação** — Ativo ou Inativo
   - **Ícone** — escolha da biblioteca de ícones
   - **Cor** — escolha uma paleta pré-definida ou cor customizada
3. A **Prévia** no topo do formulário mostra o badge em tempo real
4. Salva

### Editar ou remover

Clique na linha → formulário com os mesmos campos.

---

## Regras de negócio

- Tipos inativos não aparecem nos seletores de Ações e Tarefas
- A cor e o ícone aparecem em todo o sistema onde o tipo for utilizado
