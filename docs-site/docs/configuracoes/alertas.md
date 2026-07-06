# Alertas


---

## O que é

Cria regras automáticas que monitoram dados do sistema e disparam notificações no painel, e-mails ou tarefas quando as condições definidas são atendidas.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista de regras de alerta com: Nome, Origem, número de condições e status Ativo/Inativo.

---

## Como usar

### Criar regra de alerta

1. Clique em **Nova regra**
2. Preencha:
   - **Nome da regra** (obrigatório)
   - **Origem** — qual módulo será monitorado: Oportunidades, Contratos, Projetos, Tarefas, Pagamentos, Empresas ou Metas
3. Configure as **Condições** — filtros sobre os campos da origem:
   - Escolha o campo, o operador e o valor
   - Adicione múltiplas condições com operador lógico **E** ou **OU**
4. Configure as **Ações ao disparar** — o que acontece quando as condições são atendidas:
   - **Notificar** — cria um alerta no painel in-app para o responsável
   - **E-mail** — envia um e-mail usando um template pré-definido
   - **Criar tarefa** — gera uma tarefa vinculada ao registro que disparou o alerta
5. Salva

### Ativar / desativar regra

Na lista, use o menu `...` → **Ativar** ou **Desativar**. Regras inativas não são avaliadas.

### Editar ou remover

Clique na linha da regra → formulário com todos os campos.

---

## Regras de negócio

- Cada regra pertence a uma única origem
- Ao trocar a origem, as condições são resetadas
- Alertas duplicados para o mesmo registro são suprimidos automaticamente por 3 dias
- Campos customizados cadastrados em **Config. de Campos** ficam disponíveis nas condições
