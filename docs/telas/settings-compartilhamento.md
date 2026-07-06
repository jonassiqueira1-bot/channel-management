# Compartilhamento entre Filiais

**Rota:** `/settings/compartilhamento`
**Arquivo:** `src/pages/settings/BranchSharing.js`

---

## O que é

Define regras que permitem filiais da mesma organização visualizarem ou editarem dados umas das outras em módulos específicos.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de regras de compartilhamento com: módulos compartilhados, filiais envolvidas e nível de acesso.

---

## Como usar

### Criar regra de compartilhamento

1. Clique em **Nova Regra**
2. Preencha:
   - **Descrição** — opcional, para identificar a regra
   - **Filiais envolvidas** — selecione 2 ou mais filiais (obrigatório)
   - **Módulos compartilhados** — quais dados serão visíveis entre as filiais (obrigatório)
   - **Nível de acesso** — `Somente leitura` ou `Leitura e escrita`
   - **Restringir visibilidade** — opcionalmente limite o acesso a perfis ou usuários específicos
3. Salva

### Editar ou remover

Clique na linha da regra → formulário com os mesmos campos.

---

## Regras de negócio

- Mínimo de 2 filiais por regra
- Mínimo de 1 módulo selecionado para salvar
- **Leitura e escrita** permite criar e editar registros da outra filial — use com cautela
- Sem restrição de visibilidade, todos os usuários das filiais envolvidas terão acesso
