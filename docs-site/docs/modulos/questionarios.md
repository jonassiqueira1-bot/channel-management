---
id: questionarios
title: Questionários
---

# Questionários


---

## O que é

Criação e aplicação de formulários estruturados por seções e perguntas — diagnósticos, qualificação de lead, apoio comercial, onboarding e pesquisas. Um template pode ser vinculado a uma etapa de funil dentro de um **Playbook**, alimentando automaticamente o questionário exibido na oportunidade correspondente.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor` | Acesso à filial |
| Demais papéis | Sem acesso direto |

---

## O que mostra

Lista de templates com: Título, tipo, número de perguntas, status e data de atualização.

### Tipos de template

| Tipo | Uso |
|------|-----|
| Pré-Venda | Levantamento antes de avançar a negociação |
| Apoio Comercial | Suporte à equipe durante a venda |
| Diagnóstico | Avaliação de cenário do cliente |
| Onboarding | Coleta de dados na entrada do cliente |
| Qualificação de Lead | Pontuação para qualificar uma oportunidade |

### Status de uma resposta enviada

Rascunho → Enviado → Em Revisão → Aprovado / Reprovado

---

## Como usar

### Criar template

1. Clique em **Novo questionário**
2. Defina título, tipo e descrição
3. Adicione **seções**, e dentro de cada seção, **perguntas** — tipos disponíveis: texto livre, número, múltipla escolha
4. Para cada pergunta, defina se é obrigatória e um **peso** — usado para calcular uma pontuação quando o questionário é usado para qualificação de lead
5. Salva

O editor do template tem duas abas: **Estrutura** (seções e perguntas) e **Respostas** (submissões recebidas para aquele template).

### Aplicar / responder

Selecione o template e registre uma resposta — pode ser preenchida diretamente ou, quando o template está vinculado a um Playbook, respondida dentro da oportunidade correspondente no Pipeline.

### Editar template

Clique na linha do questionário → editor com as seções e perguntas.

---

## Vínculo com Playbooks

Dentro de um **Playbook**, a seção "Questionário" permite vincular um template a cada etapa do funil daquele playbook. Ao abrir uma oportunidade nessa etapa, o questionário vinculado aparece disponível para preenchimento direto no Pipeline.

---

## Regras de negócio

- Templates são reutilizáveis — um mesmo questionário pode ser aplicado a múltiplas oportunidades/parceiros
- Respostas submetidas ficam vinculadas ao template e à data de aplicação
- Perguntas com peso alimentam a pontuação de qualificação quando o template é usado como questionário de etapa em um Playbook
