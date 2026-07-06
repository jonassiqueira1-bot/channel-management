# Habilitações

**Rota:** `/settings/habilitacoes`
**Arquivo:** `src/pages/settings/Habilitacoes.js`

---

## O que é

Define os tipos de habilitação que podem ser atribuídos aos parceiros — certificações, autorizações ou qualificações que um parceiro precisa ter para comercializar determinados produtos.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de habilitações com: Nome, Vínculo (produto ou categoria de produto) e Situação.

---

## Como usar

### Criar habilitação

1. Clique em **Nova Habilitação**
2. Preencha:
   - **Nome** (obrigatório)
   - **Vínculo** — associa a habilitação a um produto específico ou a uma categoria inteira de produtos
   - **Situação** — Ativa ou Inativa
3. Salva

### Editar ou remover

Clique na linha → formulário com os mesmos campos.

---

## Regras de negócio

- O vínculo pode ser por **produto individual** ou por **categoria de produtos**
- Apenas produtos com status **Ativo** aparecem no seletor de vínculo
- Habilitações inativas não aparecem nos seletores de outros módulos
