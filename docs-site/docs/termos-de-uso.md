---
id: termos-de-uso
title: Termos de Uso
sidebar_position: 99
---

# Termos de Uso e Política de Segurança — Plataforma Boostly

**Versão:** 1.2
**Última atualização:** Julho de 2026
**Vigência:** A partir do aceite eletrônico pelo contratante.

---

## 1. Das Partes e do Escopo do Serviço

O presente instrumento regula o uso da plataforma Boostly, uma solução de Software como Serviço (SaaS) focada na gestão de canais de vendas, regras de comissionamento dinâmico e automação de fluxos comerciais, operada pela **Boostly** ("Boostly"). Ao manifestar o aceite eletrônico, o contratante ("Cliente") vincula-se integralmente a estes Termos.

---

## 2. Da Infraestrutura, Disponibilidade (SLA) e Segurança da Informação

O Boostly adota conceitos de arquitetura em nuvem serverless moderna para garantir a máxima performance, segurança e integridade dos dados operacionais e financeiros.

### 2.1 Responsabilidade Compartilhada de Infraestrutura

A plataforma é hospedada em infraestrutura global de alta disponibilidade, utilizando como suboperadores a **Vercel** (camada de aplicação e distribuição em borda - Edge Network) e o **Supabase** (camada de banco de dados estruturada em PostgreSQL, hospedada nos servidores da Amazon Web Services - AWS). O Cliente declara estar ciente de que o Boostly herda e se beneficia das certificações internacionais de segurança desses provedores, incluindo SOC 2 Type II e ISO 27001.

### 2.2 Perímetro de Segurança Geográfico (Geoblocking)

Como medida ativa de mitigação de riscos, ataques de negação de serviço (DDoS) e varreduras maliciosas, o Boostly utiliza proteção de borda via Cloudflare com bloqueio rigoroso de tráfego originado fora do território da República Federativa do Brasil.

**Parágrafo Único:** O Cliente está ciente de que acessos à plataforma a partir de conexões internacionais (incluindo viagens ao exterior ou uso de redes VPN sem terminação no Brasil) serão bloqueados por padrão por razões de segurança de rede, não configurando falha de prestação de serviço.

### 2.3 Backups e Retenção

O banco de dados do Supabase executa backups diários automáticos com janela de retenção de 7 (sete) dias. Modificações estruturais na base de dados geram trilha de auditoria registrada para integridade de contratos e tabelas de preços.

### 2.4 Monitoramento de Aplicação

A plataforma utiliza o ecossistema Sentry para detecção em tempo real de exceções de código e monitoramento de performance (APM). O Sentry atua em estrita conformidade com a LGPD através de mascaramento automatizado (data scrubbing) de quaisquer dados sensíveis ou informações de identificação pessoal (PII) antes da geração de logs técnicos.

---

## 3. Da Responsabilidade pelas Regras Comerciais, Tabelas de Preço e Comissões

O Boostly fornece o motor tecnológico para a execução das regras de negócio parametrizadas pelo Cliente, atuando como mero executor de dados.

### 3.1 Parametrização de Dados

É de responsabilidade única, exclusiva e indelegável do Cliente a configuração de tabelas de preços, definição de vigências mensais, alíquotas de impostos, faixas de comissionamento e atribuição de regras a vendedores ou canais parceiros.

### 3.2 Isenção por Erros de Configuração

O Boostly não se responsabiliza, em hipótese alguma, por:

- Prejuízos financeiros, pagamentos indevidos de comissões, cobranças a maior ou a menor geradas em decorrência de erros de parametrização lógica ou matemática efetuados pelo Cliente em seu painel administrador.
- Lançamentos calculados incorretamente por força de dados históricos preenchidos em desacordo com as práticas comerciais vigentes do Cliente.

### 3.3 Automação Cíclica (Tarefas Cron)

O sistema utiliza rotinas automáticas agendadas (Cron Jobs / pg_cron) para processar a virada mensal de vigência de tabelas de preços e consolidação/fechamento de relatórios de comissão. O Cliente compromete-se a auditar suas configurações antes dos períodos de virada de ciclo.

---

## 4. Das Integrações e Webhooks de Terceiros (Asaas e Resend)

O Boostly opera integrado a ecossistemas terceiros para viabilizar automações financeiras e de comunicação.

### 4.1 Gateway de Pagamento

O processamento de faturamento, liquidação de Pix/Boletos e emissão de notas fiscais ocorrem fora dos servidores do Boostly, diretamente na conta de titularidade do Cliente junto ao gateway **Asaas**. O Boostly limita-se a receber e processar as confirmações de pagamento via Webhook.

### 4.2 E-mails Transacionais

O envio de notificações críticas, alertas configurados pelo usuário e convites de novos parceiros utiliza a infraestrutura de entrega do **Resend**.

