import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authService, errorMessage } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const checkSession = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setUser(await authService.currentUser())
    } catch (err) {
      setUser(null)
      if (err.response?.status !== 401) setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  const refreshUser = useCallback(async () => {
    try { setUser(await authService.currentUser()) } catch (err) { if (err.response?.status === 401) setUser(null) }
  }, [])

  async function login(credentials) {
    await authService.login(credentials)
    // Login returns identity only; /me supplies the actual duel statistics.
    setUser(await authService.currentUser())
  }

  async function logout() {
    await authService.logout()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, error, checkSession, refreshUser, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
