import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock3, Lock, Share2 } from 'lucide-react'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import {
  formatUnlockDateTime,
  isCapsuleLockedClient,
} from '../features/journals/capsuleTime.js'
import LiveCountdown from '../features/journals/LiveCountdown.jsx'
import { useSharedJournals } from '../features/journals/SharedJournalsContext.jsx'
import { formatJournalDate } from '../features/journals/mapJournalCard.js'
import CiphertextReveal from '../components/ui/CiphertextReveal.jsx'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'
import { decryptJournalForAccess } from '../utils/crypto/decryptJournal.js'
import {
  saveJournalWithMedia,
  JournalMediaUploadError,
} from '../features/journals/saveJournalWithMedia.js'

function getInitials(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function SharedJournalCard({ journal, isUnlocked, decrypted, onCapsuleExpired }) {
  const capsuleLocked = isCapsuleLockedClient(journal)

  if (capsuleLocked) {
    return (
      <Link
        to={`/journals/${journal.id}`}
        className="block rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition hover:border-brand/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
              <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
              Time Capsule
            </p>
            <h3 className="mt-2 flex items-center gap-2 text-base font-semibold text-ink">
              <Lock size={15} strokeWidth={2} aria-hidden="true" />
              Encrypted Time Capsule
            </h3>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                {getInitials(journal.owner?.username)}
              </span>
              Shared by @{journal.owner?.username ?? 'someone'}
            </p>
            <p className="mt-2 text-xs text-muted">
              Unlocks {formatUnlockDateTime(journal.unlockAt)}
            </p>
            <p className="mt-1 text-xs font-medium text-brand">
              <LiveCountdown
                unlockAt={journal.unlockAt}
                onExpired={() => onCapsuleExpired?.(journal.id)}
              />
            </p>
          </div>
          <time className="shrink-0 text-xs text-muted">
            {formatJournalDate(journal.sharedAt || journal.createdAt)}
          </time>
        </div>
      </Link>
    )
  }

  const title =
    isUnlocked && decrypted?.title?.trim()
      ? decrypted.title.trim()
      : 'Encrypted journal'

  return (
    <Link
      to={`/journals/${journal.id}`}
      className="block rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition hover:border-brand/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isUnlocked && decrypted ? (
            <h3 className="truncate text-base font-semibold text-ink">{title}</h3>
          ) : (
            <CiphertextReveal
              as="h3"
              className="line-clamp-2 overflow-hidden font-mono text-sm leading-relaxed text-slate-500"
              ciphertext={journal.encryptedTitle}
              plaintext={null}
              revealed={false}
              blurWhenLocked
            />
          )}
          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
              {getInitials(journal.owner?.username)}
            </span>
            Shared by @{journal.owner?.username ?? 'someone'}
          </p>
        </div>
        <time className="shrink-0 text-xs text-muted">
          {formatJournalDate(journal.sharedAt || journal.createdAt)}
        </time>
      </div>
    </Link>
  )
}

function SharedWithMePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    isUnlocked,
    lock,
    privateKey,
    ensureCryptoMaterial,
    decryptedCache,
    setDecryptedValue,
    clearDecryptedValue,
  } = useVault()
  const { journals, isLoading, error, refreshSharedJournalById } = useSharedJournals()
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    if (!isUnlocked || !privateKey) {
      return
    }

    let cancelled = false

    async function decryptAll() {
      for (const journal of journals) {
        if (decryptedCache.has(journal.id)) {
          continue
        }

        if (isCapsuleLockedClient(journal) || !journal.encryptedAesKey) {
          continue
        }

        try {
          const next = await decryptJournalForAccess(journal, privateKey)
          if (!cancelled) {
            setDecryptedValue(journal.id, next)
          }
        } catch (decryptError) {
          console.error('Failed to decrypt shared journal', journal.id, decryptError)
          if (!cancelled) {
            clearDecryptedValue(journal.id)
          }
        }
      }
    }

    decryptAll()

    return () => {
      cancelled = true
    }
  }, [
    journals,
    isUnlocked,
    privateKey,
    decryptedCache,
    setDecryptedValue,
    clearDecryptedValue,
  ])

  function handleVaultStatusClick() {
    if (isUnlocked) {
      lock()
      return
    }

    setIsUnlockOpen(true)
  }

  async function handleSaveJournal(draft, { updateToast, toastId } = {}) {
    const onProgress = (message) => {
      if (updateToast && toastId) {
        updateToast(toastId, { status: 'loading', message, persistent: true })
      }
    }

    try {
      const { journal } = await saveJournalWithMedia(draft, {
        ensureCryptoMaterial,
        onProgress,
      })
      navigate(`/journals/${journal.id}`)
    } catch (error) {
      if (error instanceof JournalMediaUploadError) {
        navigate(`/journals/${error.journal.id}`)
      }

      throw error
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      username={user?.username ?? 'User'}
      isUnlocked={isUnlocked}
      onCreateJournal={() => setIsCreateOpen(true)}
      onVaultStatusClick={handleVaultStatusClick}
    >
      <DashboardHeader
        isUnlocked={isUnlocked}
        onUnlockClick={() => setIsUnlockOpen(true)}
        onLockClick={lock}
        onLogoutClick={handleLogout}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-8 pb-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Shared With Me
          </h1>
          <p className="mt-1 text-sm text-muted">
            Journals friends wrapped for your keys alone.
          </p>
        </header>

        {error ? (
          <p className="mt-8 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          {isLoading ? (
            <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-sm text-muted">
              Loading shared journals…
            </p>
          ) : journals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-14 text-center">
              <Share2
                size={28}
                strokeWidth={1.5}
                className="mx-auto text-muted"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-ink">
                Nothing shared with you yet
              </p>
              <p className="mt-1 text-sm text-muted">
                When a friend shares a journal, it will appear here.
              </p>
            </div>
          ) : (
            journals.map((journal) => (
              <SharedJournalCard
                key={journal.id}
                journal={journal}
                isUnlocked={isUnlocked}
                decrypted={decryptedCache.get(journal.id)}
                onCapsuleExpired={() => refreshSharedJournalById(journal.id)}
              />
            ))
          )}
        </div>

        {!isUnlocked && journals.length > 0 ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted">
            <Lock size={14} strokeWidth={2} aria-hidden="true" />
            Unlock your vault to decrypt shared journals.
          </div>
        ) : null}
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

export default SharedWithMePage
