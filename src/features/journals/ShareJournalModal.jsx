import { useEffect, useId, useMemo, useState } from 'react'
import { LoaderCircle, Search, Share2, X } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import { useFriends } from '../friends/FriendsContext.jsx'
import * as friendService from '../friends/friendService.js'
import { useToast } from '../toast/ToastContext.jsx'
import { useVault } from '../vault/useVault.js'
import { wrapJournalAesKeyForFriend } from '../../utils/crypto/encryptJournal.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { ApiError } from '../../services/api.js'
import * as journalService from './journalService.js'

function getInitials(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function ShareJournalModal({ open, journal, onClose, onShared, onRevoked }) {
  const titleId = useId()
  const { friends } = useFriends()
  const { isUnlocked, privateKey } = useVault()
  const { showToast } = useToast()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [pendingFriendId, setPendingFriendId] = useState(null)
  const [pendingRevokeId, setPendingRevokeId] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [localShared, setLocalShared] = useState([])
  const [revokedIds, setRevokedIds] = useState(() => new Set())

  const sharedUsers = useMemo(() => {
    const byId = new Map()

    for (const user of journal?.sharedWith ?? []) {
      if (revokedIds.has(Number(user.id))) {
        continue
      }

      byId.set(Number(user.id), {
        id: user.id,
        username: user.username,
        sharedAt: user.sharedAt,
      })
    }

    for (const user of localShared) {
      if (revokedIds.has(Number(user.id))) {
        continue
      }

      byId.set(Number(user.id), {
        id: user.id,
        username: user.username,
        sharedAt: user.sharedAt,
      })
    }

    return Array.from(byId.values())
  }, [journal?.sharedWith, localShared, revokedIds])

  const alreadySharedIds = useMemo(
    () => new Set(sharedUsers.map((user) => Number(user.id))),
    [sharedUsers],
  )

  const filteredFriends = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase()
    const list = friends
      .map((friendship) => friendship.user)
      .filter((user) => !alreadySharedIds.has(Number(user.id)))

    if (!normalized) {
      return list
    }

    return list.filter((user) =>
      user.username.toLowerCase().includes(normalized),
    )
  }, [friends, debouncedQuery, alreadySharedIds])

  const isBusy = Boolean(pendingFriendId || pendingRevokeId)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setPendingFriendId(null)
      setPendingRevokeId(null)
      setRevokeTarget(null)
      setLocalShared([])
      setRevokedIds(new Set())
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isBusy && !revokeTarget) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isBusy, revokeTarget, onClose])

  if (!open || !journal) {
    return null
  }

  async function handleShare(friendUser) {
    if (!isUnlocked || !privateKey) {
      showToast({
        message: 'Unlock your vault before sharing a journal.',
        status: 'error',
      })
      return
    }

    if (isBusy) {
      return
    }

    setPendingFriendId(friendUser.id)

    try {
      const friendCrypto = await friendService.getFriendPublicKey(friendUser.id)
      const viewerEncryptedAesKey = await wrapJournalAesKeyForFriend({
        ownerEncryptedAesKeyBase64: journal.ownerEncryptedAesKey,
        ownerPrivateKey: privateKey,
        friendPublicKeyBase64: friendCrypto.publicKey,
      })

      await journalService.shareJournal(journal.id, {
        userId: friendUser.id,
        viewerEncryptedAesKey,
      })

      const sharedUser = {
        id: friendUser.id,
        username: friendUser.username,
        sharedAt: new Date().toISOString(),
      }
      setRevokedIds((current) => {
        const next = new Set(current)
        next.delete(Number(friendUser.id))
        return next
      })
      setLocalShared((current) => [
        sharedUser,
        ...current.filter((user) => Number(user.id) !== Number(friendUser.id)),
      ])
      onShared?.(friendUser)
      showToast({
        message: `Journal shared securely with @${friendUser.username}.`,
        status: 'success',
      })
    } catch (error) {
      showToast({
        message:
          error instanceof ApiError
            ? error.message
            : 'Unable to share this journal.',
        status: 'error',
      })
    } finally {
      setPendingFriendId(null)
    }
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget || isBusy) {
      return
    }

    const target = revokeTarget
    setPendingRevokeId(target.id)

    try {
      await journalService.revokeJournalShare(journal.id, target.id)
      setRevokedIds((current) => new Set(current).add(Number(target.id)))
      setLocalShared((current) =>
        current.filter((user) => Number(user.id) !== Number(target.id)),
      )
      onRevoked?.(target)
      setRevokeTarget(null)
      showToast({
        message: `Access revoked for @${target.username}.`,
        status: 'success',
      })
    } catch (error) {
      showToast({
        message:
          error instanceof ApiError
            ? error.message
            : 'Unable to revoke access.',
        status: 'error',
      })
    } finally {
      setPendingRevokeId(null)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6"
        role="presentation"
        onClick={() => {
          if (!isBusy && !revokeTarget) {
            onClose()
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-[var(--shadow-card)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-bold text-ink">
                Share journal
              </h2>
              <p className="mt-1 text-sm text-muted">
                Wrap this journal&apos;s key for a friend. Only they can decrypt
                it.
              </p>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-page hover:text-ink disabled:opacity-60"
              aria-label="Close"
              onClick={onClose}
              disabled={isBusy}
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {sharedUsers.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                People with access
              </p>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {sharedUsers.map((user) => {
                  const isRevoking = pendingRevokeId === user.id

                  return (
                    <li
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                          {getInitials(user.username)}
                        </span>
                        <span className="truncate text-sm font-semibold text-ink">
                          {user.username}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-auto text-danger hover:border-red-200 hover:bg-red-50"
                        disabled={isBusy}
                        onClick={() => setRevokeTarget(user)}
                      >
                        {isRevoking ? (
                          <>
                            <LoaderCircle
                              size={14}
                              strokeWidth={2}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                            Revoking…
                          </>
                        ) : (
                          'Revoke'
                        )}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!isUnlocked ? (
            <p className="mt-4 rounded-xl border border-border bg-page px-3 py-3 text-sm text-muted">
              Unlock your vault to share this journal.
            </p>
          ) : (
            <>
              <div className="relative mt-4">
                <Search
                  size={16}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter friends"
                  autoComplete="off"
                  className="w-full rounded-xl border border-border bg-surface py-2.5 pr-3 pl-10 text-sm text-ink placeholder:text-muted transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {filteredFriends.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
                    No friends to share with yet.
                  </li>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSharing = pendingFriendId === friend.id

                    return (
                      <li
                        key={friend.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                            {getInitials(friend.username)}
                          </span>
                          <span className="truncate text-sm font-semibold text-ink">
                            {friend.username}
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          className="w-auto"
                          disabled={isBusy}
                          onClick={() => handleShare(friend)}
                        >
                          {isSharing ? (
                            <>
                              <LoaderCircle
                                size={14}
                                strokeWidth={2}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                              Sharing…
                            </>
                          ) : (
                            <>
                              <Share2
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              Share
                            </>
                          )}
                        </Button>
                      </li>
                    )
                  })
                )}
              </ul>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(revokeTarget)}
        title="Revoke access?"
        description={
          revokeTarget
            ? `@${revokeTarget.username} will no longer be able to open this journal. They will keep any plaintext they already decrypted offline.`
            : ''
        }
        confirmLabel="Revoke access"
        cancelLabel="Cancel"
        confirmingLabel="Revoking…"
        confirmVariant="danger"
        isConfirming={Boolean(pendingRevokeId)}
        onConfirm={handleRevokeConfirm}
        onClose={() => {
          if (!pendingRevokeId) {
            setRevokeTarget(null)
          }
        }}
      />
    </>
  )
}

export default ShareJournalModal
