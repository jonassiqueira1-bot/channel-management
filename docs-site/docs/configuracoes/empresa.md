# Empresa / ISV


---

## O que é

Gerencia os dados do ISV (empresa detentora da plataforma) e suas unidades/filiais. É aqui que se configura a identidade visual white-label aplicada a cada unidade.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Duas áreas principais:

**1. Dados da empresa principal** — informações do ISV que aparece no topo da tela.

**2. Lista de unidades (filiais)** — cada unidade é uma filial independente com seus próprios dados e identidade visual.

Colunas da lista de unidades: Nome, Cidade/UF, CNPJ, Status (Ativa / Inativa).

---

## Como usar

### Editar dados da empresa principal

Os dados do ISV são exibidos no topo. Para editar, clique no campo desejado diretamente ou use o botão de edição.

### Criar nova unidade

1. Clique em **Nova Unidade**
2. Preencha os campos:
   - **Logotipo** — upload de imagem
   - **Nome da Unidade** (obrigatório)
   - **Endereço** — CEP, UF, Logradouro, Cidade
   - **Contato** — CNPJ, CNAE, Website, E-mail, Telefone, Responsável
   - **Identidade Visual** — Cor primária e Cor de destaque (white-label)
3. Salva

### Editar unidade existente

Clique na linha da unidade → abre formulário com os mesmos campos acima.

### Desativar unidade

No formulário da unidade, clique em **Remover**. A unidade é desativada (não excluída) e passa a exibir o aviso "Unidade desativada" no topo do formulário.

---

## Regras de negócio

- Cada unidade tem sua própria identidade visual (cores white-label) aplicada independentemente
- Uma unidade desativada não pode ser acessada por usuários vinculados a ela
- O botão de remoção não aparece para unidades já desativadas
- CNPJ e CNAE são campos de texto livre — sem validação de formato