### 4.3 Exclusão de Responsabilidade por Instabilidade Externa

O Boostly não será responsabilizado por atrasos na liberação de acessos, falhas no envio de notificações ou falhas na atualização de status de contratos decorrentes de indisponibilidades técnicas, atrasos na entrega de Webhooks ou instabilidades sistêmicas por parte do Asaas ou do Resend.

---

## 5. Da Proteção de Dados (LGPD) e Logs de Auditoria

### 5.1 Natureza do Tratamento

Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o Cliente figura na qualidade de **Controlador** dos dados pessoais inseridos na plataforma (incluindo dados de seus parceiros, franqueados e vendedores), competindo-lhe a definição da base legal adequada. O Boostly atua estritamente como **Operador**, processando os dados conforme as instruções e parametrizações técnicas do Controlador.

### 5.2 Tabela de Retenção de Dados e Logs de Segurança

Para fins de conformidade e auditoria, as partes acordam os seguintes prazos rígidos de armazenamento de registros:

| Tipo de Dado / Registro | Período de Retenção Ativa | Finalidade do Armazenamento |
|---|---|---|
| Dados da Conta e Operacionais | Vigência contratual + 90 dias | Continuidade do serviço e janela de exportação pós-rescisão. |
| Logs de Auditoria (Ações de Usuário) | 12 (doze) meses | Trilha de segurança e conformidade exigida pelo art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet). |
| Logs de Integração e Webhooks | 90 (noventa) dias | Depuração técnica de eventos financeiros (Asaas). |
| Logs de Sistema e Erros (Sentry) | 30 (trinta) dias | Diagnóstico de bugs e estabilidade de performance da UI. |

### 5.3 Eliminação Definitiva

Decorrido o prazo de 90 (noventa) dias contados do encerramento definitivo do contrato, o Boostly efetuará a exclusão lógica e definitiva de todos os dados operacionais do Cliente de seus servidores de produção, sem possibilidade de recuperação. Cabe ao Cliente realizar o download de seus relatórios de auditoria e comissões antes do término desse prazo.

---

## 6. Do Cancelamento, Carência e Encerramento Contratual

### 6.1 Solicitação de Cancelamento

O Cliente pode solicitar o cancelamento de sua assinatura a qualquer momento diretamente pelo painel de configurações da plataforma (Configurações → Assinatura → Solicitar cancelamento), sem necessidade de aviso prévio por outros canais.

### 6.2 Período de Carência de 90 Dias

Em observância ao artigo 49 do Código de Defesa do Consumidor e às práticas do mercado SaaS, o pedido de cancelamento ativa um **período de carência de 90 (noventa) dias corridos**, durante os quais:

- O Cliente mantém acesso integral à plataforma e a todos os seus dados;
- **3 (três) faturas mensais serão cobradas normalmente**, referentes à utilização do serviço durante a carência;
- O valor de cada fatura é calculado com base na faixa de usuários ativos vigente no momento de geração da cobrança.

**Parágrafo Único:** O período de carência é irrenunciável. Não há encerramento imediato da cobrança na data do pedido de cancelamento.

### 6.3 Encerramento e Portabilidade de Dados

Ao término dos 90 dias de carência, o acesso à plataforma é encerrado automaticamente. O Cliente tem até o último dia da carência para exportar seus relatórios, histórico de comissões e demais dados operacionais. Decorrido esse prazo, aplica-se o disposto na cláusula 5.3 (eliminação definitiva em 90 dias).

### 6.4 Período de Trial Gratuito

Novos clientes têm acesso à plataforma por 14 (quatorze) dias em período de trial gratuito, sem necessidade de cartão de crédito. Ao término do trial, caso a assinatura não seja confirmada mediante preenchimento dos dados de cobrança e realização do primeiro pagamento, o acesso é encerrado automaticamente. Os dados do trial são mantidos por 90 (noventa) dias para eventual reativação, após o qual são excluídos definitivamente.

---

## 8. Limitação de Responsabilidade Financeira (Cláusula Penal)

Em nenhuma circunstância o Boostly será responsável por danos indiretos, lucros cessantes, perda de receita, perda de dados ou danos comerciais decorrentes do uso ou da incapacidade de usar a plataforma. A responsabilidade total agregada do Boostly face ao Cliente, por qualquer pleito indenizatório judicial ou extrajudicial, fica estritamente limitada ao montante histórico comprovadamente pago pelo Cliente nos 3 (três) meses imediatamente anteriores ao evento gerador do dano.

---

## 9. Lei Aplicável e Foro

Estes Termos são integralmente regidos e interpretados de acordo com as leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP como o único competente para dirimir quaisquer controvérsias decorrentes deste instrumento, com expressa renúncia a qualquer outro.
