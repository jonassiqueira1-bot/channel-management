# Projetos

**Rota:** `/projetos`
**Arquivo:** `src/pages/Projetos.js`

---

## O que é

Gestão de projetos de implementação pós-venda em formato kanban, com fases baseadas na metodologia MIT. Vinculado ao Pipeline — projetos podem ser criados automaticamente ao ganhar uma oportunidade.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `projetos` | Acesso à filial |
| Demais papéis | Sem acesso direto |

---

## O que mostra

Kanban com colunas representando as fases do projeto. Cada card exibe: nome do projeto, empresa, responsável, criticidade e progresso.

---

## Fases do projeto (metodologia MIT)

| Fase | Descrição |
|------|-----------|
| Iniciação | Projeto recém-criado, planejamento inicial |
| Modelagem | Levantamento de requisitos e configuração |
| Implantação | Configuração e desenvolvimento |
| Treinamento | Capacitação dos usuários |
| Go-Live | Entrada em produção |
| Encerramento | Conclusão e entrega formal |

---

## Como usar

### Criar projeto

1. Clique em **+** na coluna desejada ou em **Novo Projeto**
2. Preencha: nome, empresa, responsável, fase inicial, criticidade e datas
3. Vincule a uma oportunidade ganha *(opcional)*
4. Adicione membros da equipe
5. Salva

### Avançar fase

Arraste o card para a próxima coluna ou edite a fase dentro do formulário.

### Registrar issues

Dentro do projeto, registre problemas e impedimentos com descrição e anexos.

### Importar do MS Project

Clique em **Importar .xml** dentro do projeto para importar tarefas e fases de um arquivo exportado pelo MS Project.

---

## Regras de negócio

- Projetos podem ser criados automaticamente ao marcar uma oportunidade como **Ganha** no Pipeline
- A criticidade (Baixa, Média, Alta, Crítica) é usada para priorização na visão kanban
- Issues e anexos ficam vinculados ao projeto permanentemente
