import { useState, useEffect, useRef } from 'react'

const EVENT = 'localstate:change'

/**
 * Drop-in replacement para useState que persiste o valor em localStorage.
 * Sincroniza automaticamente entre todas as instâncias na mesma aba
 * (cross-tab via 'storage' event + same-tab via custom event).
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

  // Flag para evitar loop: não propagar evento gerado por nós mesmos
  const writing = useRef(false)

  // Escreve no localStorage e notifica outras instâncias na mesma aba
  useEffect(() => {
    try {
      const serialized = JSON.stringify(state)
      localStorage.setItem(key, serialized)
      writing.current = true
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, serialized } }))
      writing.current = false
    } catch {}
  }, [key, state])

  // Ouve mudanças de outras instâncias na mesma aba
  useEffect(() => {
    function onSameTab(e) {
      if (writing.current) return          // ignorar eventos gerados por nós
      if (e.detail?.key !== key) return
      try {
        setState(JSON.parse(e.detail.serialized))
      } catch {}
    }
    // Mudanças de outras abas/janelas
    function onStorage(e) {
      if (e.key !== key) return
      try {
        setState(e.newValue ? JSON.parse(e.newValue) : defaultValue)
      } catch {}
    }
    window.addEventListener(EVENT, onSameTab)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, onSameTab)
      window.removeEventListener('storage', onStorage)
    }
  }, [key, defaultValue])

  return [state, setState]
}
