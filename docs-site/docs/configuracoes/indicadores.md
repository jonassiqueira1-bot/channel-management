---
id: indicadores
title: Indicadores
---

# Indicadores


---

## O que é

Define os indicadores de desempenho (KPIs) que serão monitorados no sistema. Os indicadores são a base para criação de metas em `/settings/metas`.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de indicadores com: Nome, Módulo, Fonte de cálculo, Unidade de medida, Tendência e Status.

---

## Como usar

### Criar indicador

1. Clique em **Novo Indicador**
2. Preencha:
   - **Nome** (obrigatório)
   - **Descrição**
   - **Módulo** — área do sistema de onde os dados vêm (obrigatório)
   - **Fonte de cálculo** — campo ou métrica específica dentro do módulo (obrigatório)
   - **Unidade de medida** — ex: R$, %, unidades, dias
   - **Tendência** — se o indicador deve subir ou cair para ser positivo
   - **Filtros** *(opcionais)* — restringe o cálculo por Produtos, Funis ou Etapas
   - **Status** — Ativo ou Inativo
3. Salva

### Editar ou remover

Clique na linha → formulário com os mesmos campos.

---

## Regras de negócio

- Apenas indicadores **Ativos** aparecem no seletor de metas
- Os filtros são todos opcionais — sem filtro, o indicador considera todos os registros do módulo
- Um indicador não pode ser removido se estiver vinculado a uma meta ativa
