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
import { usePreferences } from '../preferences/usePreferences.js'
import { useRealtimeEvent } from '../realtime/RealtimeContext.jsx'
import { REALTIME_RECONNECTED } from '../realtime/sseEvents.js'
import { useToast } from '../toast/ToastContext.jsx'
import { getNotificationMessage } from './notificationCopy.js'
import * as notificationService from './notificationService.js'

const NotificationsContext = createContext(null)

function shouldToastForType(type, notificationPrefs) {
  switch (type) {
    case 'FRI_REQ':
      return notificationPrefs.friendRequests !== false
    case 'FRI_ACCEPTED':
      return notificationPrefs.friendAccepted !== false
    case 'JOURNAL_SHARED':
      return notificationPrefs.journalShared !== false
    default:
      return true
  }
}

export function NotificationsProvider({ children }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { preferences } = usePreferences()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  )

  const refreshNotifications = useCallback(async () => {
    const next = await notificationService.listNotifications()
    setNotifications(next)
    setError('')
    return next
  }, [])

  useEffect(() => {
    if (isAuthLoading) {
      return undefined
    }

    if (!isAuthenticated) {
      setNotifications([])
      setIsLoading(false)
      setError('')
      return undefined
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        await refreshNotifications()
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load notifications.',
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
  }, [isAuthLoading, isAuthenticated, refreshNotifications])

  const ingestNotification = useCallback(
    (notification, { toast = true } = {}) => {
      if (!notification?.id) {
        return
      }

      let inserted = false

      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current
        }

        inserted = true
        return [notification, ...current]
      })

      const allowToast =
        toast &&
        shouldToastForType(notification.type, preferences.notifications)

      if (inserted && allowToast && !notification.isRead) {
        showToast({
          message: getNotificationMessage(notification),
          status: 'info',
        })
      }
    },
    [showToast, preferences.notifications],
  )

  useRealtimeEvent('friend.requested', (payload) => {
    ingestNotification(payload?.notification)
  })

  useRealtimeEvent('friend.accepted', (payload) => {
    ingestNotification(payload?.notification)
  })

  useRealtimeEvent('journal.shared', (payload) => {
    ingestNotification(payload?.notification)
  })

  useRealtimeEvent(REALTIME_RECONNECTED, () => {
    refreshNotifications().catch((error) => {
      console.error(
        'Failed to refresh notifications after SSE reconnect',
        error,
      )
    })
  })

  const markRead = useCallback(async (notificationId) => {
    const updated = await notificationService.markNotificationRead(
      notificationId,
    )

    setNotifications((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )

    return updated
  }, [])

  const markAllRead = useCallback(async () => {
    const result = await notificationService.markAllNotificationsRead()

    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    )

    return result
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      error,
      refreshNotifications,
      markRead,
      markAllRead,
      setNotifications,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      error,
      refreshNotifications,
      markRead,
      markAllRead,
    ],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)

  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider',
    )
  }

  return context
}
