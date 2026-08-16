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
import { useToast } from '../toast/ToastContext.jsx'
import * as friendService from './friendService.js'

const FriendsContext = createContext(null)

function sameId(a, b) {
  if (a == null || b == null) {
    return false
  }

  return Number(a) === Number(b)
}

function upsertById(list, item, getId) {
  if (list.some((entry) => sameId(getId(entry), getId(item)))) {
    return list
  }

  return [item, ...list]
}

function removeById(list, id, getId) {
  return list.filter((entry) => !sameId(getId(entry), id))
}

export function FriendsProvider({ children }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { showToast } = useToast()
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [isLoadingLists, setIsLoadingLists] = useState(true)
  const [listError, setListError] = useState('')

  const refreshLists = useCallback(async () => {
    const [nextFriends, nextIncoming, nextOutgoing] = await Promise.all([
      friendService.listFriends(),
      friendService.listIncomingRequests(),
      friendService.listOutgoingRequests(),
    ])

    setFriends(nextFriends)
    setIncoming(nextIncoming)
    setOutgoing(nextOutgoing)
    setListError('')

    return {
      friends: nextFriends,
      incoming: nextIncoming,
      outgoing: nextOutgoing,
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading) {
      return undefined
    }

    if (!isAuthenticated) {
      setFriends([])
      setIncoming([])
      setOutgoing([])
      setIsLoadingLists(false)
      setListError('')
      return undefined
    }

    let cancelled = false

    async function load() {
      setIsLoadingLists(true)
      setListError('')

      try {
        await refreshLists()
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof ApiError
              ? error.message
              : 'Unable to load friends.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLists(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [isAuthLoading, isAuthenticated, refreshLists])

  useRealtimeEvent('friend.requested', (payload) => {
    const request = payload?.request
    if (!request?.id) {
      return
    }

    setIncoming((current) =>
      upsertById(current, request, (item) => item.id),
    )
  })

    useRealtimeEvent('friend.accepted', (payload) => {
      
    const requestId = payload?.requestId
    const friendship = payload?.friendship

    if (requestId != null) {
      setOutgoing((current) =>
        removeById(current, requestId, (item) => item.id),
      )
    }

    if (friendship?.friendshipId != null) {
      setFriends((current) =>
        upsertById(current, friendship, (item) => item.friendshipId),
      )
    }

    setIncoming((current) =>
      friendship?.user?.id != null
        ? current.filter((item) => !sameId(item.sender.id, friendship.user.id))
        : current,
    )
  })

  useRealtimeEvent('friend.declined', (payload) => {
    
    const requestId = payload?.requestId
    if (requestId == null) {
      return
    }

    setOutgoing((current) => removeById(current, requestId, (item) => item.id))

    const username = payload?.declinedBy?.username
    showToast({
      message: username
        ? `${username} declined your friend request.`
        : 'Your friend request was declined.',
      status: 'info',
    })
  })

  useRealtimeEvent('friend.request.cancelled', (payload) => {
    const requestId = payload?.requestId
    if (requestId == null) {
      return
    }

    setIncoming((current) => removeById(current, requestId, (item) => item.id))

    const username = payload?.cancelledBy?.username
    showToast({
      message: username
        ? `${username} cancelled their friend request.`
        : 'A friend request was cancelled.',
      status: 'info',
    })
  })

  useRealtimeEvent('friend.removed', (payload) => {
    const friendshipId = payload?.friendshipId
    const friendUserId = payload?.friendId

    setFriends((current) =>
      current.filter((item) => {
        if (
          friendshipId != null &&
          sameId(item.friendshipId, friendshipId)
        ) {
          return false
        }

        if (friendUserId != null && sameId(item.user.id, friendUserId)) {
          return false
        }

        return true
      }),
    )

    const username = payload?.removedBy?.username
    showToast({
      message: username
        ? `${username} removed you as a friend.`
        : 'A friend removed you.',
      status: 'info',
    })
  })

  useRealtimeEvent(REALTIME_RECONNECTED, () => {
    refreshLists().catch((error) => {
      console.error('Failed to refresh friends after SSE reconnect', error)
    })
  })

  const value = useMemo(
    () => ({
      friends,
      incoming,
      outgoing,
      isLoadingLists,
      listError,
      refreshLists,
      setFriends,
      setIncoming,
      setOutgoing,
    }),
    [
      friends,
      incoming,
      outgoing,
      isLoadingLists,
      listError,
      refreshLists,
    ],
  )

  return (
    <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
  )
}

export function useFriends() {
  const context = useContext(FriendsContext)

  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider')
  }

  return context
}
