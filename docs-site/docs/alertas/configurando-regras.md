---
id: configurando-regras
title: Configurando Regras de Alerta
sidebar_position: 1
---

# Alertas

O módulo de alertas permite criar regras automáticas que disparam notificações quando condições específicas são atendidas nos seus dados.

## Criando uma regra

1. Vá em **Configurações → Alertas**
2. Clique em **Nova Regra**
3. Preencha:
   - **Nome** — identificação da regra
   - **Origem** — de qual entidade os dados vêm (Oportunidades, Projetos, Tarefas)
   - **Condições** — os critérios que disparam o alerta
   - **Operador lógico** — `E` (todas as condições) ou `OU` (qualquer condição)

## Operadores disponíveis

| Operador | Descrição |
|----------|-----------|
| `=` | Igual a |
| `!=` | Diferente de |
| `>` / `>=` | Maior que / maior ou igual |
| `<` / `<=` | Menor que / menor ou igual |
| `contém` | Texto contém o valor |
| `dias após` | N dias após uma data |
| `dias antes` | N dias antes de uma data |

## Verificação

As regras são avaliadas automaticamente a cada **10 minutos**. Para forçar uma avaliação imediata, clique em **Rodar agora** na tela de Alertas.

Os alertas disparados aparecem no **painel de notificações** (ícone de sino no topo da tela).
