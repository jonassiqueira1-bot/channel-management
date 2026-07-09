import * as Sentry from '@sentry/react'

/**
 * Captura um erro do Supabase/fetch no Sentry com contexto e loga no console.
 * Não lança exceção — use para erros recuperáveis em hooks e callbacks.
 */
export function captureError(tag, error, extra = {}) {
  const msg = error?.message || String(error)
  console.error(`[${tag}]`, msg, extra)
  if (process.env.NODE_ENV !== 'production') return
  Sentry.captureException(error instanceof Error ? error : new Error(msg), {
    tags: { hook: tag },
    extra,
  })
}
