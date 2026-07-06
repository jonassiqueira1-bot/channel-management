import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = ainda validando
  const validatedRef = useRef(false)

  useEffect(() => {
    // Valida JWT contra o servidor antes de liberar qualquer sessão ao app
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        supabase.auth.signOut()
        setSession(null)
      } else {
        supabase.auth.getSession().then(({ data }) => setSession(data.session))
      }
      validatedRef.current = true
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Ignora eventos anteriores à validação inicial (evita race condition com localStorage)
      if (validatedRef.current) setSession(sess)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
