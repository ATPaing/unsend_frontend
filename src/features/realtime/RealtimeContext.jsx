import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useAuth } from '../auth/useAuth.js'
import { REALTIME_RECONNECTED, SSE_EVENTS } from './sseEvents.js'

const RealtimeContext = createContext(null)

function getSseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }

  return `${baseUrl.replace(/\/$/, '')}/sse/events`
}

export function RealtimeProvider({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const listenersRef = useRef(new Map())
  const sourceRef = useRef(null)
  // Skip the first open for sync refresh — initial REST loads already ran.
  const hasOpenedOnceRef = useRef(false)

  const subscribe = useCallback((eventName, handler) => {
    if (typeof handler !== 'function') {
      return () => {}
    }

    let handlers = listenersRef.current.get(eventName)

    if (!handlers) {
      handlers = new Set()
      listenersRef.current.set(eventName, handlers)
    }

    handlers.add(handler)

    return () => {
      const current = listenersRef.current.get(eventName)
      if (!current) {
        return
      }

      current.delete(handler)
      if (current.size === 0) {
        listenersRef.current.delete(eventName)
      }
    }
  }, [])

  const dispatch = useCallback((eventName, payload) => {
    const handlers = listenersRef.current.get(eventName)
    if (!handlers || handlers.size === 0) {
      return
    }

    for (const handler of [...handlers]) {
      try {
        handler(payload)
      } catch (error) {
        console.error(`SSE handler failed for ${eventName}`, error)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id) {
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
      hasOpenedOnceRef.current = false
      return undefined
    }

    let cancelled = false
    let source

    try {
      source = new EventSource(getSseUrl(), { withCredentials: true })
    } catch (error) {
      console.error('Failed to open SSE connection', error)
      return undefined
    }

    sourceRef.current = source

    function handleNamedEvent(eventName, event) {
      if (cancelled) {
        return
      }

      let payload = {}

      try {
        payload = event.data ? JSON.parse(event.data) : {}
      } catch (error) {
        console.error(`Invalid SSE payload for ${eventName}`, error)
        return
      }

      dispatch(eventName, payload)
    }

    for (const eventName of SSE_EVENTS) {
      source.addEventListener(eventName, (event) => {
        handleNamedEvent(eventName, event)
      })
    }

    source.onopen = () => {
      if (cancelled) {
        return
      }

      if (import.meta.env.DEV) {
        console.log('SSE connected')
      }

      // After a disconnect/reconnect (e.g. backend restart), refresh REST state
      // so events missed while offline are recovered.
      if (hasOpenedOnceRef.current) {
        dispatch(REALTIME_RECONNECTED, { userId: user.id })
      } else {
        hasOpenedOnceRef.current = true
      }
    }

    source.onerror = () => {
      if (import.meta.env.DEV && source.readyState === EventSource.CONNECTING) {
        console.warn('SSE reconnecting…')
      }
    }

    return () => {
      cancelled = true
      source.close()
      if (sourceRef.current === source) {
        sourceRef.current = null
      }
    }
  }, [dispatch, isAuthenticated, isLoading, user?.id])

  const value = useMemo(
    () => ({
      subscribe,
    }),
    [subscribe],
  )

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)

  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }

  return context
}

export function useRealtimeEvent(eventName, handler) {
  const { subscribe } = useRealtime()
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    return subscribe(eventName, (payload) => {
      handlerRef.current?.(payload)
    })
  }, [eventName, subscribe])
}
