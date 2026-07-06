# Papéis e Permissões

## Papéis disponíveis

| Papel | Label | Tipo de usuário | Descrição |
|-------|-------|----------------|-----------|
| `admin_isv` | Administrador | interno | Acesso total ao tenant. Gerencia empresa, filiais, usuários e configurações. |
| `vendedor` | Vendedor | interno ou externo | Acesso ao pipeline e contatos da sua filial. |
| `financeiro` | Financeiro | interno | Acesso a contratos, pagamentos e comissões. |
| `cs` | Customer Success | interno | Acesso ao módulo de Customer Success. |
| `projetos` | Projetos | interno | Acesso ao módulo de projetos. |
| `parceiro` | Parceiro | externo | Contato de canal convidado via e-mail. Acesso restrito ao portal do parceiro. |

---

## Rotas permitidas por papel

Definidas em [`src/data/mockPerfis.js`](../src/data/mockPerfis.js) — `PAPEIS_ROTAS`.

| Papel | Rotas acessíveis |
|-------|-----------------|
| `admin_isv` | **Todas** (`null` = sem restrição) |
| `vendedor` | `/pipeline`, `/empresas`, `/contatos`, `/vendedores`, `/playbooks`, `/documentos`, `/tarefas` |
| `financeiro` | `/comissoes`, `/pagamentos`, `/contratos` |
| `cs` | `/customer-success` |
| `projetos` | `/projetos` |
| `parceiro` | `/pipeline`, `/playbooks`, `/documentos`, `/settings` |

A Sidebar usa essa tabela para renderizar apenas os itens permitidos para o papel do usuário logado. A verificação é feita em [`src/components/Sidebar.js`](../src/components/Sidebar.js):

```js
rotasPermitidas === null || rotasPermitidas.includes(item.path)
```

> A Sidebar é uma barreira de UX, não de segurança. A barreira real é o RLS no banco.

---

## Isolamento por filial (branch)

Usuários com papel `vendedor`, `financeiro`, `cs` e `projetos` só enxergam dados da própria `branch_id`. O `admin_isv` não tem `branch_id` e vê todas as filiais.

O papel `parceiro` recebe `branch_id` automaticamente do seller que originou o convite (via trigger `on_partner_invite_confirm`).

---

## RLS — Row-Level Security

Toda a segurança de dados é aplicada no Postgres via policies RLS. O frontend **não é** a barreira de segurança — qualquer chamada direta à API do Supabase também é filtrada pelas policies.

### Padrão geral das policies

```sql
-- Isola por tenant
tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())

-- Isola por filial (para papéis não-admin)
AND (
  branch_id IS NULL  -- admin_isv não tem branch_id
  OR branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
)
```

### Tipos de policy

O Postgres tem dois modos de policy RLS:

| Tipo | Comportamento | Uso no projeto |
|------|--------------|---------------|
| `PERMISSIVE` | Policies com OR entre si | Regra padrão — qualquer policy que passe libera acesso |
| `RESTRICTIVE` | Policies com AND entre si | Barreira obrigatória — todas precisam passar |

No projeto, a policy de `tenant_id` é geralmente `RESTRICTIVE`, garantindo que nenhuma outra policy consiga vazar dados de outro tenant.

### Exemplo: tabela `sellers`

```sql
-- Barreira de tenant (RESTRICTIVE)
CREATE POLICY "sellers_tenant" ON sellers
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- admin_isv vê tudo no tenant
CREATE POLICY "sellers_admin" ON sellers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_isv')
  );

-- outros papéis veem apenas da própria branch
CREATE POLICY "sellers_branch" ON sellers
  FOR SELECT USING (
    branch_id = (SELECT branch_id FROM profiles WHERE id = auth.uid())
  );
```

### Recursão em RLS

Policies que fazem `SELECT` na própria tabela `profiles` para verificar o papel do usuário podem causar recursão infinita. O projeto resolve isso com uma função `SECURITY DEFINER` que lê o perfil sem acionar RLS:

```sql
CREATE OR REPLACE FUNCTION auth_profile()
RETURNS profiles LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;
```

As policies usam `(auth_profile()).role` em vez de um subselect na tabela.

---

## Papel `parceiro` — Portal do Parceiro

O papel `parceiro` tem características especiais:

| Característica | Detalhe |
|---------------|---------|
| Origem | Criado via convite por e-mail (Edge Function `invite-user`) |
| Vínculo | `profiles.contact_id` → `sellers.id` |
| Filial | `branch_id` herdado do seller no momento do convite |
| Acesso RLS | Vê apenas dados do próprio seller (`contact_id`) |
| Desativação automática | Quando o seller é deletado/soft-deleted, o profile é marcado `inativo` |

### Visibilidade na lista de usuários

Usuários `parceiro` têm `branch_id = null` (herdado depois via trigger). Por isso, o hook [`useUsuarios`](../src/hooks/useUsuarios.js) tem uma exceção explícita:

```js
// parceiro não tem branch_id antes do convite ser aceito — sempre exibir
if (u.papel === 'parceiro') return true
```

---

## Status do usuário

| Status | Significado | Comportamento |
|--------|------------|--------------|
| `ativo` | Acesso normal | — |
| `pendente` | Convite enviado, não aceito | Aparece na lista de usuários; não consegue logar com senha (apenas via link) |
| `inativo` | Desativado | `useProfile` força `signOut()` ao carregar o perfil |

---

## Convite × usuário já existente

Se o e-mail convidado já possui conta no Supabase Auth, a Edge Function `invite-user` não consegue reenviar o convite (retorna 422). Nesse caso:

1. Vincula `contact_id`, `role` e `branch_id` diretamente no profile existente.
2. Envia um **magic link** para o usuário acessar com o novo vínculo.

Esse fluxo está documentado em detalhe em [`docs/edge-functions.md`](edge-functions.md).
