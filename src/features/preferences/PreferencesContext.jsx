import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  applyColorScheme,
  clearPreferences as clearStoredPreferences,
  loadPreferences,
  resolveColorScheme,
  savePreferences,
} from './preferencesStorage.js'
import { syncServerClock } from '../time/serverClock.js'

const PreferencesContext = createContext(null)

export function PreferencesProvider({ children }) {
  const [preferences, setPreferencesState] = useState(() => {
    const initial = loadPreferences()
    applyColorScheme(resolveColorScheme(initial.theme))
    return initial
  })

  useEffect(() => {
    syncServerClock().catch(() => {})
  }, [])

  const persist = useCallback((updater) => {
    setPreferencesState((current) => {
      const next =
        typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return savePreferences(next)
    })
  }, [])

  const setTheme = useCallback(
    (theme) => {
      persist((current) => ({ ...current, theme }))
    },
    [persist],
  )

  const setAutoLockMinutes = useCallback(
    (autoLockMinutes) => {
      persist((current) => ({ ...current, autoLockMinutes }))
    },
    [persist],
  )

  const setNotificationPref = useCallback(
    (key, enabled) => {
      persist((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          [key]: Boolean(enabled),
        },
      }))
    },
    [persist],
  )

  const clearPreferences = useCallback(() => {
    clearStoredPreferences()
    setPreferencesState(loadPreferences())
  }, [])

  useEffect(() => {
    applyColorScheme(resolveColorScheme(preferences.theme))

    if (preferences.theme !== 'system') {
      return undefined
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function handleChange(event) {
      applyColorScheme(event.matches ? 'dark' : 'light')
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [preferences.theme])

  const value = useMemo(
    () => ({
      preferences,
      setTheme,
      setAutoLockMinutes,
      setNotificationPref,
      clearPreferences,
    }),
    [
      preferences,
      setTheme,
      setAutoLockMinutes,
      setNotificationPref,
      clearPreferences,
    ],
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)

  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }

  return context
}
