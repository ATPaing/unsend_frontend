import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../services/api.js'
import * as authService from './authService.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const sessionUser = await authService.getSession()
        if (!cancelled) {
          setUser(sessionUser)
        }
      } catch (error) {
        if (!cancelled) {
          setUser(null)
        }

        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Failed to restore session')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username, password) => {
    await authService.login(username, password)
    // Prefer session payload (includes isAdmin) over login's user object.
    const sessionUser = await authService.getSession()
    setUser(sessionUser)
    return sessionUser
  }, [])

  const signup = useCallback(async (username, password, cryptoMaterial) => {
    await authService.signup(username, password, cryptoMaterial)
    const sessionUser = await authService.getSession()
    setUser(sessionUser)
    return sessionUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error('Logout request failed')
      }
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      signup,
      logout,
    }),
    [user, isLoading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
