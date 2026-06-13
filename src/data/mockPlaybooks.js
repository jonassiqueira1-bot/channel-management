// ─── Mock: Playbooks v2 — Cadastros individuais ───────────────────────────────

export const PB_STORAGE_KEY           = 'playbook:playbooks_v2'
export const PB_STEPS_STORAGE_KEY     = 'playbook:funnel_steps_v2'
export const PB_REFS_STORAGE_KEY      = 'playbook:references_v2'
export const PB_RESOURCES_STORAGE_KEY = 'playbook:resources_v2'

export const STAGE_CFG = {
  prospeccao:   { label: 'Prospecção',   icon: '🔍', color: '#6366F1', bg: '#EEF2FF' },
  qualificacao: { label: 'Qualificação', icon: '✅', color: '#3B82F6', bg: '#DBEAFE' },
  diagnostico:  { label: 'Diagnóstico',  icon: '🔬', color: '#8B5CF6', bg: '#EDE9FE' },
  proposta:     { label: 'Proposta',     icon: '📋', color: '#F59E0B', bg: '#FEF3C7' },
  fechamento:   { label: 'Fechamento',   icon: '🏁', color: '#10B981', bg: '#D1FAE5' },
}

export const RESOURCE_CFG = {
  pdf:   { icon: '📄', label: 'PDF',          color: '#EF4444', bg: '#FEE2E2' },
  pptx:  { icon: '📊', label: 'Apresentação', color: '#F59E0B', bg: '#FEF3C7' },
  xls:   { icon: '📈', label: 'Planilha',     color: '#10B981', bg: '#D1FAE5' },
  video: { icon: '▶',  label: 'Vídeo',        color: '#6366F1', bg: '#EEF2FF' },
  link:  { icon: '🔗', label: 'Link',         color: '#3B82F6', bg: '#DBEAFE' },
  doc:   { icon: '📝', label: 'Documento',    color: '#8B5CF6', bg: '#EDE9FE' },
  outro: { icon: '📌', label: 'Outro',        color: '#6B7280', bg: '#F3F4F6' },
}

export const SEGMENT_OPTIONS = ['SaaS / ISV', 'Saúde', 'Indústria', 'Varejo', 'Educação', 'Serviços', 'Agronegócio', 'Outro']
export const REGION_OPTIONS  = ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte', 'Nacional']

// ─── Playbooks (registros mestre) ─────────────────────────────────────────────
export const MOCK_PLAYBOOKS = [
  {
    id: 'pb-1',
    tenant_id: 't1',
    title: 'Canal NG Pro — Vendas para SaaS / ISV',
    segment: 'SaaS / ISV',
    description: 'Playbook completo para a venda do Canal NG Pro a empresas ISV. Cobre desde a prospecção de parceiros até o fechamento e onboarding.',
    is_active: true,
    created_by: 'Admin',
    created_at: '2026-04-01T10:00:00',
    updated_at: '2026-06-10T14:00:00',
  },
  {
    id: 'pb-2',
    tenant_id: 't1',
    title: 'Canal NG Saúde — Healthtech & Clínicas',
    segment: 'Saúde',
    description: 'Abordagem especializada para o mercado de saúde digital. Scripts e argumentação adaptados às dores de healthtechs, clínicas e distribuidores de soluções médicas.',
    is_active: true,
    created_by: 'Mariana Silva',
    created_at: '2026-04-15T09:00:00',
    updated_at: '2026-06-05T11:00:00',
  },
  {
    id: 'pb-3',
    tenant_id: 't1',
    title: 'Canal NG Indústria — Distribuidores Industriais',
    segment: 'Indústria',
    description: 'Material focado em distribuidores industriais e empresas de automação. Argumento de venda centrado em eficiência operacional e gestão de rede de revendas.',
    is_active: true,
    created_by: 'Admin',
    created_at: '2026-05-01T10:00:00',
    updated_at: '2026-06-08T09:00:00',
  },
]

