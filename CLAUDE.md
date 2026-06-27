# BoostLy — Memória do Projeto

## O que é o BoostLy
Plataforma de **gestão de canal**, não apenas um CRM. Cobre o ciclo de vida completo do canal:

```
Oportunidade → Contrato → Projeto → CS (saúde) → Pagamento → Renovação
     ↑                                                              ↓
     └──────────────────── ciclo se reinicia ──────────────────────┘
```

Módulos ativos: CRM/Pipeline, Contratos, Projetos, Customer Success, Pagamentos, Tarefas, Vendedores (Contatos de Canal), Campanhas, Questionários, Documentos, Comissões, Metas, Relatórios, Ações, Playbooks.

---

## Definição arquitetural — Sistema de Alertas e Pendências

### Conceito central
Sistema de duas camadas que garante que nenhuma pendência se perca:

**Camada 1 — Push (proativo):** E-mail. Chega ao usuário mesmo fora do sistema.
**Camada 2 — Pull (reativo):** Painel flutuante de pendências. Visível de qualquer tela ao abrir o sistema.

### Painel flutuante de Pendências
- Ícone fixo na sidebar (com badge de contagem), sem ícone genérico — usar identidade visual do BoostLy
- Abre painel lateral com todas as pendências do usuário logado
- Acessível de qualquer tela, mobile e desktop
- Não é uma página separada — é uma camada flutuante sobre o sistema
- Cada item mostra: gravidade, descrição, empresa/entidade, tempo em aberto, link direto para o registro
- Ações inline: marcar como resolvido, sem sair do painel

### Gravidade dos alertas
Três níveis — sem ícones genéricos, definir identidade visual própria:
- **Urgente** — requer ação imediata
- **Atenção** — requer ação em breve
- **Info** — informacional, sem prazo crítico

### Tipos de gatilho
1. **Evento** — algo aconteceu (ex: oportunidade marcada como perdida)
2. **Inatividade** — algo deveria ter acontecido e não aconteceu (ex: sem atividade há X dias)
3. **Etapa** — passou por transição no funil ou mudança de status

### Alertas Cross-Módulo
Um evento em um módulo dispara alerta direcionado a outro módulo/time:
- Contrato assinado → avisa PM para criar projeto
- Projeto concluído → avisa CS para iniciar acompanhamento ativo
- Pagamento vencido há 30 dias → avisa Comercial + bloqueia renovação
- Score CS crítico → abre oportunidade de recuperação no CRM
- Contrato vencendo em 60 dias → inicia processo de renovação no Pipeline

### Integração com Tarefas
As Tarefas são o **motor de execução** dos alertas. Dois comportamentos configuráveis pelo admin:

**Alerta informacional** → aparece no painel flutuante + dispara e-mail. Nenhuma tarefa criada.

**Alerta que exige ação** → cria Tarefa automaticamente + aparece no painel + dispara e-mail.
O admin define na regra:
- Responsável pela tarefa (campo do registro, papel fixo, ou gerente do responsável)
- Prazo (X dias após o gatilho)

O painel flutuante unifica **alertas automáticos** e **tarefas manuais** atribuídas ao usuário — uma fila de trabalho priorizada automaticamente.

### Hierarquia de escalada
```
Nível 1 → Responsável pelo registro
Nível 2 → Gerente do responsável (após X horas sem ação)
Nível 3 → Diretor / papel fixo configurável
```

### Interface de configuração de regras (admin)
Máxima flexibilidade, mínima complexidade. Cada regra tem:
- Módulo de origem (CRM, Contratos, CS, Pagamentos, Projetos)
- Gatilho (evento, inatividade, etapa)
- Tempo de espera (imediato ou após X horas/dias)
- Destinatários (responsável, gerente, papel fixo, campo do registro)
- Mensagem com variáveis dinâmicas do registro
- Link direto para ação no módulo correto
- Condição de parada (não dispara se situação já foi resolvida)
- Opção: só notificar OU criar tarefa automaticamente

### O que diferencia do Salesforce
| | Salesforce | BoostLy |
|---|---|---|
| Curva de aprendizado | Alta | Baixa (wizard guiado) |
| Contexto | Genérico | Nativo ao canal (vendedor, franquia, oportunidade) |
| Escalada hierárquica | Complexa | Embutida por padrão |
| Alertas cross-módulo | Possível mas trabalhoso | Nativo |
| Integração com tarefas | Separada | Unificada no painel flutuante |

---

## Pendências de design
- O sistema como um todo precisa de mais personalidade visual
- Ícones devem ter identidade própria do BoostLy, não ícones genéricos
- Definir linguagem visual dos níveis de gravidade dos alertas

---

## Responsividade
- Mobile deve respeitar estritamente o layout de campos configurado no desktop
- `DynamicFormLayout` usa 1 coluna em telas < 768px (implementado)
- `Drawer` tem `maxWidth: 100vw` no mobile (implementado)
- Configuração de campos (`settings:form_fields_v2`) está em localStorage — futuramente migrar para Supabase para sincronizar entre dispositivos
