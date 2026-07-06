---
id: config-campos
title: Configuração de Campos
---

# Configuração de Campos


---

## O que é

Editor visual de formulários que permite personalizar os campos e seções exibidos em cada entidade do sistema — oportunidades, empresas, contatos, etc. As alterações são refletidas imediatamente nos formulários de cadastro.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de entidades configuráveis com: Nome da entidade, total de campos e total de seções. Alterações são salvas automaticamente.

---

## Como usar

### Editar formulário de uma entidade

1. Clique na entidade desejada (ex: Oportunidade, Empresa, Contato)
2. O editor abre mostrando as seções e campos atuais

### Gerenciar seções

- **Renomear seção** — clique no ícone de lápis ao lado do nome
- **Reordenar seções** — use as setas para cima/baixo
- **Excluir seção** — remove a seção e todos os campos dentro dela

### Gerenciar campos

- **Adicionar campo** — arraste da biblioteca de campos disponíveis para uma seção
- **Editar campo** — clique no ícone de edição para alterar nome, obrigatoriedade e outras propriedades
- **Remover campo** — clique no ícone de remoção para retirar o campo do formulário
- **Reordenar campos** — arraste dentro da seção

---

## Regras de negócio

- As alterações são salvas automaticamente (indicado no subtítulo da tela)
- Campos nativos do sistema podem ser ocultados mas não excluídos permanentemente
- Campos customizados adicionados aqui ficam disponíveis também nos filtros de Alertas
