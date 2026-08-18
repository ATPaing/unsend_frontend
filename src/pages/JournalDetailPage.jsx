import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import Button from '../components/ui/Button.jsx'
import ConfirmModal from '../components/ui/ConfirmModal.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import JournalReadingView from '../features/journals/JournalReadingView.jsx'
import LockedTimeCapsuleView from '../features/journals/LockedTimeCapsuleView.jsx'
import ShareJournalModal from '../features/journals/ShareJournalModal.jsx'
import { saveJournalWithMedia, JournalMediaUploadError } from '../features/journals/saveJournalWithMedia.js'
import { useJournalMediaImage } from '../features/journals/useJournalMediaImage.js'
import { isCapsuleLockedClient } from '../features/journals/capsuleTime.js'
import * as journalService from '../features/journals/journalService.js'
import { useRealtimeEvent } from '../features/realtime/RealtimeContext.jsx'
import { getServerNowMs } from '../features/time/serverClock.js'
import { useToast } from '../features/toast/ToastContext.jsx'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'
import { decryptJournalForAccess } from '../utils/crypto/decryptJournal.js'
import { encryptOwnerJournalUpdate } from '../utils/crypto/encryptJournal.js'
import { ApiError } from '../services/api.js'

function JournalDetailPage() {
  const { journalId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    isUnlocked,
    lock,
    privateKey,
    ensureCryptoMaterial,
    decryptedCache,
    setDecryptedValue,
    clearDecryptedValue,
  } = useVault()

  const [journal, setJournal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState('journal')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const unlockPollRef = useRef(null)

  const decrypted = journal ? decryptedCache.get(journal.id) : null
  const isShared = journal?.access === 'SHARED'
  const isOwnedCapsule =
    !isShared && journal?.journalType === 'T_CAPSULE'
  const capsuleLocked = isCapsuleLockedClient(journal)
  const canLoadMedia = Boolean(
    journal && isUnlocked && privateKey && !capsuleLocked && decrypted,
  )
  const {
    imageUrl,
    status: imageStatus,
    errorMessage: imageErrorMessage,
  } = useJournalMediaImage({
    journal,
    privateKey,
    enabled: canLoadMedia,
  })
  const backTo = isShared
    ? '/shared'
    : isOwnedCapsule
      ? '/time-capsules'
      : '/journals'
  const backLabel = isShared
    ? 'Back to Shared With Me'
    : isOwnedCapsule
      ? 'Back to Time Capsules'
      : 'Back to journals'

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const next = await journalService.getJournal(journalId)
        if (!cancelled) {
          setJournal(next)
        }
      } catch (loadError) {
        if (!cancelled) {
          setJournal(null)
          if (loadError instanceof ApiError && loadError.status === 404) {
            setError('Journal not found.')
          } else {
            setError('Unable to load this journal.')
            console.error('Failed to load journal', loadError)
          }
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
  }, [journalId])

  useEffect(() => {
    if (!journal || !capsuleLocked || !journal.unlockAt) {
      return undefined
    }

    let cancelled = false

    function schedulePoll(unlockAtMs) {
      const delay = Math.max(unlockAtMs - getServerNowMs() + 750, 5_000)
      const capped = Math.min(delay, 60_000)

      unlockPollRef.current = window.setTimeout(async () => {
        try {
          const next = await journalService.getJournal(journalId)
          if (cancelled) {
            return
          }

          setJournal(next)

          if (next.isUnlocked === false && next.unlockAt) {
            const nextMs = new Date(next.unlockAt).getTime()
            if (!Number.isNaN(nextMs)) {
              schedulePoll(nextMs)
            }
          }
        } catch (pollError) {
          console.error('Failed to refresh capsule unlock state', pollError)
          if (!cancelled) {
            schedulePoll(unlockAtMs)
          }
        }
      }, capped)
    }

    schedulePoll(new Date(journal.unlockAt).getTime())

    return () => {
      cancelled = true
      if (unlockPollRef.current) {
        window.clearTimeout(unlockPollRef.current)
      }
    }
  }, [journal?.id, journal?.unlockAt, capsuleLocked, journalId])

  useEffect(() => {
    if (!journal || !isUnlocked || !privateKey || capsuleLocked) {
      return
    }

    if (decryptedCache.has(journal.id)) {
      return
    }

    const wrappedKey =
      journal.access === 'SHARED'
        ? journal.encryptedAesKey
        : journal.ownerEncryptedAesKey

    if (!wrappedKey) {
      return
    }

    let cancelled = false

    async function decrypt() {
      try {
        const next = await decryptJournalForAccess(journal, privateKey)
        if (!cancelled) {
          setDecryptedValue(journal.id, next)
        }
      } catch (decryptError) {
        console.error('Failed to decrypt journal detail', decryptError)
        if (!cancelled) {
          clearDecryptedValue(journal.id)
        }
      }
    }

    decrypt()

    return () => {
      cancelled = true
    }
  }, [
    journal,
    isUnlocked,
    privateKey,
    capsuleLocked,
    decryptedCache,
    setDecryptedValue,
    clearDecryptedValue,
  ])

  useRealtimeEvent('journal.unshared', (payload) => {
    if (!journal || Number(payload?.journalId) !== Number(journal.id)) {
      return
    }

    if (journal.access !== 'SHARED') {
      return
    }

    clearDecryptedValue(journal.id)
    showToast({
      message:
        payload?.reason === 'deleted'
          ? 'This shared entry was deleted by its owner.'
          : 'Access to this journal was revoked.',
      status: 'info',
    })
    navigate('/shared', { replace: true })
  })

  useRealtimeEvent('journal.unlock-at.updated', (payload) => {
    if (!journal || Number(payload?.journalId) !== Number(journal.id)) {
      return
    }

    if (payload?.unlockAt == null) {
      return
    }

    setJournal((current) => {
      if (!current) {
        return current
      }

      const nextIsUnlocked =
        payload.isUnlocked === undefined
          ? current.isUnlocked
          : payload.isUnlocked

      // Extending always keeps the capsule locked — drop any stale cipher fields.
      if (nextIsUnlocked === false) {
        return {
          ...current,
          unlockAt: payload.unlockAt,
          isUnlocked: false,
          encryptedTitle: undefined,
          titleNonce: undefined,
          encryptedContent: undefined,
          contentNonce: undefined,
          ownerEncryptedAesKey: undefined,
          encryptedAesKey: undefined,
        }
      }

      return {
        ...current,
        unlockAt: payload.unlockAt,
        isUnlocked: nextIsUnlocked,
      }
    })

    if (journal.access === 'SHARED') {
      showToast({
        message: 'The unlock time for this capsule was extended.',
        status: 'info',
      })
    }
  })

  function openUnlockModal() {
    setIsUnlockOpen(true)
  }

  function handleVaultStatusClick() {
    if (isUnlocked) {
      lock()
      return
    }

    openUnlockModal()
  }

  function handleEdit() {
    if (isShared || capsuleLocked) {
      return
    }

    if (!isUnlocked || !decrypted) {
      openUnlockModal()
      return
    }

    setIsEditOpen(true)
  }

  function handleShare() {
    if (isShared || capsuleLocked) {
      return
    }

    if (!isUnlocked || !privateKey) {
      openUnlockModal()
      return
    }

    setIsShareOpen(true)
  }

  async function handleSaveJournal(draft, { updateToast, toastId } = {}) {
    const onProgress = (message) => {
      if (updateToast && toastId) {
        updateToast(toastId, { status: 'loading', message, persistent: true })
      }
    }

    try {
      const { journal: created } = await saveJournalWithMedia(draft, {
        ensureCryptoMaterial,
        onProgress,
      })
      navigate(`/journals/${created.id}`)
    } catch (error) {
      if (error instanceof JournalMediaUploadError) {
        navigate(`/journals/${error.journal.id}`)
      }

      throw error
    }
  }

  async function handleUpdateJournal(draft) {
    if (!journal || isShared || capsuleLocked || !privateKey) {
      return
    }

    const payload = await encryptOwnerJournalUpdate({
      title: draft.title,
      content: draft.content,
      existingOwnerEncryptedAesKeyBase64: journal.ownerEncryptedAesKey,
      ownerPrivateKey: privateKey,
    })
    const updated = await journalService.updateJournal(journal.id, payload)
    setJournal(updated)
    setDecryptedValue(updated.id, {
      title: draft.title,
      content: draft.content,
    })
  }

  async function handleExtendUnlockAt(unlockAt) {
    if (!journal || isShared || !capsuleLocked) {
      return
    }

    setIsExtending(true)

    try {
      const updated = await journalService.updateJournalUnlockAt(
        journal.id,
        unlockAt,
      )
      setJournal(updated)
      showToast({
        status: 'success',
        message: 'Unlock time extended.',
        duration: 3000,
      })
    } catch (extendError) {
      showToast({
        status: 'error',
        message:
          extendError instanceof ApiError
            ? extendError.message
            : 'Unable to extend unlock time.',
        duration: 4500,
      })
      throw extendError
    } finally {
      setIsExtending(false)
    }
  }

  function handleShared(friendUser) {
    setJournal((current) => {
      if (!current) {
        return current
      }

      const sharedWith = [...(current.sharedWith ?? [])]
      if (!sharedWith.some((user) => Number(user.id) === Number(friendUser.id))) {
        sharedWith.unshift({
          id: friendUser.id,
          username: friendUser.username,
          sharedAt: new Date().toISOString(),
        })
      }

      return {
        ...current,
        sharedWith,
      }
    })
  }

  function handleRevoked(user) {
    setJournal((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        sharedWith: (current.sharedWith ?? []).filter(
          (entry) => Number(entry.id) !== Number(user.id),
        ),
      }
    })
  }

  function handleDeleteRequest() {
    if (!journal || isDeleting || isShared) {
      return
    }

    setIsDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!journal || isDeleting || isShared) {
      return
    }

    setIsDeleting(true)

    try {
      await journalService.deleteJournal(journal.id)
      clearDecryptedValue(journal.id)
      setIsDeleteOpen(false)
      showToast({
        status: 'success',
        message:
          journal.journalType === 'T_CAPSULE'
            ? 'Time capsule deleted.'
            : 'Journal deleted.',
        duration: 3000,
      })
      navigate(isOwnedCapsule ? '/time-capsules' : '/journals', {
        replace: true,
      })
    } catch (deleteError) {
      console.error('Failed to delete journal', deleteError)
      showToast({
        status: 'error',
        message: "Couldn't delete this journal. Please try again.",
        duration: 4500,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppShell
      username={user?.username ?? 'User'}
      isUnlocked={isUnlocked}
      onCreateJournal={() => {
        setCreateKind('journal')
        setIsCreateOpen(true)
      }}
      onVaultStatusClick={handleVaultStatusClick}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-10 sm:px-6 sm:pt-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-brand"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {backLabel}
          </Link>

          {isUnlocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              onClick={lock}
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" />
              Lock Vault
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              onClick={openUnlockModal}
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" />
              Unlock Vault
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Loading journal…</p>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-auto"
              onClick={() => navigate(backTo)}
            >
              Go back
            </Button>
          </div>
        ) : journal && capsuleLocked ? (
          <LockedTimeCapsuleView
            journal={journal}
            onDelete={handleDeleteRequest}
            onExtendUnlockAt={handleExtendUnlockAt}
            onUnlockElapsed={() => {
              journalService
                .getJournal(journalId)
                .then((next) => setJournal(next))
                .catch((refreshError) => {
                  console.error(
                    'Failed to refresh capsule after unlock time',
                    refreshError,
                  )
                })
            }}
            isDeleting={isDeleting}
            isExtending={isExtending}
          />
        ) : journal ? (
          <JournalReadingView
            journal={journal}
            decrypted={decrypted}
            isUnlocked={isUnlocked}
            imageUrl={imageUrl}
            imageStatus={imageStatus}
            imageErrorMessage={imageErrorMessage}
            access={journal.access || 'OWNED'}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onShare={handleShare}
            isDeleting={isDeleting}
          />
        ) : null}
      </div>

      <UnlockPinModal open={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
      <ConfirmModal
        open={isDeleteOpen}
        title={
          journal?.journalType === 'T_CAPSULE'
            ? 'Delete time capsule?'
            : 'Delete journal?'
        }
        description="This permanently deletes the encrypted entry. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmingLabel="Deleting…"
        confirmVariant="danger"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteOpen(false)
          }
        }}
      />
      <CreateJournalModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveJournal}
        createKind={createKind}
      />
      <CreateJournalModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={handleUpdateJournal}
        mode="edit"
        initialDraft={
          decrypted
            ? { title: decrypted.title, content: decrypted.content }
            : null
        }
      />
      <ShareJournalModal
        open={isShareOpen}
        journal={journal}
        onClose={() => setIsShareOpen(false)}
        onShared={handleShared}
        onRevoked={handleRevoked}
      />
    </AppShell>
  )
}

export default JournalDetailPage
