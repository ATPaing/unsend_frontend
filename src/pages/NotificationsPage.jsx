import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, LoaderCircle } from 'lucide-react'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import * as journalService from '../features/journals/journalService.js'
import {
  getNotificationHref,
  getNotificationMessage,
} from '../features/notifications/notificationCopy.js'
import { useNotifications } from '../features/notifications/NotificationsContext.jsx'
import { useToast } from '../features/toast/ToastContext.jsx'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'
import {
  saveJournalWithMedia,
  JournalMediaUploadError,
} from '../features/journals/saveJournalWithMedia.js'
import { ApiError } from '../services/api.js'

function getInitials(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function NotificationsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isUnlocked, lock, ensureCryptoMaterial } = useVault()
  const { showToast } = useToast()
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
  } = useNotifications()

  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pendingActionKey, setPendingActionKey] = useState(null)

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
      if (error instanceof JournalMediaUploadError) {
        throw error
      }

      throw error
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleMarkAllRead() {
    if (pendingActionKey || unreadCount === 0) {
      return
    }

    setPendingActionKey('read-all')

    try {
      await markAllRead()
      showToast({
        message: 'All notifications marked as read.',
        status: 'success',
      })
    } catch (markError) {
      showToast({
        message:
          markError instanceof ApiError
            ? markError.message
            : 'Unable to mark notifications as read.',
        status: 'error',
      })
    } finally {
      setPendingActionKey(null)
    }
  }

  async function handleNotificationClick(notification) {
    if (pendingActionKey) {
      return
    }

    const href = getNotificationHref(notification)

    if (!notification.isRead) {
      setPendingActionKey(`read-${notification.id}`)

      try {
        await markRead(notification.id)
      } catch (markError) {
        showToast({
          message:
            markError instanceof ApiError
              ? markError.message
              : 'Unable to update notification.',
          status: 'error',
        })
        setPendingActionKey(null)
        return
      } finally {
        setPendingActionKey(null)
      }
    }

    if (href) {
      navigate(href)
    }
  }

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted">
              Friend requests and activity from people you trust.
            </p>
          </header>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-auto"
            disabled={unreadCount === 0 || pendingActionKey === 'read-all'}
            onClick={handleMarkAllRead}
          >
            <CheckCheck size={14} strokeWidth={2} aria-hidden="true" />
            {pendingActionKey === 'read-all' ? 'Marking…' : 'Mark all read'}
          </Button>
        </div>

        {error ? (
          <p className="mt-8 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-8" aria-labelledby="notifications-list-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="notifications-list-heading" className="sr-only">
              Notification list
            </h2>
            <p className="text-xs font-medium text-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-8 text-sm text-muted">
                <LoaderCircle
                  size={16}
                  strokeWidth={2}
                  className="animate-spin text-brand"
                  aria-hidden="true"
                />
                Loading notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-12 text-center">
                <Bell
                  size={28}
                  strokeWidth={1.5}
                  className="mx-auto text-muted"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-medium text-ink">
                  No notifications yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Friend requests and acceptances will show up here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isPending =
                  pendingActionKey === `read-${notification.id}`

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    disabled={Boolean(pendingActionKey)}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition hover:bg-page disabled:cursor-wait ${
                      notification.isRead
                        ? 'border-border bg-surface'
                        : 'border-brand/30 bg-brand-soft/60'
                    }`}
                  >
                    <span
                      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
                      aria-hidden="true"
                    >
                      {getInitials(notification.actor?.username)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">
                          {getNotificationMessage(notification)}
                        </span>
                        {!notification.isRead ? (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                            aria-label="Unread"
                          />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {isPending
                          ? 'Updating…'
                          : formatNotificationDate(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                )
              })
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
    </AppShell>
  )
}

export default NotificationsPage
