import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock3 } from 'lucide-react'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import JournalCard from '../features/journals/JournalCard.jsx'
import {
  saveJournalWithMedia,
  JournalMediaUploadError,
} from '../features/journals/saveJournalWithMedia.js'
import { useJournals } from '../features/journals/useJournals.js'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'

function TimeCapsulesEmpty({ onCreate }) {
  return (
    <section aria-labelledby="empty-capsules-heading">
      <h2 id="empty-capsules-heading" className="sr-only">
        Start a time capsule
      </h2>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface/60 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
          <Clock3 size={22} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          No time capsules yet. Lock a message for your future self — you
          won&apos;t be able to open it until the time you choose.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 w-auto"
          onClick={onCreate}
        >
          Create Time Capsule
        </Button>
      </div>
    </section>
  )
}

function TimeCapsulesPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isUnlocked, lock, ensureCryptoMaterial } = useVault()
  const { journals, isLoading, prependJournal, refreshJournalById } =
    useJournals()
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const capsules = useMemo(
    () => journals.filter((journal) => journal.journalType === 'T_CAPSULE'),
    [journals],
  )

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

  async function handleSaveCapsule(draft, { updateToast, toastId } = {}) {
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
      await prependJournal(journal)
      navigate(`/journals/${journal.id}`)
    } catch (error) {
      if (error instanceof JournalMediaUploadError) {
        await prependJournal(error.journal)
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
              Time Capsules
            </h1>
            <p className="mt-1 text-sm text-muted">
              Encrypted messages sealed until their unlock time.
            </p>
          </header>

          <Button
            type="button"
            size="sm"
            className="w-auto"
            onClick={openCreateModal}
          >
            New Time Capsule
          </Button>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <p className="text-sm text-muted">Loading time capsules…</p>
          ) : capsules.length === 0 ? (
            <TimeCapsulesEmpty onCreate={openCreateModal} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {capsules.map((journal) => (
                <div key={journal.id} className="min-w-0">
                  <JournalCard
                    journal={journal}
                    isUnlocked={isUnlocked}
                    onCapsuleExpired={() => refreshJournalById(journal.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <UnlockPinModal open={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
      <CreateJournalModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveCapsule}
        createKind="capsule"
      />
    </AppShell>
  )
}

export default TimeCapsulesPage
