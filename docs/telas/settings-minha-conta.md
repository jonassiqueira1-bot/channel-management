# Minha Conta

**Rota:** `/settings/conta` e `/my-account`
**Arquivo:** `src/pages/MyAccount.js`

---

## O que é

Permite ao usuário visualizar e editar seus próprios dados pessoais, alterar senha e fazer upload de foto de perfil. Também exibe um resumo somente leitura dos dados da empresa vinculada.

---

## Quem acessa

Todos os papéis — cada usuário acessa apenas os próprios dados.

---

## O que mostra

**Informações pessoais** — dados editáveis do usuário logado.

**Dados da empresa** — exibição somente leitura: e-mail corporativo, telefone, cidade/UF, CNPJ, website e cores da identidade visual.

---

## Como usar

### Editar dados pessoais

Campos disponíveis:
- **Nome completo** (obrigatório)
- **Cargo / Função**
- **Telefone / WhatsApp**
- **E-mail** — somente leitura (gerenciado pelo sistema de autenticação)

Salve ao terminar.

### Alterar foto de perfil

Clique na área do avatar → selecione uma imagem do dispositivo → a foto é atualizada imediatamente.

### Alterar senha

1. Clique em **Alterar senha**
2. Informe a nova senha
3. Confirme

---

## Regras de negócio

- O e-mail não pode ser alterado nesta tela
- A foto de perfil é armazenada individualmente por usuário
- Os dados da empresa são somente leitura — editáveis apenas em `/settings/empresa`
