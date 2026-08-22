import {
  Activity,
  Bell,
  BookOpen,
  Clock3,
  Home,
  Lock,
  LockOpen,
  Settings,
  Share2,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import { useAuth } from '../../features/auth/useAuth.js'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, available: true },
  { to: '/journals', label: 'My Journals', icon: BookOpen, available: true },
  { to: '/shared', label: 'Shared With Me', icon: Share2, available: true },
  { to: '/time-capsules', label: 'Time Capsules', icon: Clock3, available: true },
  { to: '/friends', label: 'Friends', icon: Users, available: true },
  { to: '/notifications', label: 'Notifications', icon: Bell, available: true },
  { to: '/settings', label: 'Settings', icon: Settings, available: true },
]

function getInitials(name) {
  if (!name) {
    return '?'
  }

  return String(name).trim().slice(0, 1).toUpperCase()
}

function navClassName(isActive) {
  return `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
    isActive
      ? 'bg-brand-soft text-brand'
      : 'text-muted hover:bg-page hover:text-ink'
  }`
}

function AppSidebar({
  username,
  isUnlocked,
  onCreateJournal,
  onVaultStatusClick,
  onNavigate,
  unreadNotificationCount = 0,
}) {
  const { user } = useAuth()
  const showAdminNav = Boolean(user?.isAdmin)
  const VaultIcon = isUnlocked ? LockOpen : Lock
  const badgeLabel =
    unreadNotificationCount > 99 ? '99+' : String(unreadNotificationCount)

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-surface px-4 py-5 md:w-[240px]">
      <div className="px-2">
        <p className="text-[1.65rem] font-bold leading-none tracking-tight text-brand">
          Unsend
        </p>
        <p className="mt-1.5 text-[10px] font-medium tracking-[0.2em] text-muted uppercase">
          Digital Sanctuary
        </p>
      </div>

      <Button
        type="button"
        className="mt-6"
        onClick={onCreateJournal}
        aria-label="Create Journal"
      >
        + Create Journal
      </Button>

      <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon, available }) =>
          available ? (
            <NavLink
              key={label}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) => navClassName(isActive)}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {to === '/notifications' && unreadNotificationCount > 0 ? (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {badgeLabel}
                </span>
              ) : null}
            </NavLink>
          ) : (
            <button
              key={label}
              type="button"
              className={`${navClassName(false)} cursor-default opacity-70`}
              title="Coming soon"
              disabled
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </button>
          ),
        )}
        {showAdminNav ? (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) => navClassName(isActive)}
          >
            <Activity size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1">Admin Dashboard</span>
          </NavLink>
        ) : null}
      </nav>

      <div className="mt-4 flex items-center gap-3 border-t border-border px-1 pt-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
          aria-hidden="true"
        >
          {getInitials(username)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{username}</p>
          <button
            type="button"
            onClick={onVaultStatusClick}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand transition hover:text-brand-hover"
          >
            <VaultIcon size={12} strokeWidth={2.25} aria-hidden="true" />
            {isUnlocked ? 'Vault Unlocked' : 'Vault Locked'}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default AppSidebar
