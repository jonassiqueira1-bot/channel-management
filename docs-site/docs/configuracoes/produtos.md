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
   - **Centro de Custo** — governança gerencial: define pra qual centro a receita desse produto é contabilizada (veja [Centros de Custo](./centros-custo))
   - **Descrição**
   - **Status** — Rascunho, Ativo ou Inativo
   - **Cobrança** — Mensal, Anual, Única, etc.
   - **Preço (R$)** e **Setup (R$)**
   - **Desconto máximo (%)** — limite de desconto permitido nas oportunidades
   - **Funcionalidades** — lista livre, uma por linha
   - **Fiscal** — categorização contábil/fiscal, veja abaixo
3. Salva

### Fiscal

Seção dedicada no cadastro do produto, com dados cadastrais pra alimentar a contabilidade real (o Boostly não calcula imposto, só guarda os dados estruturados):

| Campo | Uso |
|-------|-----|
| NCM | Nomenclatura Comum do Mercosul — obrigatório em nota fiscal de mercadoria |
| CFOP | Código Fiscal de Operações e Prestações — natureza da operação |
| Código de serviço municipal | LC 116 — só relevante quando o produto é serviço (ISS) |
| Alíquota ISS (%) | Percentual de ISS aplicável |
| Alíquota ICMS (%) | Percentual de ICMS aplicável |
| ISS retido / IRRF retido / PIS-COFINS-CSLL retidos | Flags de retenção na fonte |

### Importar em lote

Clique em **Importar** → CSV com colunas: `nome`, `codigo`, `tipo`, `categoria`, `status`, `cobranca`, `preco`.

### Exportar

Clique em **Exportar CSV** — traz nome, código, tipo, categoria, Centro de Custo, status, preço e todos os campos fiscais numa planilha só, pronta pra levar pro contador.

---

## Regras de negócio

- Apenas produtos com status **Ativo** aparecem nos seletores de Pipeline, Contratos e Habilitações
- Produtos em **Rascunho** ficam visíveis apenas nesta tela
- O Código é convertido automaticamente para maiúsculas
- Categorias são customizáveis — novas categorias digitadas são salvas automaticamente
- Os campos Fiscais são só cadastrais — não há cálculo de imposto no Boostly
