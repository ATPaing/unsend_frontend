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

  return (
    <div className="flex h-dvh overflow-hidden bg-page">
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar
          username={username}
          isUnlocked={isUnlocked}
          onCreateJournal={onCreateJournal}
          onVaultStatusClick={onVaultStatusClick}
          unreadNotificationCount={unreadCount}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

export default AppShell
