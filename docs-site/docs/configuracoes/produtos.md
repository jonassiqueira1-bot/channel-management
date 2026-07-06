---
id: produtos
title: Produtos
---

# Produtos


---

## O que é

Catálogo de produtos e serviços comercializados pelo canal. Os produtos são usados no Pipeline (itens de oportunidade), Contratos e Comissões.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de produtos com: Nome, Código, Tipo, Categoria, Preço, Cobrança e Status.

---

## Como usar

### Cadastrar produto

1. Clique em **Novo Produto**
2. Preencha:
   - **Nome** e **Código** (obrigatórios)
   - **Tipo** — SaaS, Serviço, Hardware, Licença, etc.
   - **Categoria** — agrupamento livre (CRM, ERP, BI, Segurança, etc.)
   - **Descrição**
   - **Status** — Rascunho, Ativo ou Inativo
   - **Cobrança** — Mensal, Anual, Única, etc.
   - **Preço (R$)** e **Setup (R$)**
   - **Desconto máximo (%)** — limite de desconto permitido nas oportunidades
   - **Funcionalidades** — lista livre, uma por linha
3. Salva

### Importar em lote

Clique em **Importar** → CSV com colunas: `nome`, `codigo`, `tipo`, `categoria`, `status`, `cobranca`, `preco`.

### Exportar

Clique em **Exportar CSV**.

---

## Regras de negócio

- Apenas produtos com status **Ativo** aparecem nos seletores de Pipeline, Contratos e Habilitações
- Produtos em **Rascunho** ficam visíveis apenas nesta tela
- O Código é convertido automaticamente para maiúsculas
- Categorias são customizáveis — novas categorias digitadas são salvas automaticamente
