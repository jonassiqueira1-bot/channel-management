---
id: mapeamento-de-campos
title: Mapeamento de Campos
sidebar_position: 2
---

# Mapeamento de Campos

O mapeamento define como os dados do payload do webhook se transformam nos campos de uma Oportunidade no Boostly.

## Como configurar

1. Em **Configurações → Integrações**, abra a integração
2. Na aba **Mapeamento de Campos**, associe cada campo do Boostly ao caminho correspondente no JSON do seu webhook

## Exemplo de mapeamento

Se seu sistema envia:
```json
{
  "lead": {
    "name": "Maria",
    "email": "maria@empresa.com"
  }
}
```

Configure:
- **Contato Nome** → `lead.name`
- **Contato E-mail** → `lead.email`

## Campos suportados

| Campo Boostly | Tipo |
|---------------|------|
| Título | Texto |
| Empresa | Texto |
| Contato Nome | Texto |
| Contato E-mail | E-mail |
| Contato Telefone | Telefone |
| Valor | Número |
| Origem | Texto |
| Responsável | Texto |
| Prazo | Data |
| Situação | Enum |
| Descrição | Texto longo |

:::info
Campos não mapeados são preenchidos com valores padrão ou deixados em branco.
:::
