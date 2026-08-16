import { Lock, LogOut } from 'lucide-react'
import Button from '../ui/Button.jsx'

function DashboardHeader({ isUnlocked, onUnlockClick, onLockClick, onLogoutClick }) {
  return (
    <header className="z-20 flex shrink-0 items-center justify-end gap-3 border-b border-border bg-surface px-8 py-3.5">
      {isUnlocked ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-auto"
          onClick={onLockClick}
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
          onClick={onUnlockClick}
        >
          <Lock size={14} strokeWidth={2} aria-hidden="true" />
          Unlock Vault
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-auto"
        onClick={onLogoutClick}
      >
        <LogOut size={14} strokeWidth={2} aria-hidden="true" />
        Logout
      </Button>
    </header>
  )
}

export default DashboardHeader
