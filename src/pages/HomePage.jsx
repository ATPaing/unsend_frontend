import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import RecentJournals from '../features/journals/RecentJournals.jsx'
import SharedJournalsEmpty from '../features/journals/SharedJournalsEmpty.jsx'
import { encryptDraftForCreate } from '../features/journals/encryptDraftForCreate.js'
import { useJournals } from '../features/journals/useJournals.js'
import * as journalService from '../features/journals/journalService.js'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'

function getGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isUnlocked, lock, ensureCryptoMaterial } = useVault()
  const { journals, prependJournal, refreshJournalById } = useJournals()
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState('journal')
  const greeting = useMemo(() => getGreeting(), [])

  function openUnlockModal() {
    setIsUnlockOpen(true)
  }

  function openCreateModal(kind = 'journal') {
    setCreateKind(kind)
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
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {greeting}, {user?.username ?? 'there'}
            </h1>
            <p className="mt-1 text-sm text-muted">Your thoughts, kept private.</p>
          </header>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              onClick={() => openCreateModal('capsule')}
            >
              Create Time Capsule
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-auto"
              onClick={() => openCreateModal('journal')}
            >
              New Journal
            </Button>
          </div>
        </div>

        <div className="mt-8">
          {journals.length > 0 ? (
            <RecentJournals
              journals={journals}
              isUnlocked={isUnlocked}
              onCapsuleExpired={refreshJournalById}
            />
          ) : (
            <SharedJournalsEmpty onStartDraft={openCreateModal} />
          )}
        </div>
      </div>

      <UnlockPinModal open={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
      <CreateJournalModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveJournal}
        createKind={createKind}
      />
    </AppShell>
  )
}

export default HomePage
