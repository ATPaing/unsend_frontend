import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ApiError } from '../../services/api.js'
import { useAuth } from '../auth/useAuth.js'
import { useRealtimeEvent } from '../realtime/RealtimeContext.jsx'
import { REALTIME_RECONNECTED } from '../realtime/sseEvents.js'
import { getServerNowMs, syncServerClock } from '../time/serverClock.js'
import * as journalService from './journalService.js'

const SharedJournalsContext = createContext(null)

function upsertByJournalId(list, journal) {
  if (!journal?.id) {
    return list
  }

  if (list.some((item) => Number(item.id) === Number(journal.id))) {
    return list.map((item) =>
      Number(item.id) === Number(journal.id) ? journal : item,
    )
  }

  return [journal, ...list]
}

export function SharedJournalsProvider({ children }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [journals, setJournals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshSharedJournals = useCallback(async () => {
    const next = await journalService.listSharedWithMe()
    setJournals(next)
    setError('')
    return next
  }, [])

  const refreshSharedJournalById = useCallback(async (journalId) => {
    try {
      const fresh = await journalService.getJournal(journalId)
      setJournals((current) => {
        const exists = current.some(
          (item) => Number(item.id) === Number(journalId),
        )
        if (!exists) {
          return current
        }

        return current.map((item) =>
          Number(item.id) === Number(journalId) ? fresh : item,
        )
      })
      return fresh
    } catch (refreshError) {
      console.error('Failed to refresh shared journal', journalId, refreshError)
      return null
    }
  }, [])

  // When a locked capsule's unlockAt elapses, re-fetch so isUnlocked follows the server.
  useEffect(() => {
    syncServerClock().catch(() => {})
  }, [])

  useEffect(() => {
    const timers = []

    for (const journal of journals) {
      if (
        journal.journalType !== 'T_CAPSULE' ||
        journal.isUnlocked !== false ||
        !journal.unlockAt
      ) {
        continue
      }

      const unlockAtMs = new Date(journal.unlockAt).getTime()
      if (Number.isNaN(unlockAtMs)) {
        continue
      }

      const delay = Math.max(unlockAtMs - getServerNowMs() + 750, 0)
      if (delay > 6 * 60 * 60 * 1000) {
        continue
      }

      timers.push(
        window.setTimeout(() => {
          refreshSharedJournalById(journal.id)
        }, delay),
      )
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [journals, refreshSharedJournalById])

  useEffect(() => {
    if (isAuthLoading) {
      return undefined
    }

    if (!isAuthenticated) {
      setJournals([])
      setIsLoading(false)
      setError('')
      return undefined
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        await refreshSharedJournals()
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load shared journals.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [isAuthLoading, isAuthenticated, refreshSharedJournals])

  useRealtimeEvent('journal.shared', (payload) => {
    const journal = payload?.journal
    if (!journal?.id) {
      return
    }

    setJournals((current) => upsertByJournalId(current, journal))
  })

  useRealtimeEvent('journal.unshared', (payload) => {
    const journalId = payload?.journalId
    if (journalId == null) {
      return
    }

    setJournals((current) =>
      current.filter((item) => Number(item.id) !== Number(journalId)),
    )
  })

  useRealtimeEvent('journal.unlock-at.updated', (payload) => {
    const journalId = payload?.journalId
    if (journalId == null || payload?.unlockAt == null) {
      return
    }

    setJournals((current) =>
      current.map((item) =>
        Number(item.id) === Number(journalId)
          ? {
              ...item,
              unlockAt: payload.unlockAt,
              isUnlocked:
                payload.isUnlocked === undefined
                  ? item.isUnlocked
                  : payload.isUnlocked,
            }
          : item,
      ),
    )
  })

  useRealtimeEvent(REALTIME_RECONNECTED, () => {
    refreshSharedJournals().catch((refreshError) => {
      console.error(
        'Failed to refresh shared journals after SSE reconnect',
        refreshError,
      )
    })
  })

  const value = useMemo(
    () => ({
      journals,
      isLoading,
      error,
      refreshSharedJournals,
      refreshSharedJournalById,
      setJournals,
    }),
    [journals, isLoading, error, refreshSharedJournals, refreshSharedJournalById],
  )

  return (
    <SharedJournalsContext.Provider value={value}>
      {children}
    </SharedJournalsContext.Provider>
  )
}

export function useSharedJournals() {
  const context = useContext(SharedJournalsContext)

  if (!context) {
    throw new Error(
      'useSharedJournals must be used within a SharedJournalsProvider',
    )
  }

  return context
}
