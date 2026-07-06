# Usuários


---

## O que é

Gerencia todos os usuários com acesso à plataforma — tanto internos (equipe do ISV) quanto externos (parceiros convidados). Permite convidar novos usuários, editar permissões e acompanhar o status de convites pendentes.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total — vê todos os usuários, pode criar, editar e remover |
| Demais papéis | Acesso somente leitura do próprio perfil |

---

## O que mostra

Lista unificada de **usuários ativos** + **convites pendentes** (sem separação visual — convites aparecem com status "Pendente").

**Colunas da lista:**

| Coluna | Descrição |
|--------|-----------|
| Usuário | Avatar com iniciais + nome + badge "você" (usuário logado) + tipo (ISV / Parceiro) |
| E-mail | Endereço de e-mail |
| Papel | Badge colorido com o papel do usuário |
| Status | `Ativo`, `Pendente` ou `Inativo` |
| Último acesso | Data formatada ou `—` |

**Ações disponíveis na lista:**

- **Convidar usuário** — abre modal de convite (apenas `admin_isv`)
- **Importar** — importação em lote via CSV
- **Exportar CSV** — exporta a lista atual
- **Busca** — filtra por nome ou e-mail em tempo real
- **Clique na linha** — abre edição do usuário (não disponível em convites pendentes)
- **"..." → Cancelar convite** — remove convite pendente

---

## Fluxos principais

### Convidar novo usuário

1. Clica em **Convidar usuário**
2. Preenche: Nome, E-mail, Papel
3. Confirma → e-mail de convite enviado via Edge Function `invite-user`
4. Usuário aparece na lista com status **Pendente**
5. Ao aceitar o convite, status muda para **Ativo** e o registro de convite some da lista

> Convites aceitos (`status = 'aceito'`) são filtrados automaticamente — o usuário já aparece como perfil real.

### Editar usuário

1. Clica na linha do usuário
2. Abre formulário de edição com seções:
   - **Dados do Usuário** — nome, e-mail, cargo, telefone, avatar
   - **Papel** — define quais módulos o usuário acessa
   - **Status** — ativo / inativo / pendente
   - **Franquia** — derivada automaticamente das unidades selecionadas
   - **Unidades com acesso** — filiais que o usuário pode visualizar (obrigatório)
   - **Perfis de acesso** — permissões granulares adicionais
   - **Regras de comissão** — regras aplicáveis ao usuário
   - **Perfil de Recurso** — dados de alocação para projetos
3. Salva ou descarta alterações

### Remover usuário

- Disponível apenas para `admin_isv` e somente em usuários que não sejam o próprio usuário logado
- Ação registrada no log de auditoria

### Importar usuários em lote

1. Clica em **Importar**
2. Cola ou faz upload de CSV com colunas: nome, email, papel
3. Sistema valida as linhas e exibe contagem
4. Confirma → usuários criados em lote

---

## Regras de negócio

- Um usuário não pode editar ou remover o próprio perfil via esta tela
- E-mails duplicados são bloqueados no modal de convite
- Convites aceitos desaparecem da lista (não mostrar duplicidade com o perfil real)
- Usuários com papel `parceiro` e `branch_id = null` (convite ainda não aceito) sempre aparecem na lista do `admin_isv`, independente da filial ativa
- Toda criação, edição e exclusão é registrada no log de auditoria (`useAuditLog`)
- Apenas `admin_isv` vê o botão **Convidar usuário**

---

## Observações

- Convites para e-mails já cadastrados no sistema resultam no envio de um link de acesso direto ao usuário
- O campo **Unidades com acesso** é obrigatório — sem ele o usuário não verá dados de nenhuma filial
