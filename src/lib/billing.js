// Preço por usuário ativo — modelo de cobrança simples adotado no lugar de
// faixas fixas (billing_plans): cada usuário ativo custa o mesmo valor fixo.
export const VALOR_POR_USUARIO = 249.90

export function fmtMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}
