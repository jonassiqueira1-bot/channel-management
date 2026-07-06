# Boostly — Channel Management

SaaS white-label para ISVs (Independent Software Vendors) gerenciarem seu canal de parceiros. Permite cadastrar revendedores (sellers), convidar contatos de canal como usuários com acesso restrito, acompanhar o pipeline de oportunidades e executar ações de CS e marketing.

**Produção:** [boostly.com.br/login](https://www.boostly.com.br/login)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 (Create React App) |
| Roteamento | React Router v6 |
| Backend / BaaS | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Deploy frontend | Vercel |
| Deploy Edge Functions | Supabase CLI |
| Ícones | Lucide React |
| Drag & Drop | @dnd-kit |
| Monitoramento | Sentry |

---

## Ambientes

| Ambiente | Supabase Project | URL |
|----------|-----------------|-----|
| DEV | `tbzlezyzkicyvjujxlru` | `http://localhost:3000` |
| PROD | `kkvnvlfyswevlpnchilu` | `https://app.boostly.com.br` |

---

## Pré-requisitos

- Node.js 18+
- npm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (para migrations e Edge Functions)

---

## Configuração local

### 1. Clone e instale

```bash
git clone <repo-url>
cd channel-management
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
REACT_APP_SUPABASE_URL=https://tbzlezyzkicyvjujxlru.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon-key-do-projeto-dev>
```

> Para apontar para PROD, substitua pelo project ref `kkvnvlfyswevlpnchilu` e a anon key correspondente.

### 3. Rode o projeto

```bash
npm start
```

Acessa em `http://localhost:3000`.

#### Bypass de autenticação em dev

Para pular o login durante desenvolvimento, acesse:

```
http://localhost:3000?dev=1
```

Isso ativa um perfil mock (`admin_isv`) salvo no `sessionStorage`. Funciona apenas com `NODE_ENV=development`.

---

## Estrutura de pastas

```
src/
  components/      # Componentes reutilizáveis (Sidebar, Header, Modais, etc.)
  contexts/        # AuthContext (sessão + validação JWT)
  data/            # Constantes e configs de perfis/papéis (mockPerfis.js)
  hooks/           # Hooks de dados: useProfile, useCampanhas, useUsuarios, etc.
  layouts/         # FullPageEdit, SettingsLayout, etc.
  lib/             # Cliente Supabase (supabase.js)
  pages/           # Uma pasta/arquivo por rota principal
supabase/
  functions/       # Edge Functions (Deno)
  migrations/      # Migrations SQL versionadas
```

---

## Papéis de usuário

| Papel | Descrição |
|-------|-----------|
| `admin_isv` | Acesso total. Gerencia empresa, usuários e configurações. |
| `vendedor` | Acesso ao pipeline, contatos e tarefas da sua filial. |
| `financeiro` | Acesso a relatórios e módulo financeiro. |
| `cs` | Acesso a projetos e ações de Customer Success. |
| `projetos` | Acesso ao módulo de projetos. |
| `parceiro` | Acesso restrito ao portal do parceiro (contato de canal convidado via e-mail). |

As rotas permitidas por papel estão em [`src/data/mockPerfis.js`](src/data/mockPerfis.js).

---

## Fluxo de convite de parceiro

1. Admin cria um registro de **Seller** (Contato de Canal) em `/settings/vendedores`.
2. Na tela do seller, envia convite por e-mail via Edge Function `invite-user`.
3. O usuário recebe um e-mail e clica no link `→ /aceitar-convite`.
4. A página [`AceitarConvite.js`](src/pages/AceitarConvite.js) verifica o token (fluxo PKCE: `token_hash` + `type`).
5. Um trigger Postgres (`on_partner_invite_confirm`) preenche automaticamente `contact_id`, `role = 'parceiro'` e `branch_id` no perfil do novo usuário.
6. O registro em `pending_invites` é atualizado para `status = 'aceito'`.

---

## Segurança — validação de JWT

O [`AuthContext`](src/contexts/AuthContext.js) valida o JWT contra o servidor Supabase (`getUser()`) **antes** de liberar qualquer rota ao app. Isso garante que usuários com tokens de sessão locais mas deletados da base de autenticação sejam deslogados imediatamente na próxima abertura do app.

```
App abre → getUser() (server-side) → OK? → getSession() → libera app
                                   → Erro → signOut() → tela de login
```

---

## Migrations

As migrations ficam em `supabase/migrations/` e são versionadas por timestamp. Para aplicar em um ambiente:

```bash
# DEV
npx supabase db push --project-ref tbzlezyzkicyvjujxlru

# PROD
npx supabase db push --project-ref kkvnvlfyswevlpnchilu
```

Ou cole o conteúdo do arquivo diretamente no **SQL Editor** do painel Supabase do ambiente desejado.

---

## Edge Functions

As funções ficam em `supabase/functions/`. Para deployar:

```bash
# DEV
npx supabase functions deploy <nome-da-funcao> --project-ref tbzlezyzkicyvjujxlru

# PROD
npx supabase functions deploy <nome-da-funcao> --project-ref kkvnvlfyswevlpnchilu
```

| Função | Descrição |
|--------|-----------|
| `invite-user` | Envia convite por e-mail para contato de canal. Vincula `contact_id`, `role` e `branch_id`. |
| `process-alerts` | Processa alertas agendados e dispara notificações. |
| `send-email` | Envio de e-mails via Resend. |
| `rd-station-sync` | Sincronização com RD Station CRM. |
| `rd-station-webhook` | Recebe webhooks do RD Station. |
| `integration-webhook` | Handler genérico de webhooks de integrações. |
| `process-rd-queue` | Processa fila de eventos do RD Station. |

A variável de ambiente `APP_URL` deve estar configurada nos **Secrets** de cada projeto Supabase:

- DEV: `APP_URL = http://localhost:3000`
- PROD: `APP_URL = https://app.boostly.com.br`

---

## Deploy para produção

O deploy é feito via Vercel conectado ao branch `main`.

```bash
git checkout main
git merge develop
git push origin main
```

> Nunca faça commit direto em `main`. Todo desenvolvimento ocorre em `develop`.

O `vercel.json` configura o build com `CI=false` e redireciona todas as rotas para `index.html` (SPA).

---

## Git workflow

| Branch | Uso |
|--------|-----|
| `develop` | Branch de desenvolvimento. Todos os commits vão aqui. |
| `main` | Produção. Merge de `develop` → `main` dispara deploy na Vercel. |
