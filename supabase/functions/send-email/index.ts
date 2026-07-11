import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Templates de email disponíveis
type TemplateName =
  | 'boas_vindas'
  | 'convite_usuario'
  | 'recuperar_senha'
  | 'pagamento_vencido'
  | 'contrato_vencendo'
  | 'oportunidade_parada'
  | 'alerta_generico'

interface EmailPayload {
  template: TemplateName
  to: string | string[]
  data: Record<string, unknown>
}

function buildEmail(template: TemplateName, data: Record<string, unknown>): { subject: string; html: string } {
  const base = (content: string) => `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f0f2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f8;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,127,232,0.10);">
            <!-- Header com gradiente da marca -->
            <tr><td style="background:linear-gradient(135deg,#4F7FE8 0%,#2B52C8 100%);padding:28px 36px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:rgba(255,255,255,0.2);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                          <span style="color:#ffffff;font-size:22px;font-weight:800;line-height:40px;display:block;">B</span>
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Boostly</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>
            <!-- Conteúdo -->
            <tr><td style="padding:36px;">
              ${content}
            </td></tr>
            <!-- Rodapé -->
            <tr><td style="background:#f8f9ff;padding:20px 36px;border-top:1px solid #e8ecf8;">
              <p style="margin:0;font-size:12px;color:#9aa3bf;">Boostly · Canal de Parceiros · <a href="https://boostly.com.br" style="color:#4F7FE8;text-decoration:none;">boostly.com.br</a></p>
              <p style="margin:6px 0 0;font-size:11px;color:#b8bfd4;">Você está recebendo este email pois tem uma conta no Boostly.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  const btn = (label: string, url: string) =>
    `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#4F7FE8 0%,#2B52C8 100%);color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:24px;letter-spacing:0.2px;">${label}</a>`

  const h1 = (text: string) =>
    `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a2a5e;">${text}</h1>`

  const p = (text: string) =>
    `<p style="margin:8px 0;font-size:15px;color:#4a5578;line-height:1.7;">${text}</p>`

  const badge = (text: string, color: string) =>
    `<span style="display:inline-block;background:${color}18;color:${color};padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:16px;">${text}</span>`

  switch (template) {
    case 'boas_vindas':
      return {
        subject: `Bem-vindo ao Boostly, ${data.nome}!`,
        html: base(`
          ${h1(`Olá, ${data.nome}! 👋`)}
          ${p(`Sua conta no <strong>Boostly</strong> foi criada com sucesso.`)}
          ${p(`Acesse o painel para começar a gerenciar seu canal de parceiros.`)}
          ${btn('Acessar o Boostly', `https://boostly.com.br`)}
        `),
      }

    case 'convite_usuario':
      return {
        subject: `Você foi convidado para o Boostly`,
        html: base(`
          ${h1(`Convite para o Boostly`)}
          ${p(`<strong>${data.convidado_por}</strong> convidou você para acessar o painel <strong>${data.tenant_nome}</strong>.`)}
          ${p(`Clique no botão abaixo para aceitar o convite e definir sua senha.`)}
          ${btn('Aceitar convite', `${data.link}`)}
          ${p(`<small style="color:#999;">O link expira em 48 horas.</small>`)}
        `),
      }

    case 'recuperar_senha':
      return {
        subject: `Redefinição de senha — Boostly`,
        html: base(`
          ${h1(`Redefinir sua senha`)}
          ${p(`Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Boostly</strong>.`)}
          ${p(`Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.`)}
          ${btn('Redefinir senha', `${data.link}`)}
          ${p(`<small style="color:#999;">Se você não solicitou a redefinição de senha, ignore este e-mail — sua senha permanece a mesma.</small>`)}
        `),
      }

    case 'pagamento_vencido':
      return {
        subject: `⚠️ Pagamento vencido · ${data.empresa}`,
        html: base(`
          ${badge('VENCIDO', '#ef4444')}
          ${h1(`Pagamento em atraso`)}
          ${p(`O pagamento de <strong>${data.empresa}</strong> está vencido há <strong>${data.dias} dia(s)</strong>.`)}
          ${p(`Valor: <strong>${data.valor}</strong> · Vencimento: <strong>${data.data_vencimento}</strong>`)}
          ${btn('Ver Pagamentos', `https://boostly.com.br/comissoes`)}
        `),
      }

    case 'contrato_vencendo':
      return {
        subject: `📋 Contrato vence em ${data.dias} dias · ${data.empresa}`,
        html: base(`
          ${badge('ATENÇÃO', '#f59e0b')}
          ${h1(`Contrato próximo do vencimento`)}
          ${p(`O contrato de <strong>${data.empresa}</strong> vence em <strong>${data.dias} dia(s)</strong> (${data.data_fim}).`)}
          ${p(`Produto: <strong>${data.produto}</strong>`)}
          ${btn('Ver Contrato', `https://boostly.com.br/contratos`)}
        `),
      }

    case 'oportunidade_parada':
      return {
        subject: `🔴 Oportunidade parada há ${data.dias}d · ${data.empresa}`,
        html: base(`
          ${badge('PARADA', '#ef4444')}
          ${h1(`Oportunidade sem movimentação`)}
          ${p(`A oportunidade <strong>${data.oportunidade}</strong> de <strong>${data.empresa}</strong> está parada há <strong>${data.dias} dia(s)</strong>.`)}
          ${p(`Etapa atual: <strong>${data.etapa}</strong> · Responsável: <strong>${data.responsavel}</strong>`)}
          ${btn('Ver no Pipeline', `https://boostly.com.br/pipeline`)}
        `),
      }

    case 'alerta_generico':
    default:
      return {
        subject: `${data.titulo || 'Alerta Boostly'}`,
        html: base(`
          ${h1(`${data.titulo || 'Notificação'}`)}
          ${p(`${data.mensagem || ''}`)}
          ${data.link ? btn('Ver detalhes', `${data.link}`) : ''}
        `),
      }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY não configurada' }, 500)

  try {
    const payload: EmailPayload = await req.json()
    const { template, to, data } = payload

    if (!template || !to) return json({ error: 'template e to são obrigatórios' }, 400)

    const { subject, html } = buildEmail(template, data || {})

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Boostly <notificacoes@boostly.com.br>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const result = await res.json()
    if (!res.ok) return json({ error: result }, res.status)

    return json({ ok: true, id: result.id })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
