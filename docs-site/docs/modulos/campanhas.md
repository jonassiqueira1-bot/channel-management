# Campanhas


---

## O que é

Gerenciamento de campanhas de incentivo para motivar o canal de vendas com metas, prêmios e rankings. Permite criar competições por período com critérios de pontuação e premiação.

> Este módulo está em desenvolvimento — algumas funcionalidades podem não estar disponíveis.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| `vendedor`, `parceiro` | Visualização das campanhas ativas |

---

## O que mostra

Lista de campanhas com: Nome, Período, Status, Critério de pontuação e Premiação.

---

## Como usar

### Criar campanha

1. Clique em **Nova campanha**
2. Preencha: nome, período (início e fim), público-alvo (todos / equipe específica)
3. Defina o critério de pontuação — indicador base e conversão de pontos
4. Defina a premiação por posição ou pontuação mínima
5. Salva e publica

### Acompanhar ranking

Dentro da campanha ativa, visualize o ranking em tempo real com pontos acumulados por participante.

---

## Regras de negócio

- Campanhas publicadas são visíveis aos participantes no menu Campanhas
- Os pontos são calculados com base no indicador selecionado e atualizados automaticamente
- Campanhas expiradas passam automaticamente para o status **Encerrada**
