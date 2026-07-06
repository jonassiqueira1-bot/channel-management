# Maturidade de Parceiros


---

## O que é

Define os critérios que calculam o **score de maturidade** de cada parceiro. Cada critério tem um peso em pontos — a soma dos pesos ativos forma o score máximo possível.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de parâmetros de avaliação com: Nome, Origem dos dados, Condição, Peso e status Ativo/Inativo.

O **peso total ativo** é exibido no cabeçalho da tela.

---

## Como usar

### Criar novo parâmetro

1. Clique em **Novo parâmetro**
2. Preencha:
   - **Nome** (obrigatório)
   - **Descrição**
   - **Origem dos dados** — de onde o sistema vai buscar os dados para avaliar (ex: Contatos, Oportunidades)
   - **Condição** — critério de avaliação (ex: "possui pelo menos N registros em X dias")
   - **Quantidade mínima (N)** e **Janela de dias (X)** — aparecem conforme a condição escolhida
   - **Peso (pontos)** — quanto este critério vale no score total
   - **Ativo** — se está sendo considerado no cálculo
3. Salva

### Editar ou remover

Clique na linha do parâmetro para abrir o formulário. O botão **Remover** exclui o parâmetro permanentemente.

---

## Regras de negócio

- O score de um parceiro é calculado somando os pesos dos parâmetros ativos que ele atende
- Parâmetros inativos não são considerados no cálculo mas ficam salvos para uso futuro
- O peso total ativo exibido no cabeçalho é a referência do score máximo possível
