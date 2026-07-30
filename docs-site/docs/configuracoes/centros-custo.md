---
id: centros-custo
title: Centros de Custo
---

# Centros de Custo

---

## O que é

Cadastro simples de centros de custo — a unidade de governança financeira/gerencial usada pra agrupar receitas e despesas por área do negócio (ex: Comercial, Marketing, Suporte, Implantação). Produtos, Comissões, Campanhas, Ações, Projetos e Usuários podem ser vinculados a um centro de custo; o módulo [Orçamento](../modulos/orcamento) consolida planejado x realizado por centro.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de centros de custo com: Nome, Descrição, Responsável e Status.

---

## Como usar

### Cadastrar centro de custo

1. Clique em **Novo Centro de Custo**
2. Preencha:
   - **Nome** (obrigatório)
   - **Descrição**
   - **Responsável** — usuário dono do centro; ganha alçada pra aprovar custos vinculados a ele em Ações, Campanhas e Orçamento
   - **Status** — Ativo ou Inativo
3. Salva

### Editar ou remover

Clique na linha do centro de custo → formulário com os mesmos campos.

---

## Onde o vínculo aparece

| Cadastro | Tipo de vínculo |
|----------|------------------|
| Produtos | Direto |
| Comissões (regras) | Direto |
| Campanhas | Direto |
| Ações | Direto |
| Projetos | Direto |
| Usuários | Direto |
| Contratos, Provisões, Faturas, Pagamentos | Herdado do Produto |
| Fechamento de Horas | Herdado do Projeto |

---

## Regras de negócio

- Só centros de custo com status **Ativo** aparecem nos seletores de vínculo
- O **Responsável** do centro de custo tem alçada de aprovação sobre custos vinculados àquele centro, na mesma medida que `admin_isv` e `financeiro`
- Centros de custo em si não têm valores — os valores planejado/realizado ficam no módulo [Orçamento](../modulos/orcamento)
