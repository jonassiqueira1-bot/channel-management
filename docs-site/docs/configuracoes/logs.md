# Logs de Auditoria


---

## O que é

Registro completo de todas as ações realizadas no sistema — criações, edições, exclusões e eventos automáticos. Permite rastrear quem fez o quê e quando.

---

## Quem acessa

| Papel | Acesso |
|-------|--------|
| `admin_isv` | Acesso total |
| Demais papéis | Sem acesso |

---

## O que mostra

Lista cronológica de eventos com: Data/hora, Usuário, Ação, Módulo, ID do registro e Descrição.

Filtros disponíveis: busca por texto, filtro por Ação e por Módulo.

---

## Como usar

### Consultar logs

Use a **busca** para filtrar por nome de usuário, módulo ou ID de registro. Use os filtros de **Ação** e **Módulo** para restringir os resultados.

### Ver detalhes de um evento

Clique na linha do evento para expandir os detalhes completos: módulo, ID do registro afetado e descrição da operação.

### Exportar

Clique em **Exportar CSV** para baixar os logs filtrados.

---

## Regras de negócio

- Logs de auditoria são retidos por **1 ano**
- Registros não podem ser editados ou excluídos manualmente — são somente leitura
- Eventos automáticos (alertas, sincronizações) também são registrados com usuário identificado como "Sistema"
