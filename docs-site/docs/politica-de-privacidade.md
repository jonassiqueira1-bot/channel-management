---
id: politica-de-privacidade
title: Política de Privacidade
sidebar_position: 98
---

# Política de Privacidade — Plataforma Boostly

**Versão:** 1.0
**Última atualização:** Julho de 2026
**Vigência:** A partir do aceite eletrônico pelo contratante.

---

## 1. Identificação do Controlador

A plataforma Boostly é operada pela **Boostly** ("nós", "nosso"), responsável pelo tratamento dos dados pessoais coletados no âmbito da prestação de seus serviços, na qualidade de **Controladora** conforme definido pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).

Contato do encarregado (DPO): **privacidade@boostly.com.br**

---

## 2. Dados Coletados e Finalidades

### 2.1 Dados de Cadastro e Identificação

| Dado | Finalidade | Base Legal (LGPD) |
|------|-----------|-------------------|
| Nome completo ou razão social | Identificação do titular da conta e emissão de cobranças | Execução de contrato (art. 7º, V) |
| CPF ou CNPJ | Emissão de cobranças via gateway de pagamento (Asaas) | Execução de contrato (art. 7º, V) |
| Endereço de e-mail | Comunicações operacionais, autenticação e notificações | Execução de contrato (art. 7º, V) |
| Telefone / WhatsApp | Suporte e notificações de cobrança | Legítimo interesse (art. 7º, IX) |
| Cargo e nome | Personalização da experiência e identificação interna | Execução de contrato (art. 7º, V) |

### 2.2 Dados Operacionais e Comerciais

Os dados inseridos pelos usuários na plataforma (oportunidades de vendas, contratos, comissões, metas, parceiros, projetos e histórico de ações comerciais) são tratados exclusivamente para a prestação do serviço contratado. O Boostly atua como **Operador** em relação a esses dados, sendo o Cliente a Controladora responsável pela sua legalidade e adequação à LGPD.

### 2.3 Dados de Acesso e Segurança

| Dado | Finalidade | Retenção |
|------|-----------|----------|
| Endereço IP de acesso | Segurança, detecção de fraude e geoblocking | 30 dias |
| Logs de autenticação (login/logout) | Auditoria de segurança e detecção de acessos não autorizados | 1 ano |
| Logs de alterações críticas (comissões, contratos, tabelas de preço) | Trilha de auditoria imutável para integridade comercial | 1 ano |
| Logs de webhooks e integrações | Rastreabilidade de eventos e diagnóstico técnico | 90 dias |

### 2.4 Dados de Monitoramento de Erros

A plataforma utiliza o **Sentry** para monitoramento de exceções técnicas em tempo real. O Sentry opera com **data scrubbing automático**, removendo quaisquer dados pessoais ou sensíveis antes da geração de relatórios de erro. Nenhum dado de negócio ou identificação pessoal é transmitido ao Sentry.

---

## 3. Compartilhamento de Dados com Terceiros

O Boostly não vende, aluga ou comercializa dados pessoais. O compartilhamento ocorre exclusivamente com suboperadores necessários à prestação do serviço:

| Suboperador | Finalidade | País/Região | Certificação |
|-------------|-----------|-------------|-------------|
| **Supabase** (via AWS) | Banco de dados e autenticação | EUA (AWS us-east-1) | SOC 2 Type II |
| **Vercel** | Hospedagem da aplicação e CDN | EUA / Edge Global | SOC 2 Type II |
| **Cloudflare** | Proteção de borda, WAF e geoblocking | Global | ISO 27001 |
| **Asaas** | Gateway de pagamento (geração de Pix/Boleto) | Brasil | PCI DSS |
| **Resend** | Envio de e-mails transacionais | EUA | SOC 2 |
| **Sentry** | Monitoramento de erros (sem dados pessoais) | EUA | SOC 2 Type II |
| **Crisp** | Suporte via chat (dados inseridos voluntariamente) | França | GDPR |

Todos os suboperadores operam sob acordos de processamento de dados compatíveis com a LGPD e/ou GDPR.

