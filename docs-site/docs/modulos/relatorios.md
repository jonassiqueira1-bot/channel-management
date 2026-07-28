---
id: relatorios
title: Relatórios
---

# Relatórios


---

## O que é

Construtor de relatórios em formato de documento (canvas), montado em blocos — KPIs, tabelas, gráficos, texto e imagem — com dados reais do sistema, cruzados livremente entre módulos. Substitui o antigo modelo de "relatório fixo por módulo": qualquer relatório pode combinar dados de Pipeline, Contratos, Comissões, Projetos etc. num único documento.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso total |
| `vendedor` | Acesso limitado aos próprios dados (conforme permissão) |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de relatórios com: Título, tipo, nível de acesso (Privado/Equipe/Público), status (Rascunho/Publicado) e data de atualização.

---

## Como usar

### Criar relatório

1. Clique em **Novo relatório**
2. Defina o título e o nível de acesso:
   - **Privado** — só o autor vê
   - **Equipe** — visível para papéis selecionados
   - **Público** — visível para todo o tenant
3. Abra o construtor e adicione blocos ao documento (veja abaixo)
4. Salva como **Rascunho** ou publica

### Fontes de dados

O painel de dados permite escolher uma entidade de origem entre as fontes disponíveis: Pipeline, Etapas do Pipeline, Campanhas, Projetos, Empresas, Parceiros, Metas, Ações, Contatos, Contatos Canais (vendedores), Contratos, Pagamentos, Comissões, Sucesso do Cliente, Questionários, Respostas de Questionários, Documentos, Playbooks e Histórico de Etapas.

- É possível relacionar (**join**) mais de uma fonte — ex: Contratos + Empresas — para cruzar campos de ambas num mesmo bloco
- **Campos calculados** permitem combinar campos numéricos com `+ − × ÷`
- **Filtros** e **agrupamento** são configuráveis por campo, com conector E/OU entre filtros

### Blocos disponíveis

| Bloco | O que faz |
|-------|-----------|
| KPI | Um número agregado (soma, média, contagem etc.) com destaque |
| Tabela | Lista de linhas com as colunas escolhidas, com agrupamento opcional |
| Gráfico | Gráfico de barras/linha/pizza a partir de um campo agrupado |
| Texto | Bloco de texto livre para contexto/observações |
| Imagem | Imagem estática — usada também como cabeçalho/rodapé do documento |

Blocos podem ser reordenados, duplicados, colapsados ou colocados lado a lado (KPIs e gráficos podem ficar em linha).

### Exportar e imprimir

- **Exportar CSV** — disponível por bloco de tabela
- **Imprimir** — gera uma versão formatada do relatório inteiro, respeitando cabeçalho/rodapé configurados com imagem

---

## Regras de negócio

- Relatórios respeitam as permissões de filial do usuário — um vendedor não vê dados de outras filiais
- O nível de acesso (Privado/Equipe/Público) controla quem enxerga o relatório salvo, independente da permissão de filial
