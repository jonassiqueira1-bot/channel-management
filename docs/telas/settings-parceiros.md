# Parceiros

**Rota:** `/settings/franquias`
**Arquivo:** `src/pages/settings/Franquias.js`

---

## O que é

Cadastro e gestão das empresas parceiras (franquias, revendedores, distribuidores) vinculadas ao ISV. Define a hierarquia entre parceiros e suas unidades.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de todos os parceiros cadastrados.

Colunas: Nome, Código, Classificação (Franquia / Unidade), Tipo de Parceiro, Gestor, Estado, Situação.

---

## Como usar

### Cadastrar novo parceiro

1. Clique em **Novo parceiro**
2. Escolha a classificação:
   - **Franquia** — parceiro principal, pode ter unidades vinculadas
   - **Unidade** — pertence a uma franquia existente (obrigatório selecionar a franquia detentora)
3. Preencha os campos:
   - Classificação e Situação (obrigatórios)
   - Código, Estado
   - Nome (obrigatório)
   - Tipo de Parceiro (apenas para Franquia)
   - Parceiro detentor (apenas para Unidade)
   - Gestor responsável
4. Salva

### Editar parceiro

Clique na linha → formulário com os mesmos campos.

### Desativar parceiro

No formulário, clique em **Remover**. O parceiro é marcado como inativo.

### Importar em lote

Clique em **Importar** → use CSV com colunas: `nome`, `codigo`, `classificacao`, `situacao`, `franquia_mae`.

Valores aceitos:
- `classificacao`: `franquia` ou `unidade`
- `situacao`: `ativo` ou `inativo`

### Exportar

Clique em **Exportar CSV** para baixar a lista atual.

---

## Regras de negócio

- Uma **Unidade** obrigatoriamente precisa de uma Franquia detentora
- O campo **Parceiro detentor** só aparece quando a classificação for **Unidade**
- O campo **Tipo de Parceiro** só aparece quando a classificação for **Franquia**
- Parceiros inativos continuam visíveis na lista mas não aparecem em seletores de outros módulos
