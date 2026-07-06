# Perfis de Acesso

**Rota:** `/settings/perfis`
**Arquivo:** `src/pages/Perfis.js`

---

## O que é

Define perfis de permissão granular que controlam o que cada usuário pode visualizar, criar, editar ou excluir em cada módulo do sistema. Os perfis são atribuídos aos usuários em `/settings/usuarios`.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de perfis cadastrados. Perfis **nativos** vêm pré-configurados pelo sistema e não podem ser removidos.

Cada perfil exibe: Nome, Descrição, percentual de permissões ativas e cor de identificação.

---

## Como usar

### Criar novo perfil

1. Clique em **Novo perfil**
2. Preencha Nome, Descrição e Cor de identificação
3. Opcionalmente, restrinja o perfil a unidades específicas
4. Salva — o perfil é criado com todas as permissões desativadas
5. Clique no perfil para configurar as permissões

### Configurar permissões

As permissões são organizadas por grupos e módulos:

| Grupo | Módulos |
|-------|---------|
| Visão Geral | Dashboard, Relatórios |
| Comercial | Pipeline, Metas, Tarefas, Ações, Playbooks |
| Canal | Contatos Canais e outros |

Para cada módulo, as ações disponíveis são: **Visualizar**, **Criar / Editar**, **Excluir**, **Exportar**, **Importar** (varia por módulo).

- Clique em uma ação para ativar/desativar
- Use **Selecionar tudo** no módulo para ativar todas as ações de uma vez
- O cabeçalho exibe quantas permissões estão ativas do total

### Restringir a unidades

Na seção **Unidades**, selecione as filiais onde este perfil é válido. Sem seleção, o perfil vale para todo o tenant.

### Remover perfil

Disponível apenas para perfis customizados (não-nativos). Perfis nativos não podem ser excluídos.

---

## Regras de negócio

- Perfis nativos têm identificação bloqueada para edição
- Um usuário pode ter mais de um perfil de acesso simultaneamente
- A permissão final do usuário é a união de todos os perfis atribuídos a ele
- Ações marcadas como "perigo" (como Excluir) são destacadas visualmente em vermelho
