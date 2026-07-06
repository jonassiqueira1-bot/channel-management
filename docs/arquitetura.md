# Arquitetura — Boostly Channel Management

## Visão geral

Boostly é um SaaS **multi-tenant** white-label para ISVs gerenciarem seu canal de parceiros. Cada ISV é um **tenant** isolado; dentro do tenant existem filiais (**branches**) e usuários com papéis distintos.

```
┌─────────────────────────────────────────────────────────┐
│  Tenant (ISV)                                           │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Branch A   │  │  Branch B   │  │  Branch C   │    │
│  │  (Filial)   │  │  (Filial)   │  │  (Filial)   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │            │
│      Sellers          Sellers          Sellers         │
│      Usuários         Usuários         Usuários        │
└─────────────────────────────────────────────────────────┘
```

---

## Stack e responsabilidades

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Frontend | React 18 (CRA) | SPA, roteamento, estado local |
| Auth | Supabase Auth | JWT, convites, magic links |
| Banco | Supabase Postgres | Dados + RLS como camada de segurança |
| Backend | Supabase Edge Functions (Deno) | Operações privilegiadas (service_role) |
| Deploy frontend | Vercel | CI/CD automático do branch `main` |
| Armazenamento | Supabase Storage | Avatares e anexos |
| Monitoramento | Sentry | Erros de runtime no frontend |

---

## Multi-tenancy

O isolamento entre tenants é feito **exclusivamente via RLS (Row-Level Security)** no Postgres. Não há separação de schemas ou bancos.

Todas as tabelas de dados têm uma coluna `tenant_id uuid` e uma policy RLS que filtra por:

```sql
tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
```

O `tenant_id` do usuário logado é lido uma única vez dentro da própria policy, evitando joins desnecessários.

### Filiais (branches)

Dentro do tenant, dados são isolados por `branch_id`. Usuários com papel `vendedor`, `financeiro`, `cs` e `projetos` só enxergam registros da sua filial. Usuários `admin_isv` veem todas as filiais. Usuários `parceiro` têm `branch_id` herdado do seller que os convidou.

---

## Modelo de dados principal

```
companies          — empresas parceiras (franquias/revendedores)
branches           — filiais do ISV
profiles           — usuários (1:1 com auth.users)
sellers            — contatos de canal (pessoa física/jurídica)
pending_invites    — rastreio de convites enviados
oportunidades      — pipeline de vendas (VIEW sobre a tabela base)
tarefas            — tarefas vinculadas a oportunidades ou sellers
acoes              — ações de CS e marketing
projetos           — projetos de implementação
campanhas          — campanhas de marketing (com materiais jsonb)
contratos          — contratos com parceiros
comissoes          — comissões calculadas
```

### Tabela `profiles`

Espelha `auth.users` via trigger. Colunas relevantes:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | FK para `auth.users.id` |
| `tenant_id` | uuid | Isolamento multi-tenant |
| `branch_id` | uuid | Filial do usuário |
| `role` | text | Papel atual (fonte de verdade para RLS) |
| `contact_id` | uuid | FK para `sellers.id` (usado pelo papel `parceiro`) |
| `status` | text | `ativo` / `inativo` / `pendente` |

> O campo `role` é a fonte de verdade para RLS. O campo `papel` no frontend é sinônimo — ambos são lidos via `prof.role || prof.papel`.

---

## Autenticação e segurança

### Fluxo de login

```
1. usuário entra email + senha
2. supabase.auth.signInWithPassword()
3. Supabase retorna JWT + session
4. AuthContext valida o JWT via getUser() (server-side)
5. Se válido → getSession() → app liberado
6. Se inválido → signOut() → /login
```

### Validação de JWT no boot

O [`AuthContext`](../src/contexts/AuthContext.js) nunca confia cegamente no token armazenado no localStorage. A cada abertura do app, faz uma chamada `getUser()` que valida o JWT contra o servidor Supabase antes de liberar qualquer rota:

```
App mount
  │
  ├─ getUser()  ←── hit Supabase server
  │    ├─ OK    → getSession() → session state set → app renders
  │    └─ Error → signOut()   → session = null   → redirect /login
  │
  └─ onAuthStateChange() registrado (ignora eventos até validação concluir)
```

Isso resolve o gap de segurança de JWTs stateless: um usuário deletado do `auth.users` é deslogado na próxima abertura do app, mesmo que ainda tenha um token válido no localStorage.

### Race condition no `onAuthStateChange`

Sem cuidado, o evento `INITIAL_SESSION` do `onAuthStateChange` pode disparar antes do `getUser()` concluir, sobrescrevendo `session` com o valor do localStorage (não validado). Resolvido com `validatedRef`:

```js
const validatedRef = useRef(false)

// getUser() conclui → seta validatedRef = true
// onAuthStateChange → só propaga sessão se validatedRef === true
```

### Usuário desativado

Quando `profiles.status = 'inativo'`, o `useProfile` chama `supabase.auth.signOut()` imediatamente após carregar o perfil, forçando o logout.

O trigger `on_seller_delete` desativa automaticamente o perfil `parceiro` vinculado quando um seller é soft-deleted ou hard-deleted.

---

## Papéis e permissões

### Tabela de papéis

