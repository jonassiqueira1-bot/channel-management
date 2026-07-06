# Ações de Canal


---

## O que é

Registro e acompanhamento de ações operacionais direcionadas aos parceiros — treinamentos, eventos, webinars, visitas e campanhas. Diferente das Tarefas (foco interno), as Ações têm foco no relacionamento com o canal.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv`, `vendedor` | Acesso à filial |
| Demais papéis | Sem acesso direto |

---

## O que mostra

Lista de ações com: Título, Tipo, Empresa parceira, Período, Responsável e Status.

---

## Como usar

### Criar ação

1. Clique em **Nova Ação**
2. Preencha:
   - **Empresa parceira** vinculada
   - **Tipo** — conforme `/settings/tipos-acoes` (Treinamento, Evento, Webinar, etc.)
   - **Título** e **Descrição**
   - **Data início** e **Data fim**
   - **Responsável**
   - **Local**, **Vagas** *(para ações presenciais)*
   - **Status** — Agendado, Em andamento, Concluído, Cancelado
3. Salva

### Editar ou remover

Clique na linha → formulário. Remoção via menu `...`.

---

## Regras de negócio

- Os tipos disponíveis são os configurados em `/settings/tipos-acoes` com uso em "Ações"
- O campo **Inscritos** é incrementado automaticamente conforme confirmações de participação
