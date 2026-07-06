# Tarefas

**Rota:** `/tarefas`
**Arquivo:** `src/pages/Tarefas.js`

---

## O que é

Central de tarefas do canal. Concentra todas as atividades pendentes — criadas manualmente ou geradas automaticamente por alertas — vinculadas a oportunidades, empresas, projetos ou sellers.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor` | Acesso às tarefas da filial |
| `cs`, `projetos` | Acesso às próprias tarefas |
| Demais papéis | Sem acesso direto |

---

## O que mostra

Lista de tarefas com: Título, Tipo, Vínculo (entidade relacionada), Responsável, Prazo, Prioridade e Status.

Tarefas atrasadas e urgentes são destacadas visualmente.

---

## Como usar

### Criar tarefa

1. Clique em **Nova Tarefa**
2. Preencha:
   - **Título** (obrigatório)
   - **Tipo** — Ligação, E-mail, Reunião, Visita, Proposta, Follow-up (conforme `/settings/tipos-acoes`)
   - **Status** — Pendente, Em andamento, Concluída, Cancelada
   - **Prioridade** — Baixa, Média, Alta, Urgente
   - **Prazo** e **Data início**
   - **Responsável**
   - **Vínculo** — entidade relacionada (oportunidade, empresa, projeto, etc.)
3. Salva

### Concluir tarefa

Clique no checkbox da tarefa ou altere o status para **Concluída**.

### Importar em lote

Clique em **Importar** → CSV com colunas: `titulo`, `tipo`, `status`, `prioridade`, `prazo`, `responsavel_nome`.

### Exportar

Clique em **Exportar CSV**.

---

## Regras de negócio

- Tarefas com prazo vencido são destacadas em vermelho
- Tarefas vencendo em até 2 dias são destacadas em amarelo
- Tarefas geradas automaticamente por alertas já vêm com o vínculo preenchido
- O tipo da tarefa segue os **Tipos de Atividades** configurados em `/settings/tipos-acoes`
