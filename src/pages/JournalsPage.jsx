import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import JournalCard from '../features/journals/JournalCard.jsx'
import SharedJournalsEmpty from '../features/journals/SharedJournalsEmpty.jsx'
import { encryptDraftForCreate } from '../features/journals/encryptDraftForCreate.js'
import { useJournals } from '../features/journals/useJournals.js'
import * as journalService from '../features/journals/journalService.js'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'

function JournalsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isUnlocked, lock, ensureCryptoMaterial } = useVault()
  const { journals, isLoading, prependJournal } = useJournals()
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const regularJournals = useMemo(
    () => journals.filter((journal) => journal.journalType !== 'T_CAPSULE'),
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

  async function handleSaveJournal(draft) {
    const material = await ensureCryptoMaterial()
    const payload = await encryptDraftForCreate(draft, material.publicKey)
    // TODO: Upload journal image to object storage when media storage is implemented.
    const created = await journalService.createJournal(payload)
    await prependJournal(created)
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
            <h1 className="text-3xl font-bold tracking-tight text-ink">My Journals</h1>
            <p className="mt-1 text-sm text-muted">
              All of your private entries in one place.
            </p>
          </header>

          <Button
            type="button"
            size="sm"
            className="w-auto"
            onClick={openCreateModal}
          >
            New Journal
          </Button>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <p className="text-sm text-muted">Loading journals…</p>
          ) : regularJournals.length === 0 ? (
            <SharedJournalsEmpty onStartDraft={openCreateModal} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {regularJournals.map((journal) => (
                <div key={journal.id} className="min-w-0">
                  <JournalCard journal={journal} isUnlocked={isUnlocked} />
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
        onSave={handleSaveJournal}
        createKind="journal"
      />
    </AppShell>
  )
}

export default JournalsPage
