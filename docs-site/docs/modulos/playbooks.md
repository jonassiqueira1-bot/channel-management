---
id: playbooks
title: Playbooks
---

# Playbooks


---

## O que é

Biblioteca de roteiros de venda, sucesso do cliente ou processos internos, estruturados por etapa. Um playbook é vinculado a uma **oportunidade** no Pipeline — automaticamente (por funil e/ou produto) ou manualmente — e passa a orientar o vendedor com checklist, questionário e indicador de aderência ao ICP direto no card da oportunidade.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor`, `parceiro` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de playbooks com: Título, tipo de uso, segmento, número de etapas do funil, referências, materiais e objeções cadastradas.

---

## Como usar

### Criar playbook

1. Clique em **Novo Playbook**
2. Preencha **Título**, **Tipo de uso** e **Segmento**:
   - **Vendas** — usado no Pipeline/Oportunidades
   - **Sucesso do Cliente** — usado nos Check-ins de Customer Success
   - **Administrativo** — usado em processos internos
3. Vincule a um **Funil** *(opcional)* — as etapas do playbook seguem as etapas desse funil
4. Defina o **critério de vinculação automática**: por produto específico ou por categoria de produto
5. Configure o **Peso por Segmento** e **Porte aderente** — usados no indicador de aderência (fit) da oportunidade
6. Adicione **Objeções** — perguntas objeção/resposta seguindo o framework Reconheça → Aprofunde → Responda → Confirme
7. Salva

### Detalhe do playbook

Ao abrir um playbook já criado, um índice lateral organiza o conteúdo em seções:

**Metodologia**
| Seção | O que é |
|-------|---------|
| Atividades por Etapa | Atividades recomendadas para cada etapa do funil vinculado |
| Checklist de Avanço | Itens de checklist por etapa, com peso — usados para medir prontidão de avanço da oportunidade |
| Questionário | Vincula um template de **Questionários** a cada etapa do funil |
| ICP | Perfil de cliente ideal: segmentos, porte, faturamento, região, stack/concorrentes, departamento, senioridade |

**Materiais de Apoio**
| Seção | O que é |
|-------|---------|
| Clientes de Referência | Cases de sucesso para citar ao vendedor |
| Materiais | Links ou arquivos de apoio (apresentações, propostas, etc.) — podem ser marcados como privados (visíveis só pro ISV) |

**Objeções**
| Seção | O que é |
|-------|---------|
| Biblioteca de Objeções | Objeções comuns e como respondê-las |

### Vínculo com o Pipeline

Um playbook pode ser vinculado a uma oportunidade de duas formas:

- **Automático** — se o playbook tem funil e/ou produto/categoria configurados, ele se vincula sozinho às oportunidades compatíveis (pelo produto vendido e/ou funil usado)
- **Manual** — o vendedor pode vincular ou excluir playbooks manualmente dentro da oportunidade, mesmo que a vinculação automática não tenha se aplicado

Dentro da oportunidade, os playbooks vinculados alimentam:
- **Checklist de avanço** da etapa atual, agregando os itens de todos os playbooks vinculados
- **Questionário** da etapa, se algum playbook tiver um template linkado
- **Indicador de aderência (fit)** — calculado a partir do ICP, peso por segmento e porte aderente configurados no playbook

---

## Regras de negócio

- Um playbook pode ser vinculado a múltiplas oportunidades simultaneamente
- Materiais marcados como privados são visíveis apenas para usuários do ISV — parceiros não os visualizam
- Playbooks do tipo **Administrativo** usam o status do processo em vez das etapas de um funil
- A vinculação automática não impede vínculos ou exclusões manuais adicionais por oportunidade
