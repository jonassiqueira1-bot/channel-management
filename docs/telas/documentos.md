# Documentos

**Rota:** `/documentos`
**Arquivo:** `src/pages/Documentos.js`

---

## O que é

Repositório de documentos compartilhados com os parceiros — contratos modelo, materiais de venda, manuais e outros arquivos relevantes para o canal.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor`, `parceiro` | Acesso à filial |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de documentos com: Nome, Categoria, Tipo (arquivo ou link), Data de upload e quem adicionou.

---

## Como usar

### Adicionar documento

1. Clique em **Novo Documento**
2. Escolha o tipo:
   - **Arquivo** — upload de PDF, imagem, planilha, etc.
   - **Link** — URL para documento externo
3. Preencha: título, categoria e descrição
4. Salva

### Editar ou remover

Clique na linha → formulário. Documentos podem ser editados ou removidos pelo usuário que os adicionou ou por `admin_isv`.

### Baixar documento

Clique no ícone de download na linha do documento.

---

## Regras de negócio

- Usuários `parceiro` têm acesso somente leitura — podem visualizar e baixar mas não adicionar
- A categorização facilita a busca — use categorias consistentes para organizar o repositório
