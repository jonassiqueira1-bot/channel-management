# Playbooks

**Rota:** `/playbooks`
**Arquivo:** `src/pages/Playbooks.js`

---

## O que é

Biblioteca de roteiros de venda estruturados em etapas. Cada playbook pode ser vinculado a uma oportunidade no Pipeline para guiar o vendedor durante a negociação.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor`, `parceiro` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de playbooks com: Nome, número de etapas, clientes de referência e materiais vinculados.

---

## Como usar

### Criar playbook

1. Clique em **Novo Playbook**
2. Preencha nome e descrição
3. Adicione **etapas** — cada etapa tem nome, descrição e atividades recomendadas
4. Adicione **clientes de referência** — cases de sucesso para inspirar o vendedor
5. Adicione **materiais** — links ou arquivos de apoio (apresentações, propostas, etc.)
6. Salva

### Vincular ao Pipeline

Dentro de uma oportunidade no Pipeline, selecione o playbook desejado no campo **Playbook**. As etapas aparecem como checklist dentro do card.

### Editar ou remover etapa

Dentro do playbook, clique no ícone de edição ou exclusão da etapa.

---

## Regras de negócio

- Um playbook pode ser vinculado a múltiplas oportunidades simultaneamente
- Materiais marcados como privados são visíveis apenas para usuários do ISV — parceiros não os visualizam
- A ordem das etapas é configurável por arrastar e soltar
