import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import AppSidebar from './AppSidebar.jsx'
import { useNotifications } from '../../features/notifications/NotificationsContext.jsx'

function AppShell({
  username,
  isUnlocked,
  onCreateJournal,
  onVaultStatusClick,
  children,
}) {
  const { unreadCount } = useNotifications()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  function handleCreateJournal() {
    closeMobileNav()
    onCreateJournal?.()
  }

  useEffect(() => {
    if (!mobileNavOpen) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMobileNav()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileNavOpen])

  const sidebar = (
    <AppSidebar
      username={username}
      isUnlocked={isUnlocked}
      onCreateJournal={handleCreateJournal}
      onVaultStatusClick={() => {
        closeMobileNav()
        onVaultStatusClick?.()
      }}
      onNavigate={closeMobileNav}
      unreadNotificationCount={unreadCount}
    />
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-page">
      <div className="hidden h-full shrink-0 md:block">{sidebar}</div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="z-20 flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-ink transition hover:bg-page"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={22} strokeWidth={2} aria-hidden="true" />
          </button>
          <p className="text-lg font-bold tracking-tight text-brand">Unsend</p>
        </div>
        {children}
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Close navigation"
            onClick={closeMobileNav}
          />
          <div className="relative flex h-full w-[min(280px,86vw)] flex-col bg-surface shadow-[var(--shadow-card)]">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition hover:bg-page hover:text-ink"
                aria-label="Close navigation"
                onClick={closeMobileNav}
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AppShell