// ─── Etapas do Funil (por Playbook) ───────────────────────────────────────────
export const MOCK_FUNNEL_STEPS = [
  // ── Playbook 1 — SaaS/ISV ────────────────────────────────────────────────
  {
    id: 'fs-101', playbook_id: 'pb-1', tenant_id: 't1',
    stage: 'prospeccao', title: 'Identificando o Parceiro Ideal (ICP)',
    sort_order: 1,
    content: `## Perfil Ideal de Canal para SaaS/ISV

O parceiro ideal é uma empresa de tecnologia que:

- Possui base de clientes em PMEs ou médias empresas
- Atua nos segmentos de **SaaS, Integração ou Consultoria de TI**
- Tem equipe comercial própria (mínimo 2 vendedores)
- Fatura entre R$ 500 mil e R$ 5 milhões/ano em licenças ou serviços

---

## Fontes de Prospecção

- **LinkedIn Sales Navigator** — filtros: cargo CEO/Diretor, setor Tecnologia
- **Eventos de tecnologia** (CIAB, AWS Summit, Microsoft Inspire)
- **Indicações** da rede de parceiros existente

---

## Script de Abordagem (LinkedIn / Cold Call)

> **Abertura:** "Olá [Nome], vi que a [Empresa] atua no segmento de [Segmento] — portfólio muito interessante."
>
> **Gancho:** "Estamos expandindo nossa rede de parceiros ISV. Empresas como a sua geralmente veem +30% de MRR recorrente em 6 meses com nossa plataforma."
>
> **CTA:** "Você teria 20 minutos essa semana para conhecer o modelo?"

---

## Critérios de Entrada no CRM

- [ ] Decisor identificado (nome + cargo + email)
- [ ] Segmento e porte compatíveis com o ICP
- [ ] Interesse mínimo confirmado`,
    created_at: '2026-04-01T10:00:00', updated_at: '2026-06-01T09:00:00',
  },
  {
    id: 'fs-102', playbook_id: 'pb-1', tenant_id: 't1',
    stage: 'qualificacao', title: 'Qualificação com Framework BANT',
    sort_order: 2,
    content: `## Objetivo

Confirmar fit real antes de investir tempo no diagnóstico.

---

## Perguntas-chave por Bloco

| Dimensão | Pergunta |
|----------|---------|
| **Budget** | "Qual o volume atual de contratos recorrentes de software na carteira?" |
| **Authority** | "Além de você, quem participa da decisão de novos parceiros?" |
| **Need** | "Qual é o maior gargalo hoje na gestão de canais?" |
| **Timeline** | "Em quanto tempo conseguiriam iniciar as vendas, se fecharmos?" |

---

## Critérios de Avanço para Diagnóstico

> **Avance somente se:**
> - MRR potencial estimado ≥ R$ 5.000/mês
> - Decisor principal confirmado para o diagnóstico
> - Timeline de início < 90 dias

---

## Red Flags

- Empresa sem equipe comercial própria
- Interesse apenas em receber leads (sem venda ativa)
- Resistência em assinar NDA`,
    created_at: '2026-04-02T10:00:00', updated_at: '2026-06-01T09:00:00',
  },
  {
    id: 'fs-103', playbook_id: 'pb-1', tenant_id: 't1',
    stage: 'diagnostico', title: 'Mapeando Dores e Oportunidades',
    sort_order: 3,
    content: `## Estrutura da Reunião (60–90 min)

### Bloco 1 — Contexto Atual (20 min)
- Como é o processo de vendas hoje, do primeiro contato ao fechamento?
- Quais ferramentas o time usa? (CRM, ERP, planilhas?)
- Como são controladas metas e comissões?

### Bloco 2 — Dores e Gargalos (20 min)
- Onde o time perde mais tempo no dia a dia?
- Já perderam negócios por falta de visibilidade do pipeline?
- Como é feito o onboarding de novos vendedores?

### Bloco 3 — Demo Orientada (30 min)

> **Mostre apenas os módulos relevantes às dores identificadas.**
> Evite o "tour completo" — foque no que já foi mapeado.

---

## Entregável (enviar em 24h)

- Resumo das dores mapeadas (3–5 bullets)
- Módulos recomendados
- Data proposta para apresentação da proposta`,
    created_at: '2026-04-03T10:00:00', updated_at: '2026-06-01T09:00:00',
  },
  {
    id: 'fs-104', playbook_id: 'pb-1', tenant_id: 't1',
    stage: 'proposta', title: 'Proposta Vencedora para ISVs',
    sort_order: 4,
    content: `## Estrutura da Proposta

Uma proposta vencedora tem 5 blocos:

### 1. Recap das Dores
Cite literalmente o que o prospect disse no diagnóstico.

### 2. Solução Proposta
Módulos recomendados e por que cada um resolve uma dor específica.

### 3. Investimento

| Item | Valor Mensal |
|------|-------------|
| CDU (X usuários) | R$ X.XXX |
| SMS | R$ XXX |
| Implantação | R$ X.XXX (único) |

### 4. ROI Esperado
- Aumento de produtividade estimado: X%
- Payback: X meses

### 5. Próximos Passos
- Data de retorno
- Deadline de validade da proposta

---

## Técnica dos 3 Cenários

> Apresente sempre 3 opções (básico / recomendado / premium). O prospect naturalmente escolhe o meio.`,
    created_at: '2026-04-04T10:00:00', updated_at: '2026-06-01T09:00:00',
  },
  {
    id: 'fs-105', playbook_id: 'pb-1', tenant_id: 't1',
    stage: 'fechamento', title: 'Técnicas de Fechamento e Handoff',
    sort_order: 5,
    content: `## Sinais de Compra

Preste atenção nestes sinais antes de fechar:

- Pergunta sobre detalhes de implantação
- Pede para incluir o time técnico
- Questiona descontos por volume
- Compartilha a proposta internamente

---

## Técnicas de Fechamento

### Por Alternativa
> "Você prefere começar com Pipeline e Metas, ou já incluímos Projetos desde o início?"

### Por Próximo Passo
> "Ótimo! Para formalizar, preciso apenas do CNPJ de faturamento e quem assina o contrato."

---

## Checklist de Fechamento

- [ ] Proposta aprovada verbalmente
- [ ] NDA assinado
- [ ] Contrato enviado para análise
- [ ] Data de kickoff agendada
- [ ] Responsável técnico identificado`,
    created_at: '2026-04-05T10:00:00', updated_at: '2026-06-01T09:00:00',
  },

  // ── Playbook 2 — Saúde ───────────────────────────────────────────────────
  {
    id: 'fs-201', playbook_id: 'pb-2', tenant_id: 't1',
    stage: 'prospeccao', title: 'Perfil do Parceiro de Saúde',
    sort_order: 1,
    content: `## Mercado-Alvo

No segmento de saúde, os parceiros ideais são:

- **Healthtechs** com produto SaaS para clínicas ou hospitais
- **Distribuidores de equipamentos médicos** com software próprio ou terceiro
- **Consultorias de TI em saúde** (especialistas em LGPD/ANS)

---

## Particularidades do Setor

> O ciclo de decisão em saúde é **40–60% mais longo** que em SaaS genérico.
> Envolva o responsável de TI E o administrativo/financeiro desde o início.

---

## Script Específico para Saúde

> "Olá [Nome], a [Empresa] atua com gestão de canais no setor de saúde — é um dos segmentos que mais crescem em adoção de SaaS no Brasil. Nossa plataforma já foi adotada por redes como a MedGroup. Você toparia conhecer em 20 minutos?"`,
    created_at: '2026-04-15T10:00:00', updated_at: '2026-06-05T09:00:00',
  },
  {
    id: 'fs-202', playbook_id: 'pb-2', tenant_id: 't1',
    stage: 'diagnostico', title: 'Diagnóstico para o Setor de Saúde',
    sort_order: 2,
    content: `## Perguntas Específicas para Saúde

- Quantas unidades ou clínicas são gerenciadas pela rede hoje?
- Como é feito o controle de metas por unidade?
- Há algum sistema de prontuário ou gestão clínica integrado?
- Quais são os requisitos de LGPD e conformidade com a ANS?

---

## Dores Típicas do Setor

- Falta de visibilidade entre a matriz e as unidades franqueadas
- Controle manual de comissões por produtividade médica
- Dificuldade no onboarding de novas unidades geograficamente dispersas

---

## Demo Recomendada

Foque em: **Projetos** (implantação de novas unidades) + **Metas** (comissões por produtividade)`,
    created_at: '2026-04-16T10:00:00', updated_at: '2026-06-05T09:00:00',
  },
  {
    id: 'fs-203', playbook_id: 'pb-2', tenant_id: 't1',
    stage: 'proposta', title: 'Proposta para Redes de Saúde',
    sort_order: 3,
    content: `## Argumento Central

No setor de saúde, o ROI mais rápido vem de:

1. **Redução de tempo** no onboarding de novas unidades (de 30 para 5 dias)
2. **Eliminação de conflitos** de comissão entre unidades
3. **Visibilidade centralizada** para o gestor da rede

---

## Modelo de Precificação Recomendado

- **Por unidade ativa** (não por CDU individual)
- Inclua implantação no valor do primeiro mês
- Ofereça desconto de 15% para contratos de 24 meses

---

## Objeção Típica: "Já temos sistema"

> "Entendo. Qual sistema vocês usam hoje para gestão de canal — não de clínica, mas de parceiros e distribuidores? É exatamente essa lacuna que o Canal NG cobre."`,
    created_at: '2026-04-17T10:00:00', updated_at: '2026-06-05T09:00:00',
  },

  // ── Playbook 3 — Indústria ───────────────────────────────────────────────
  {
    id: 'fs-301', playbook_id: 'pb-3', tenant_id: 't1',
    stage: 'prospeccao', title: 'Prospectando Distribuidores Industriais',
    sort_order: 1,
    content: `## ICP para Indústria

- Distribuidores de equipamentos ou insumos industriais com rede de revendas
- Fabricantes com canal indireto de vendas (VAR / Revendas autorizadas)
- Empresas de automação industrial com parceiros de implantação

---

## Abordagem

O argumento mais forte para indústria: **eficiência operacional**.

> "Empresas industriais com +5 distribuidores perdem em média 12h/semana em relatórios manuais. Nossa plataforma elimina isso em uma semana de implantação."

---

## Eventos-Alvo

- Hannover Messe Brasil
- Feimec
- Automação em Foco (ABINEE)`,
    created_at: '2026-05-01T10:00:00', updated_at: '2026-06-08T09:00:00',
  },
  {
    id: 'fs-302', playbook_id: 'pb-3', tenant_id: 't1',
    stage: 'diagnostico', title: 'Diagnóstico para Distribuidores',
    sort_order: 2,
    content: `## Perguntas Específicas para Indústria

- Quantos distribuidores ou revendas autorizadas a rede possui?
- Como são comunicadas metas e cotas por distribuidor?
- Há conflito de território entre distribuidores?
- Como é feito o controle de sell-out (venda do distribuidor ao cliente final)?

---

## Dores Mais Comuns

- Conflito de canal (dois distribuidores disputando o mesmo cliente)
- Falta de visibilidade do sell-out em tempo real
- Comissões de back-end calculadas manualmente em planilhas

---

## Módulos Mais Relevantes

**Pipeline** (visibilidade de oportunidades) + **Metas** (cotas por distribuidor) + **Projetos** (implantações industriais)`,
    created_at: '2026-05-02T10:00:00', updated_at: '2026-06-08T09:00:00',
  },
  {
    id: 'fs-303', playbook_id: 'pb-3', tenant_id: 't1',
    stage: 'fechamento', title: 'Fechamento para o Setor Industrial',
    sort_order: 3,
    content: `## Particularidades do Fechamento Industrial

- Ciclo de compra tipicamente **60–120 dias** (comitê de aprovação)
- Necessidade de **PoC (Prova de Conceito)** em 1 distribuidor antes do rollout
- Comum exigir integração com **ERP industrial** (SAP, TOTVS)

---

## Estratégia de Fechamento

> Ofereça um **projeto-piloto de 60 dias** com 1 distribuidor. Isso reduz o risco percebido e acelera a decisão do comitê.

---

## Checklist Específico

- [ ] PoC proposta e aprovada
- [ ] Distribuidor-piloto identificado
- [ ] Requisitos de integração ERP mapeados
- [ ] Escopo de rollout definido (quantos distribuidores, em qual prazo)`,
    created_at: '2026-05-03T10:00:00', updated_at: '2026-06-08T09:00:00',
  },
]

