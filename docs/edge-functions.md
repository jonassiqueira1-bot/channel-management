# Edge Functions

As Edge Functions rodam em **Deno** no runtime do Supabase. Têm acesso ao `SUPABASE_SERVICE_ROLE_KEY`, que permite operações privilegiadas sem restrição de RLS.

**URL base:**
- DEV: `https://tbzlezyzkicyvjujxlru.supabase.co/functions/v1/<nome>`
- PROD: `https://kkvnvlfyswevlpnchilu.supabase.co/functions/v1/<nome>`

**Deploy:**
```bash
npx supabase functions deploy <nome> --project-ref <project-ref>
```

---

## Padrão de autenticação

Todas as funções que requerem usuário logado seguem o mesmo padrão:

```ts
const authHeader = req.headers.get('Authorization') || ''
const callerClient = createClient(SUPABASE_URL, anonKey, {
  global: { headers: { Authorization: authHeader } },
})
const { data: { user }, error } = await callerClient.auth.getUser()
if (error || !user) return json({ error: 'Não autenticado' }, 401)
```

Isso valida o JWT do usuário **no servidor Supabase**, não apenas no lado do cliente.

---

## `invite-user`

Envia convite por e-mail para um Contato de Canal (seller) se tornar usuário `parceiro`.

### Autenticação
Requer JWT do usuário logado (`admin_isv`).

### Body (POST)

```json
{
  "email": "contato@empresa.com",
  "nome": "João Silva",
  "papel": "parceiro",
  "tipo_usuario": "externo",
  "contact_id": "<uuid do seller>"
}
```

### Fluxo principal (novo usuário)

```
1. Valida JWT do caller
2. Busca tenant_id do caller em profiles
3. POST /auth/v1/invite?redirect_to={APP_URL}/aceitar-convite
     data: { tenant_id, contact_id, role, nome }
4. INSERT pending_invites (status: 'pendente')
5. Retorna { ok: true }
```

### Fluxo alternativo (usuário já existe — HTTP 422)

```
1. Busca usuário em auth.users pelo e-mail
2. Busca branch_id do seller em sellers
3. UPDATE profiles SET contact_id, role='parceiro', branch_id
4. POST /auth/v1/magiclink → envia acesso direto
5. Retorna { ok: true, linked: true }
```

### Variáveis de ambiente necessárias

| Variável | Uso |
|----------|-----|
| `APP_URL` | Base da URL do redirect (`{APP_URL}/aceitar-convite`) |
| `SUPABASE_URL` | Automático |
| `SUPABASE_SERVICE_ROLE_KEY` | Automático |
| `SUPABASE_ANON_KEY` | Automático |

> `APP_URL` deve ser configurado manualmente nos Secrets do projeto Supabase:
> - DEV: `http://localhost:3000`
> - PROD: `https://app.boostly.com.br`

### Erros comuns

| Situação | Status | Mensagem |
|----------|--------|----------|
| Sem JWT | 401 | `Não autenticado` |
| Profile não encontrado | 403 | `Perfil não encontrado` |
| E-mail não informado | 400 | `email é obrigatório` |
| Erro no Supabase Auth | 400 | mensagem original do Supabase |

---

## `process-alerts`

Processa alertas agendados e dispara notificações (e-mail, tarefas, notificações in-app).

### Autenticação
Chamada via CRON ou manualmente com JWT de admin.

### O que faz

1. Lê todas as regras de alerta ativas (`alerts_rules`) do tenant.
2. Para cada regra, avalia as condições configuradas contra os dados (oportunidades, contratos, pagamentos, etc.).
3. Se as condições forem atendidas, cria um registro em `alerts` e dispara as ações configuradas:
   - `notificar` → INSERT em `alerts` (painel in-app)
   - `email` → chama `send-email`
   - `tarefa` → INSERT em `tarefas`

### Tipos de gatilho suportados

