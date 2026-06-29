---
id: webhook
title: Integração via Webhook
sidebar_position: 1
---

# Integração via Webhook

O Boostly aceita leads de qualquer sistema externo via **webhook HTTP**. Cada tenant tem sua própria URL e token únicos.

## Obtendo sua URL de webhook

1. Vá em **Configurações → Integrações**
2. Clique em **Nova Integração**
3. Copie a **URL do Webhook** e o **Token** gerados

## Enviando um lead

Faça um `POST` para a URL do webhook com o token no header:

```bash
curl -X POST https://tbzlezyzkicyvjujxlru.supabase.co/functions/v1/integration-webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: SEU_TOKEN" \
  -d '{
    "name": "João Silva",
    "email": "joao@empresa.com",
    "mobile_phone": "11999999999",
    "company_name": "Empresa SA"
  }'
```

## Processamento

Os leads recebidos ficam em fila e são processados automaticamente **a cada hora**. Após processamento, aparecem como oportunidades no Pipeline no funil configurado na integração.

:::tip
Para processar imediatamente, acesse **Configurações → Integrações** e clique em **Processar agora**.
:::