| Papel | Tipo | Acesso RLS | Rotas permitidas |
|-------|------|-----------|-----------------|
| `admin_isv` | interno | Tudo no tenant | Todas (`null` = irrestrito) |
| `vendedor` | interno/externo | Dados da própria branch | `/pipeline`, `/empresas`, `/contatos`, `/vendedores`, `/playbooks`, `/documentos`, `/tarefas` |
| `financeiro` | interno | Dados financeiros da branch | `/comissoes`, `/pagamentos`, `/contratos` |
| `cs` | interno | Módulo de CS da branch | `/customer-success` |
| `projetos` | interno | Módulo de projetos da branch | `/projetos` |
| `parceiro` | externo | Dados públicos do próprio seller | `/pipeline`, `/playbooks`, `/documentos`, `/settings` |

### Como o frontend aplica as restrições

1. **Sidebar** — itens renderizados conforme `PAPEIS_ROTAS[papel]` em [`mockPerfis.js`](../src/data/mockPerfis.js). `null` = mostra tudo.
2. **RLS no Postgres** — cada tabela tem policies que filtram por `tenant_id`, `branch_id` e/ou `role`. É a barreira real de segurança.
3. **ProtectedRoute** — bloqueia rotas não autenticadas. Não filtra por papel (a RLS faz isso nos dados).

---

## Fluxo de convite de parceiro

```
Admin cria Seller em /settings/vendedores
  │
  ▼
Clica "Convidar" → POST /functions/v1/invite-user
  │  body: { email, nome, papel: 'parceiro', contact_id: seller.id }
  │
  ▼
Edge Function invite-user
  ├─ Valida JWT do caller (getUser)
  ├─ Busca tenant_id do caller em profiles
  ├─ POST /auth/v1/invite?redirect_to={APP_URL}/aceitar-convite
  │    data: { tenant_id, contact_id, role: 'parceiro', nome }
  └─ INSERT pending_invites (status: 'pendente')
       └─ Se email já existe (422): vincula profile + envia magic link
  │
  ▼
Usuário recebe e-mail → clica link
  │  URL: {APP_URL}/aceitar-convite?token_hash=...&type=invite
  │
  ▼
AceitarConvite.js
  ├─ Detecta token_hash na query string (fluxo PKCE)
  └─ supabase.auth.verifyOtp({ token_hash, type: 'invite' })
       └─ Fallback: hash fragment #access_token (fluxo implícito legado)
  │
  ▼
Trigger Postgres: on_partner_invite_confirm
  (AFTER UPDATE OF email_confirmed_at ON auth.users)
  ├─ Lê contact_id de raw_user_meta_data
  ├─ Busca branch_id do seller vinculado
  ├─ UPDATE profiles SET contact_id, role='parceiro', branch_id
  └─ UPDATE pending_invites SET status='aceito'
```

**Por que o trigger observa `email_confirmed_at` e não `confirmed_at`?**
`confirmed_at` é uma coluna GERADA (`COALESCE(email_confirmed_at, phone_confirmed_at)`). Triggers não podem observar colunas geradas — a coluna real que muda é `email_confirmed_at`.

---

## Edge Functions

Rodam em Deno no runtime do Supabase. Têm acesso ao `SUPABASE_SERVICE_ROLE_KEY` (via Secrets), o que permite operações que a anon key não permite (criar usuários, ler todas as linhas independente de RLS, etc.).

O frontend chama as funções passando o JWT do usuário logado no header `Authorization`. A função valida esse JWT antes de executar qualquer operação.

Variáveis de ambiente configuradas nos Secrets de cada projeto:

| Variável | DEV | PROD |
|----------|-----|------|
| `APP_URL` | `http://localhost:3000` | `https://app.boostly.com.br` |
| `SUPABASE_URL` | automático | automático |
| `SUPABASE_SERVICE_ROLE_KEY` | automático | automático |
| `SUPABASE_ANON_KEY` | automático | automático |

---

## Soft delete

Registros nunca são deletados diretamente. Toda remoção usa a RPC `soft_delete_record`:

```sql
-- Marca deleted_at = now() na tabela alvo
SELECT soft_delete_record('sellers', '<uuid>');
```

Definida em [`lib/supabase.js`](../src/lib/supabase.js) como `softDelete(table, id)`. As policies RLS filtram `deleted_at IS NULL` automaticamente.

---

## Roteamento no frontend

Todas as rotas são protegidas por [`ProtectedRoute`](../src/components/ProtectedRoute.js), exceto:

- `/login`
- `/forgot-password`
- `/aceitar-convite`

O Vercel está configurado com `rewrites` para redirecionar qualquer path para `index.html`, permitindo que o React Router gerencie a navegação client-side.

---

## Desenvolvimento local vs produção

| Aspecto | DEV | PROD |
|---------|-----|------|
| Supabase project | `tbzlezyzkicyvjujxlru` | `kkvnvlfyswevlpnchilu` |
| URL base | `http://localhost:3000` | `https://app.boostly.com.br` |
| Auth redirect URLs | `http://localhost:3000/aceitar-convite` | `https://app.boostly.com.br/aceitar-convite` |
| Deploy | `npm start` | Vercel (push para `main`) |
| Auth bypass | `?dev=1` → perfil mock `admin_isv` | — |