| Gatilho | Origem | Descrição |
|---------|--------|-----------|
| `oportunidade_parada` | oportunidades | Oportunidade sem atualização por N dias |
| `contrato_vencendo` | contratos | Contrato vence em N dias |
| `pagamento_vencido` | pagamentos | Pagamento em atraso |
| `meta_abaixo` | metas | Meta abaixo do threshold |
| `custom` | qualquer | Condições personalizadas via `condicoes[]` |

---

## `send-email`

Envia e-mails transacionais via **Resend**.

### Autenticação
Chamada internamente por outras Edge Functions (não exposta ao frontend diretamente).

### Body (POST)

```json
{
  "template": "convite_usuario",
  "to": "destinatario@empresa.com",
  "data": {
    "nome": "João Silva",
    "link": "https://app.boostly.com.br/aceitar-convite?token_hash=..."
  }
}
```

### Templates disponíveis

| Template | Assunto | Uso |
|----------|---------|-----|
| `boas_vindas` | Bem-vindo ao Boostly | Novo usuário criado |
| `convite_usuario` | Você foi convidado | Convite de parceiro |
| `pagamento_vencido` | Pagamento em atraso | Alerta financeiro |
| `contrato_vencendo` | Contrato vencendo | Alerta de contrato |
| `oportunidade_parada` | Oportunidade sem movimento | Alerta de pipeline |
| `alerta_generico` | Alerta Boostly | Alertas customizados |

### Variáveis de ambiente necessárias

| Variável | Uso |
|----------|-----|
| `RESEND_API_KEY` | Autenticação com Resend |

---

## `rd-station-sync`

Sincroniza dados (contatos, oportunidades) com o RD Station CRM.

### Autenticação
Requer JWT do usuário logado.

### O que faz

1. Valida JWT e busca `tenant_id`.
2. Lê credenciais OAuth do RD Station salvas em `integracoes`.
3. Faz GET na API do RD Station (`api.rd.services`) e upserta os dados localmente.
4. Atualiza `last_sync_at` na tabela `integracoes`.

### Dependência

A integração com RD Station precisa estar configurada em `/settings/integracoes` com as credenciais OAuth do tenant.

---

## `rd-station-webhook`

Recebe eventos em tempo real do RD Station (ex: negócio ganho, lead convertido).

### Autenticação
Via `?token=<webhook_token>` na query string. O token é gerado ao configurar a integração e salvo em `integracoes.config->webhook_token`.

### O que faz

1. Valida `webhook_token` → identifica o tenant.
2. Recebe o payload do evento RD Station.
3. Enfileira em `rd_events_queue` para processamento assíncrono.

---

## `process-rd-queue`

Processa a fila de eventos do RD Station (`rd_events_queue`).

### Autenticação
Chamada via CRON ou manualmente. Usa `service_role` diretamente.

### O que faz

1. Lê eventos pendentes da fila.
2. Para cada evento, executa a ação correspondente (criar/atualizar oportunidade, contato, etc.).
3. Marca o evento como processado ou como erro.

---

## `integration-webhook`

Handler genérico de webhooks para qualquer integração (não apenas RD Station).

### Autenticação
Via `?token=<webhook_token>` — mesmo padrão do `rd-station-webhook`, mas agnóstico ao provider.

### O que faz

1. Valida `webhook_token` → identifica `tenant_id` e `provider`.
2. Roteia o payload para o handler correto conforme `provider`.
3. Persiste o evento para processamento.

---

## Variáveis de ambiente — resumo

| Variável | Configuração | Quem usa |
|----------|-------------|----------|
| `APP_URL` | Manual (Secrets) | `invite-user` |
| `RESEND_API_KEY` | Manual (Secrets) | `send-email` |
| `SUPABASE_URL` | Automático | todas |
| `SUPABASE_SERVICE_ROLE_KEY` | Automático | todas |
| `SUPABASE_ANON_KEY` | Automático | `invite-user` |

As variáveis automáticas são injetadas pelo Supabase em todas as Edge Functions. As manuais precisam ser configuradas em:
**Supabase Dashboard → Project Settings → Edge Functions → Secrets**
