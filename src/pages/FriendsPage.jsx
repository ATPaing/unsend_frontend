import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  LoaderCircle,
  Search,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import ConfirmModal from '../components/ui/ConfirmModal.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import * as journalService from '../features/journals/journalService.js'
import { useFriends } from '../features/friends/FriendsContext.jsx'
import * as friendService from '../features/friends/friendService.js'
import { searchFriends } from '../features/friends/searchFriends.js'
import { useToast } from '../features/toast/ToastContext.jsx'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import {
  saveJournalWithMedia,
  JournalMediaUploadError,
} from '../features/journals/saveJournalWithMedia.js'
import { FRIEND_SEARCH_MIN_CHARS } from '../utils/journal/constants.js'
import { ApiError } from '../services/api.js'

function getInitials(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function formatRequestDate(value) {
  if (!value) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function relationshipFromLists(userId, { friends, incoming, outgoing }) {
  if (friends.some((friendship) => friendship.user.id === userId)) {
    return 'FRIEND'
  }

  if (outgoing.some((request) => request.recipient.id === userId)) {
    return 'REQUEST_SENT'
  }

  if (incoming.some((request) => request.sender.id === userId)) {
    return 'REQUEST_RECEIVED'
  }

  return 'NONE'
}

function UserAvatar({ username }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
      aria-hidden="true"
    >
      {getInitials(username)}
    </span>
  )
}

function EmptyState({ children }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  )
}

function FriendsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isUnlocked, lock, ensureCryptoMaterial } = useVault()
  const { showToast } = useToast()
  const {
    friends,
    incoming,
    outgoing,
    isLoadingLists,
    listError,
    refreshLists,
  } = useFriends()

  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebouncedValue(searchQuery, 300)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [pendingActionKey, setPendingActionKey] = useState(null)
  const [friendToRemove, setFriendToRemove] = useState(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const incomingBySenderId = useMemo(() => {
    const map = new Map()
    for (const request of incoming) {
      map.set(request.sender.id, request)
    }
    return map
  }, [incoming])

  const outgoingByRecipientId = useMemo(() => {
    const map = new Map()
    for (const request of outgoing) {
      map.set(request.recipient.id, request)
    }
    return map
  }, [outgoing])

  function syncSearchRelationships(lists) {
    setSearchResults((current) =>
      current.map((user) => ({
        ...user,
        relationship: relationshipFromLists(user.id, lists),
      })),
    )
  }

  useEffect(() => {
    setSearchResults((current) =>
      current.map((entry) => ({
        ...entry,
        relationship: relationshipFromLists(entry.id, {
          friends,
          incoming,
          outgoing,
        }),
      })),
    )
  }, [friends, incoming, outgoing])

  useEffect(() => {
    const normalized = debouncedQuery.trim()

    if (normalized.length < FRIEND_SEARCH_MIN_CHARS) {
      setSearchResults([])
      setIsSearching(false)
      setSearchError('')
      return
    }

    const controller = new AbortController()
    setIsSearching(true)
    setSearchError('')

    searchFriends(normalized, { signal: controller.signal })
      .then((users) => {
        if (!controller.signal.aborted) {
          setSearchResults(users)
        }
      })
      .catch((error) => {
        if (error?.name === 'AbortError' || controller.signal.aborted) {
          return
        }

        setSearchResults([])
        setSearchError(
          error instanceof ApiError
            ? error.message
            : 'Unable to search users.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      })

    return () => controller.abort()
  }, [debouncedQuery])

  function openUnlockModal() {
    setIsUnlockOpen(true)
  }

  function openCreateModal() {
    setIsCreateOpen(true)
  }

  function handleVaultStatusClick() {
    if (isUnlocked) {
      lock()
      return
    }

    openUnlockModal()
  }

  async function handleSaveJournal(draft, { updateToast, toastId } = {}) {
    const onProgress = (message) => {
      if (updateToast && toastId) {
        updateToast(toastId, { status: 'loading', message, persistent: true })
      }
    }

    try {
      await saveJournalWithMedia(draft, {
        ensureCryptoMaterial,
        onProgress,
      })
    } catch (error) {
      throw error
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function runAction(actionKey, action, successMessage) {
    if (pendingActionKey) {
      return
    }

    setPendingActionKey(actionKey)

    try {
      await action()
      const lists = await refreshLists()
      syncSearchRelationships(lists)

      if (successMessage) {
        showToast({ message: successMessage, status: 'success' })
      }
    } catch (error) {
      showToast({
        message:
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.',
        status: 'error',
      })
    } finally {
      setPendingActionKey(null)
    }
  }

  function handleSendRequest(userId, username) {
    return runAction(
      `send-${userId}`,
      () => friendService.sendFriendRequest(userId),
      `Friend request sent to ${username}.`,
    )
  }

  function handleAccept(requestId, username) {
    return runAction(
      `accept-${requestId}`,
      () => friendService.acceptFriendRequest(requestId),
      `You are now friends with ${username}.`,
    )
  }

  function handleDeclineOrCancel(requestId, successMessage) {
    return runAction(
      `delete-${requestId}`,
      () => friendService.deleteFriendRequest(requestId),
      successMessage,
    )
  }

  async function confirmRemoveFriend() {
    if (!friendToRemove || isRemoving) {
      return
    }

    setIsRemoving(true)

    try {
      await friendService.removeFriend(friendToRemove.user.id)
      const lists = await refreshLists()
      syncSearchRelationships(lists)
      showToast({
        message: `${friendToRemove.user.username} was removed from your friends.`,
        status: 'success',
      })
      setFriendToRemove(null)
    } catch (error) {
      showToast({
        message:
          error instanceof ApiError
            ? error.message
            : "Couldn't remove this friend.",
        status: 'error',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  function renderSearchAction(result) {
    const { id, username, relationship } = result

    if (relationship === 'FRIEND') {
      return (
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          Friends
        </span>
      )
    }

    if (relationship === 'REQUEST_SENT') {
      const request = outgoingByRecipientId.get(id)

      if (!request) {
        return (
          <span className="text-xs font-medium text-muted">Request sent</span>
        )
      }

      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-auto"
          disabled={pendingActionKey === `delete-${request.id}`}
          onClick={() =>
            handleDeclineOrCancel(request.id, 'Friend request cancelled.')
          }
        >
          {pendingActionKey === `delete-${request.id}` ? 'Cancelling…' : 'Cancel'}
        </Button>
      )
    }

    if (relationship === 'REQUEST_RECEIVED') {
      const request = incomingBySenderId.get(id)

      if (!request) {
        return (
          <span className="text-xs font-medium text-muted">Responds in Requests</span>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="w-auto"
            disabled={pendingActionKey === `accept-${request.id}`}
            onClick={() => handleAccept(request.id, username)}
          >
            {pendingActionKey === `accept-${request.id}` ? 'Accepting…' : 'Accept'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-auto"
            disabled={pendingActionKey === `delete-${request.id}`}
            onClick={() =>
              handleDeclineOrCancel(request.id, 'Friend request declined.')
            }
          >
            Decline
          </Button>
        </div>
      )
    }

    return (
      <Button
        type="button"
        size="sm"
        className="w-auto"
        disabled={pendingActionKey === `send-${id}`}
        onClick={() => handleSendRequest(id, username)}
      >
        <UserPlus size={14} strokeWidth={2} aria-hidden="true" />
        {pendingActionKey === `send-${id}` ? 'Sending…' : 'Add'}
      </Button>
    )
  }

  const showSearchPanel = searchQuery.trim().length >= FRIEND_SEARCH_MIN_CHARS

  return (
    <AppShell
      username={user?.username ?? 'User'}
      isUnlocked={isUnlocked}
      onCreateJournal={openCreateModal}
      onVaultStatusClick={handleVaultStatusClick}
    >
      <DashboardHeader
        isUnlocked={isUnlocked}
        onUnlockClick={openUnlockModal}
        onLockClick={lock}
        onLogoutClick={handleLogout}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-8 pb-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Friends</h1>
          <p className="mt-1 text-sm text-muted">
            Find people, manage requests, and keep your trusted circle.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="find-people-heading">
          <h2
            id="find-people-heading"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Find people
          </h2>
          <p className="mt-1 text-sm text-muted">
            Search by username. Type at least {FRIEND_SEARCH_MIN_CHARS} characters.
          </p>

          <div className="relative mt-4 max-w-xl">
            <Search
              size={16}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by username"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pr-3 pl-10 text-sm text-ink placeholder:text-muted transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {showSearchPanel ? (
            <div className="mt-4 max-w-xl rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
              {isSearching ? (
                <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted">
                  <LoaderCircle
                    size={16}
                    strokeWidth={2}
                    className="animate-spin text-brand"
                    aria-hidden="true"
                  />
                  Searching…
                </div>
              ) : searchError ? (
                <p className="px-4 py-5 text-sm text-danger">{searchError}</p>
              ) : searchResults.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted">No users found.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {searchResults.map((result) => (
                    <li
                      key={result.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar username={result.username} />
                        <p className="truncate text-sm font-semibold text-ink">
                          {result.username}
                        </p>
                      </div>
                      <div className="shrink-0">{renderSearchAction(result)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>

        {listError ? (
          <p className="mt-8 text-sm text-danger" role="alert">
            {listError}
          </p>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-2">
          <section aria-labelledby="incoming-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="incoming-heading"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                Incoming requests
              </h2>
              <span className="text-xs font-medium text-muted">
                {incoming.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {isLoadingLists ? (
                <EmptyState>Loading requests…</EmptyState>
              ) : incoming.length === 0 ? (
                <EmptyState>No incoming friend requests.</EmptyState>
              ) : (
                incoming.map((request) => (
                  <article
                    key={request.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar username={request.sender.username} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {request.sender.username}
                        </p>
                        <p className="text-xs text-muted">
                          {formatRequestDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="w-auto"
                        disabled={pendingActionKey === `accept-${request.id}`}
                        onClick={() =>
                          handleAccept(request.id, request.sender.username)
                        }
                      >
                        <Check size={14} strokeWidth={2.25} aria-hidden="true" />
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-auto"
                        disabled={pendingActionKey === `delete-${request.id}`}
                        onClick={() =>
                          handleDeclineOrCancel(
                            request.id,
                            'Friend request declined.',
                          )
                        }
                      >
                        <X size={14} strokeWidth={2.25} aria-hidden="true" />
                        Decline
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="outgoing-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="outgoing-heading"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                Outgoing requests
              </h2>
              <span className="text-xs font-medium text-muted">
                {outgoing.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {isLoadingLists ? (
                <EmptyState>Loading requests…</EmptyState>
              ) : outgoing.length === 0 ? (
                <EmptyState>No pending outgoing requests.</EmptyState>
              ) : (
                outgoing.map((request) => (
                  <article
                    key={request.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar username={request.recipient.username} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {request.recipient.username}
                        </p>
                        <p className="text-xs text-muted">
                          {formatRequestDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-auto shrink-0"
                      disabled={pendingActionKey === `delete-${request.id}`}
                      onClick={() =>
                        handleDeclineOrCancel(
                          request.id,
                          'Friend request cancelled.',
                        )
                      }
                    >
                      Cancel
                    </Button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-10" aria-labelledby="friends-list-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="friends-list-heading"
              className="text-lg font-semibold tracking-tight text-ink"
            >
              Your friends
            </h2>
            <span className="text-xs font-medium text-muted">{friends.length}</span>
          </div>

          <div className="mt-4 space-y-3">
            {isLoadingLists ? (
              <EmptyState>Loading friends…</EmptyState>
            ) : friends.length === 0 ? (
              <EmptyState>
                You have no friends yet. Search above to send a request.
              </EmptyState>
            ) : (
              friends.map((friendship) => (
                <article
                  key={friendship.friendshipId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar username={friendship.user.username} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {friendship.user.username}
                      </p>
                      <p className="text-xs text-muted">
                        Friends since {formatRequestDate(friendship.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-auto shrink-0"
                    onClick={() => setFriendToRemove(friendship)}
                  >
                    <UserMinus size={14} strokeWidth={2} aria-hidden="true" />
                    Remove
                  </Button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <UnlockPinModal open={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
      <CreateJournalModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveJournal}
      />
      <ConfirmModal
        open={Boolean(friendToRemove)}
        title="Remove friend?"
        description={
          friendToRemove
            ? `Remove ${friendToRemove.user.username} from your friends? Shared journals are not changed yet.`
            : undefined
        }
        confirmLabel="Remove"
        confirmingLabel="Removing…"
        confirmVariant="danger"
        isConfirming={isRemoving}
        onConfirm={confirmRemoveFriend}
        onClose={() => {
          if (!isRemoving) {
            setFriendToRemove(null)
          }
        }}
      />
    </AppShell>
  )
}

export default FriendsPage