// ─── Clientes de Referência (por Playbook) ────────────────────────────────────
export const MOCK_REFERENCES = [
  // Playbook 1 — SaaS/ISV
  { id: 'ref-101', playbook_id: 'pb-1', tenant_id: 't1', company_name: 'FinCorp Sistemas', logo_initials: 'FC', logo_color: '#6366F1', region: 'Sudeste', summary: 'MRR cresceu 38% em 4 meses. 14 parceiros gerenciados na plataforma.', results: [{ label: 'MRR gerado', value: 'R$ 18.400/mês' }, { label: 'Crescimento', value: '+38% em 4 meses' }, { label: 'Parceiros ativos', value: '14' }], is_public: true, created_at: '2026-04-10T10:00:00' },
  { id: 'ref-102', playbook_id: 'pb-1', tenant_id: 't1', company_name: 'Nexus Tech Soluções', logo_initials: 'NT', logo_color: '#F59E0B', region: 'Sul', summary: 'Pipeline cresceu 3x em 60 dias após capacitação via Playbook.', results: [{ label: 'Crescimento pipeline', value: '3x em 60 dias' }, { label: 'Tx. conversão', value: '24% → 41%' }], is_public: true, created_at: '2026-04-12T10:00:00' },
  { id: 'ref-103', playbook_id: 'pb-1', tenant_id: 't1', company_name: 'Solaris Educação', logo_initials: 'SO', logo_color: '#8B5CF6', region: 'Nordeste', summary: 'Expansão para 4 estados em 6 meses com gestão centralizada.', results: [{ label: 'Estados atendidos', value: '4 (era 1)' }, { label: 'Distribuidores', value: '11' }], is_public: false, created_at: '2026-04-15T10:00:00' },

  // Playbook 2 — Saúde
  { id: 'ref-201', playbook_id: 'pb-2', tenant_id: 't1', company_name: 'MedGroup Saúde Digital', logo_initials: 'MG', logo_color: '#10B981', region: 'Sudeste', summary: '8 franquias regionais centralizadas. Redução de 60% no overhead de relatórios.', results: [{ label: 'Franquias gerenciadas', value: '8' }, { label: 'Redução overhead', value: '60%' }], is_public: true, created_at: '2026-04-20T10:00:00' },
  { id: 'ref-202', playbook_id: 'pb-2', tenant_id: 't1', company_name: 'VitaClin Redes', logo_initials: 'VC', logo_color: '#EF4444', region: 'Sul', summary: 'Onboarding de novas unidades de 30 dias para 5 dias úteis.', results: [{ label: 'Tempo de onboarding', value: '30d → 5d' }, { label: 'Unidades ativas', value: '12' }], is_public: true, created_at: '2026-05-01T10:00:00' },

  // Playbook 3 — Indústria
  { id: 'ref-301', playbook_id: 'pb-3', tenant_id: 't1', company_name: 'AgriTech Norte', logo_initials: 'AN', logo_color: '#EF4444', region: 'Norte', summary: '23 canais, 4 regiões. ROI em 3,2 meses.', results: [{ label: 'Canais gerenciados', value: '23' }, { label: 'ROI em', value: '3,2 meses' }], is_public: true, created_at: '2026-05-10T10:00:00' },
]