---

## 4. Transferência Internacional de Dados

Alguns suboperadores listados acima estão localizados fora do Brasil. Essas transferências ocorrem com base no art. 33 da LGPD, mediante:

- Existência de grau de proteção adequado reconhecido pela ANPD; ou
- Adoção de cláusulas contratuais específicas e garantias adequadas de proteção.

---

## 5. Direitos dos Titulares

Nos termos dos arts. 17 a 22 da LGPD, o titular dos dados pessoais tem direito a:

- **Confirmação** da existência de tratamento;
- **Acesso** aos dados tratados;
- **Correção** de dados incompletos, inexatos ou desatualizados;
- **Anonimização, bloqueio ou eliminação** de dados desnecessários ou tratados em desconformidade com a LGPD;
- **Portabilidade** dos dados a outro fornecedor de serviço;
- **Eliminação** dos dados tratados com consentimento;
- **Informação** sobre entidades com as quais os dados foram compartilhados;
- **Revogação do consentimento**, quando aplicável;
- **Oposição** ao tratamento realizado com base em legítimo interesse.

Para exercer qualquer desses direitos, envie solicitação para **privacidade@boostly.com.br**. O prazo de resposta é de até **15 dias corridos**.

---

## 6. Segurança dos Dados

O Boostly adota as seguintes medidas técnicas e organizacionais para proteção dos dados:

- **Criptografia em trânsito:** TLS 1.2+ em todas as comunicações
- **Criptografia em repouso:** AES-256 no banco de dados (Supabase/AWS)
- **Controle de acesso:** Row Level Security (RLS) no banco de dados, garantindo isolamento total entre tenants
- **Autenticação:** JWT com validação server-side em cada requisição
- **Perímetro geográfico:** Bloqueio de acessos fora do Brasil via Cloudflare WAF
- **Monitoramento:** Detecção de anomalias e alertas em tempo real via Sentry
- **Princípio do menor privilégio:** Cada perfil de usuário acessa apenas os dados necessários à sua função

---

## 7. Retenção e Eliminação de Dados

| Categoria | Prazo de Retenção | Critério |
|-----------|------------------|---------|
| Dados operacionais e comerciais | Vigência contratual + 90 dias | Janela de exportação pós-encerramento |
| Logs de auditoria (comissões, contratos) | 1 ano | Obrigação legal e integridade comercial |
| Logs de webhooks e integrações | 90 dias | Rastreabilidade técnica |
| Logs de sistema | 30 dias | Diagnóstico operacional |
| Dados de conta após encerramento | 90 dias | Possibilidade de reativação ou exportação |
| Dados de trial não convertido | 90 dias após expiração | Eliminação automática |

Após o vencimento dos prazos, os dados são **eliminados definitivamente** dos servidores de produção, sem possibilidade de recuperação.

---

## 8. Cookies e Rastreamento

A plataforma Boostly utiliza exclusivamente **cookies técnicos essenciais** para funcionamento da sessão autenticada. Não utilizamos cookies de rastreamento publicitário, remarketing ou análise comportamental de terceiros.

---

## 9. Crianças e Adolescentes

A plataforma Boostly destina-se exclusivamente ao uso corporativo (B2B). Não coletamos intencionalmente dados de menores de 18 anos. Caso identifique tratamento indevido de dados de menores, entre em contato com **privacidade@boostly.com.br** para eliminação imediata.

---

## 10. Alterações nesta Política

Esta Política pode ser atualizada periodicamente para refletir mudanças nos serviços, legislação ou práticas de privacidade. Alterações relevantes serão comunicadas por e-mail com antecedência mínima de **15 dias corridos** antes de entrarem em vigor. O uso continuado da plataforma após a vigência das alterações implica aceite das novas condições.

---

## 11. Lei Aplicável e Foro

Esta Política é regida pela **Lei nº 13.709/2018 (LGPD)** e demais normas aplicáveis. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias.

---

*Para dúvidas, solicitações ou exercício de direitos:* **privacidade@boostly.com.br**
