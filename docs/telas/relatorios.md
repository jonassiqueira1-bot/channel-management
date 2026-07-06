# Relatórios

**Rota:** `/relatorios`
**Arquivo:** `src/pages/Relatorios.js`

---

## O que é

Geração de relatórios customizáveis sobre dados do canal. Permite criar, salvar e exportar relatórios de pipeline, comissões, projetos e outros módulos.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `financeiro` | Acesso total |
| `vendedor` | Acesso limitado aos próprios dados (conforme permissão) |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de relatórios salvos com: Título, módulo de origem, data de criação e última atualização.

---

## Como usar

### Criar relatório

1. Clique em **Novo relatório**
2. Defina o título e selecione o módulo de origem
3. Configure os filtros e colunas desejados
4. Salva o relatório para reutilização futura

### Executar relatório

Clique no relatório salvo → os dados são carregados em tempo real com os filtros configurados.

### Exportar

Dentro do relatório, clique em **Exportar CSV** para baixar os dados.

---

## Regras de negócio

- Relatórios respeitam as permissões de filial do usuário — um vendedor não vê dados de outras filiais
- Relatórios salvos são pessoais — não são compartilhados entre usuários
