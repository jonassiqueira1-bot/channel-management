# Contatos de Canal

**Rota:** `/vendedores`
**Arquivo:** `src/pages/Vendedores.js`

---

## O que é

Cadastro dos contatos de canal — pessoas físicas que representam os parceiros e podem ser convidadas a acessar o Portal do Parceiro. São o ponto de partida para o fluxo de convite de usuário `parceiro`.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor` | Acesso à sua filial |
| Demais papéis | Sem acesso direto |

---

## O que mostra

Lista de contatos de canal com: Nome, E-mail, Empresa vinculada, Filial e Status.

---

## Como usar

### Cadastrar contato de canal

1. Clique em **Novo Contato Canal**
2. Preencha: Nome, E-mail, Empresa e demais dados
3. Salva

### Convidar para o Portal do Parceiro

No formulário do contato, clique em **Convidar** para enviar um e-mail de acesso ao Portal do Parceiro. O contato receberá um link e, ao aceitar, terá acesso como usuário `parceiro` com a filial do contato já atribuída.

### Importar em lote

Clique em **Importar** → CSV com colunas separadas por ponto-e-vírgula.

### Editar ou remover

Clique na linha → formulário. Ao remover um contato de canal, o usuário parceiro vinculado é automaticamente desativado.

---

## Regras de negócio

- Cada contato de canal pertence a uma filial e herda essa filial ao ser convidado como parceiro
- A remoção do contato desativa o acesso do usuário parceiro vinculado
- Convites pendentes aparecem na tela de Usuários com status "Pendente"
