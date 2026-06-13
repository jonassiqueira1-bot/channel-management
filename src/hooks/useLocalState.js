import { useState, useEffect } from 'react'

/**
 * Drop-in replacement para useState que persiste o valor em localStorage.
 * A chave deve ser única por página + campo, ex: 'pipeline:sortBy'
 *
 * useLocalState('pipeline:sortBy', 'criado')
 */
export function useLocalState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored === null) return defaultValue
      return JSON.parse(stored)
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // localStorage indisponível (ex: modo privativo bloqueado)
    }
  }, [key, state])

  return [state, setState]
}