// ─── Materiais e Recursos (por Playbook) ─────────────────────────────────────
export const MOCK_RESOURCES = [
  // Playbook 1 — SaaS/ISV
  { id: 'res-101', playbook_id: 'pb-1', tenant_id: 't1', title: 'Deck Institucional Canal NG Pro 2026', description: 'Apresentação completa para prospects ISV. Inclui plataforma, módulos, cases e planos.', type: 'pptx', url: '#', file_size: '4.2 MB', tags: ['institucional', 'proposta'], sort_order: 1, created_at: '2026-04-01T10:00:00' },
  { id: 'res-102', playbook_id: 'pb-1', tenant_id: 't1', title: 'Calculadora de ROI — Parceiros ISV', description: 'Planilha interativa para calcular ROI com o prospect. Preencha CDU, SMS e receita estimada.', type: 'xls', url: '#', file_size: '860 KB', tags: ['financeiro', 'proposta'], sort_order: 2, created_at: '2026-04-05T10:00:00' },
  { id: 'res-103', playbook_id: 'pb-1', tenant_id: 't1', title: 'Demo Gravada — Pipeline e Metas', description: 'Vídeo de 12 min com demonstração focada em Pipeline e Metas para ISVs.', type: 'video', url: '#', file_size: '—', tags: ['demo', 'prospeccao'], sort_order: 3, created_at: '2026-04-10T10:00:00' },
  { id: 'res-104', playbook_id: 'pb-1', tenant_id: 't1', title: 'Comparativo: Canal NG vs. Concorrentes', description: 'Estudo de mercado com comparativo funcional e de preço. Uso interno em argumentação.', type: 'pdf', url: '#', file_size: '1.1 MB', tags: ['estudo', 'objecao'], sort_order: 4, created_at: '2026-04-15T10:00:00' },
  { id: 'res-105', playbook_id: 'pb-1', tenant_id: 't1', title: 'Scripts de Prospecção (Cold Call + LinkedIn)', description: 'Roteiros de abordagem para diferentes perfis de ISV. Atualizado junho/2026.', type: 'doc', url: '#', file_size: '95 KB', tags: ['prospeccao', 'script'], sort_order: 5, created_at: '2026-04-20T10:00:00' },

  // Playbook 2 — Saúde
  { id: 'res-201', playbook_id: 'pb-2', tenant_id: 't1', title: 'Deck Saúde Digital — Versão Customizada', description: 'Apresentação adaptada para o setor de saúde, com cases MedGroup e VitaClin.', type: 'pptx', url: '#', file_size: '5.1 MB', tags: ['institucional', 'saude'], sort_order: 1, created_at: '2026-04-15T10:00:00' },
  { id: 'res-202', playbook_id: 'pb-2', tenant_id: 't1', title: 'Guia LGPD para Parceiros de Saúde', description: 'Como abordar requisitos de conformidade e segurança de dados com prospects do setor de saúde.', type: 'pdf', url: '#', file_size: '780 KB', tags: ['lgpd', 'compliance'], sort_order: 2, created_at: '2026-04-20T10:00:00' },
  { id: 'res-203', playbook_id: 'pb-2', tenant_id: 't1', title: 'Demo Redes de Saúde — Projetos e Metas', description: 'Vídeo demonstrativo para redes com múltiplas unidades de saúde.', type: 'video', url: '#', file_size: '—', tags: ['demo', 'saude'], sort_order: 3, created_at: '2026-05-01T10:00:00' },

  // Playbook 3 — Indústria
  { id: 'res-301', playbook_id: 'pb-3', tenant_id: 't1', title: 'Deck Indústria — Canal de Distribuição', description: 'Apresentação com foco em gestão de distribuidores industriais e sell-out.', type: 'pptx', url: '#', file_size: '3.8 MB', tags: ['institucional', 'industria'], sort_order: 1, created_at: '2026-05-01T10:00:00' },
  { id: 'res-302', playbook_id: 'pb-3', tenant_id: 't1', title: 'Proposta de PoC — Piloto Industrial', description: 'Modelo de proposta para projetos-piloto de 60 dias com 1 distribuidor.', type: 'doc', url: '#', file_size: '120 KB', tags: ['poc', 'fechamento'], sort_order: 2, created_at: '2026-05-05T10:00:00' },
]
