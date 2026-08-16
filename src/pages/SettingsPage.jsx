import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Lock } from 'lucide-react'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import FormError from '../components/ui/FormError.jsx'
import FormInput from '../components/ui/FormInput.jsx'
import ToggleSwitch from '../components/ui/ToggleSwitch.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import { encryptDraftForCreate } from '../features/journals/encryptDraftForCreate.js'
import * as journalService from '../features/journals/journalService.js'
import {
  AUTO_LOCK_OPTIONS,
  THEME_OPTIONS,
} from '../features/preferences/preferencesStorage.js'
import { usePreferences } from '../features/preferences/usePreferences.js'
import * as settingsService from '../features/settings/settingsService.js'
import { useToast } from '../features/toast/ToastContext.jsx'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'
import { ApiError } from '../services/api.js'
import { rewrapPrivateKeyForNewPin } from '../utils/crypto/rewrapPrivateKeyForNewPin.js'
import {
  validateChangePassword,
  validateChangePin,
} from '../utils/formValidation.js'

function SettingsSection({ title, description, children, danger = false }) {
  return (
    <section
      className={`rounded-2xl border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${
        danger ? 'border-red-200/80' : 'border-border'
      }`}
    >
      <header className="mb-4">
        <h2
          className={`text-base font-semibold tracking-tight ${
            danger ? 'text-danger' : 'text-ink'
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

function SettingsRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-start sm:justify-end">
        {children}
      </div>
    </div>
  )
}

function SettingsModal({ open, title, onClose, children }) {
  const titleId = useId()

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    isUnlocked,
    lock,
    ensureCryptoMaterial,
    activateWithPrivateKey,
  } = useVault()
  const {
    preferences,
    setTheme,
    setAutoLockMinutes,
    setNotificationPref,
    clearPreferences,
  } = usePreferences()
  const { showToast } = useToast()

  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [passwordError, setPasswordError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [pinOpen, setPinOpen] = useState(false)
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  })
  const [pinErrors, setPinErrors] = useState({})
  const [pinError, setPinError] = useState('')
  const [isChangingPin, setIsChangingPin] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const autoLockLabel = useMemo(() => {
    const match = AUTO_LOCK_OPTIONS.find(
      (option) => option.value === preferences.autoLockMinutes,
    )
    return match?.label ?? '15 minutes'
  }, [preferences.autoLockMinutes])

  function openUnlockModal() {
    setIsUnlockOpen(true)
  }

  function handleVaultStatusClick() {
    if (isUnlocked) {
      lock()
      showToast({ message: 'Vault locked.', status: 'info', duration: 2500 })
      return
    }
    openUnlockModal()
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleSaveJournal(draft) {
    const material = await ensureCryptoMaterial()
    const payload = await encryptDraftForCreate(draft, material.publicKey)
    const created = await journalService.createJournal(payload)
    navigate(`/journals/${created.id}`)
  }

  function resetPasswordForm() {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordErrors({})
    setPasswordError('')
  }

  function resetPinForm() {
    setPinForm({
      currentPin: '',
      newPin: '',
      confirmPin: '',
    })
    setPinErrors({})
    setPinError('')
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    if (isChangingPassword) {
      return
    }

    const nextErrors = validateChangePassword(passwordForm)
    setPasswordErrors(nextErrors)
    setPasswordError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsChangingPassword(true)
    try {
      await settingsService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      )
      resetPasswordForm()
      setPasswordOpen(false)
      showToast({
        message: 'Password changed successfully.',
        status: 'success',
      })
    } catch (error) {
      setPasswordError(
        error instanceof ApiError
          ? error.message
          : 'Unable to change password.',
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleChangePin(event) {
    event.preventDefault()
    if (isChangingPin) {
      return
    }

    const nextErrors = validateChangePin(pinForm)
    setPinErrors(nextErrors)
    setPinError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsChangingPin(true)
    try {
      const material = await ensureCryptoMaterial()
      const { privateKey, cryptoPayload, nextMaterial } =
        await rewrapPrivateKeyForNewPin({
          currentPin: pinForm.currentPin,
          newPin: pinForm.newPin,
          material,
        })

      const saved = await settingsService.updateCryptoMaterial(cryptoPayload)
      activateWithPrivateKey(privateKey, {
        ...nextMaterial,
        publicKey: saved.publicKey ?? nextMaterial.publicKey,
      })

      resetPinForm()
      setPinOpen(false)
      showToast({
        message: 'PIN changed successfully.',
        status: 'success',
      })
    } catch (error) {
      if (error?.code === 'INVALID_PIN') {
        setPinError('Current PIN is incorrect.')
      } else {
        setPinError(
          error instanceof ApiError
            ? error.message
            : 'Unable to update PIN.',
        )
      }
    } finally {
      setIsChangingPin(false)
    }
  }

  function handleLockVaultNow() {
    if (!isUnlocked) {
      showToast({
        message: 'Vault is already locked.',
        status: 'info',
        duration: 2500,
      })
      return
    }

    lock()
    showToast({ message: 'Vault locked.', status: 'info', duration: 2500 })
  }

  async function handleDeleteAccount(event) {
    event.preventDefault()
    if (isDeleting) {
      return
    }

    setDeleteError('')

    if (deleteConfirmText.trim() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.')
      return
    }

    if (!deletePassword) {
      setDeleteError('Password is required.')
      return
    }

    setIsDeleting(true)
    try {
      await settingsService.deleteAccount(deletePassword)
      clearPreferences()
      lock()
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setDeleteError(
        error instanceof ApiError
          ? error.message
          : 'Unable to delete account.',
      )
    } finally {
      setIsDeleting(false)
    }
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
        onUnlockClick={openUnlockModal}
        onLockClick={() => {
          lock()
          showToast({ message: 'Vault locked.', status: 'info', duration: 2500 })
        }}
        onLogoutClick={handleLogout}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-8 pb-10">
        <div className="mx-auto w-full max-w-3xl">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Settings
            </h1>
            <p className="mt-1 text-sm text-muted">
              Manage your account, privacy, and app preferences.
            </p>
          </header>

          <div className="mt-8 space-y-5">
            <SettingsSection
              title="Account"
              description="Signed-in identity and login credentials."
            >
              <SettingsRow label="Username">
                <p className="text-sm font-medium text-ink">
                  {user?.username ?? '—'}
                </p>
              </SettingsRow>
              <SettingsRow
                label="Change password"
                description="Updates your login password. Encryption PIN is unchanged."
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-auto"
                  onClick={() => {
                    resetPasswordForm()
                    setPasswordOpen(true)
                  }}
                >
                  Change
                  <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                </Button>
              </SettingsRow>
              <SettingsRow label="Log out" description="End this session.">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-auto"
                  onClick={handleLogout}
                >
                  Log out
                </Button>
              </SettingsRow>
            </SettingsSection>

            <SettingsSection
              title="Vault & Security"
              description="PIN protects your private key. Journals stay end-to-end encrypted."
            >
              <SettingsRow
                label="Change PIN"
                description="Re-encrypts the same private key. Shared journals keep working."
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-auto"
                  onClick={() => {
                    resetPinForm()
                    setPinOpen(true)
                  }}
                >
                  Change
                  <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                </Button>
              </SettingsRow>
              <SettingsRow
                label="Lock vault now"
                description="Clears the private key from memory. You stay signed in."
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-auto"
                  onClick={handleLockVaultNow}
                  disabled={!isUnlocked}
                >
                  <Lock size={14} strokeWidth={2} aria-hidden="true" />
                  Lock vault
                </Button>
              </SettingsRow>
              <SettingsRow
                label="Auto-lock after"
                description="Locks the vault after inactivity. Stored only on this device."
              >
                <select
                  className="rounded-xl border border-border bg-page px-3 py-2 text-sm text-ink"
                  value={
                    preferences.autoLockMinutes == null
                      ? 'never'
                      : String(preferences.autoLockMinutes)
                  }
                  onChange={(event) => {
                    const raw = event.target.value
                    setAutoLockMinutes(raw === 'never' ? null : Number(raw))
                  }}
                  aria-label="Auto-lock after"
                >
                  {AUTO_LOCK_OPTIONS.map((option) => (
                    <option
                      key={String(option.value)}
                      value={
                        option.value == null ? 'never' : String(option.value)
                      }
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </SettingsRow>
              <p className="pt-1 text-xs text-muted">
                Current: {autoLockLabel}
                {isUnlocked ? ' · Vault unlocked' : ' · Vault locked'}
              </p>
            </SettingsSection>

            <SettingsSection
              title="Notifications"
              description="Controls optional toasts only. Lists and unread counts still update."
            >
              <SettingsRow label="Friend requests">
                <ToggleSwitch
                  checked={preferences.notifications.friendRequests}
                  onChange={(checked) =>
                    setNotificationPref('friendRequests', checked)
                  }
                  label="Friend request toasts"
                />
              </SettingsRow>
              <SettingsRow label="Friend accepted">
                <ToggleSwitch
                  checked={preferences.notifications.friendAccepted}
                  onChange={(checked) =>
                    setNotificationPref('friendAccepted', checked)
                  }
                  label="Friend accepted toasts"
                />
              </SettingsRow>
              <SettingsRow label="Journal shared">
                <ToggleSwitch
                  checked={preferences.notifications.journalShared}
                  onChange={(checked) =>
                    setNotificationPref('journalShared', checked)
                  }
                  label="Journal shared toasts"
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Appearance" description="Display preference for this device.">
              <SettingsRow label="Theme">
                <select
                  className="rounded-xl border border-border bg-page px-3 py-2 text-sm text-ink"
                  value={preferences.theme}
                  onChange={(event) => setTheme(event.target.value)}
                  aria-label="Theme"
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SettingsRow>
            </SettingsSection>

            <SettingsSection
              title="Danger Zone"
              description="Permanent account removal."
              danger
            >
              <SettingsRow
                label="Delete account"
                description="Deletes your account and data stored by Unsend. This cannot be undone."
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-auto border-danger/40 text-danger hover:border-danger hover:bg-danger/15"
                  onClick={() => {
                    setDeleteConfirmText('')
                    setDeletePassword('')
                    setDeleteError('')
                    setDeleteOpen(true)
                  }}
                >
                  Delete account
                </Button>
              </SettingsRow>
            </SettingsSection>
          </div>
        </div>
      </div>

      <UnlockPinModal open={isUnlockOpen} onClose={() => setIsUnlockOpen(false)} />
      <CreateJournalModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveJournal}
      />

      <SettingsModal
        open={passwordOpen}
        title="Change password"
        onClose={() => {
          if (!isChangingPassword) {
            setPasswordOpen(false)
            resetPasswordForm()
          }
        }}
      >
        <form className="space-y-3" onSubmit={handleChangePassword}>
          <FormInput
            id="settings-current-password"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            error={passwordErrors.currentPassword}
          />
          <FormInput
            id="settings-new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
            error={passwordErrors.newPassword}
          />
          <FormInput
            id="settings-confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            error={passwordErrors.confirmPassword}
          />
          {passwordError ? <FormError message={passwordError} /> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              disabled={isChangingPassword}
              onClick={() => {
                setPasswordOpen(false)
                resetPasswordForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-auto"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Changing password…' : 'Save password'}
            </Button>
          </div>
        </form>
      </SettingsModal>

      <SettingsModal
        open={pinOpen}
        title="Change PIN"
        onClose={() => {
          if (!isChangingPin) {
            setPinOpen(false)
            resetPinForm()
          }
        }}
      >
        <p className="mb-3 text-sm text-muted">
          Your public key stays the same. Existing journals and shares keep
          working.
        </p>
        <form className="space-y-3" onSubmit={handleChangePin}>
          <FormInput
            id="settings-current-pin"
            label="Current PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinForm.currentPin}
            onChange={(event) =>
              setPinForm((current) => ({
                ...current,
                currentPin: event.target.value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            error={pinErrors.currentPin}
          />
          <FormInput
            id="settings-new-pin"
            label="New PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinForm.newPin}
            onChange={(event) =>
              setPinForm((current) => ({
                ...current,
                newPin: event.target.value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            error={pinErrors.newPin}
          />
          <FormInput
            id="settings-confirm-pin"
            label="Confirm new PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinForm.confirmPin}
            onChange={(event) =>
              setPinForm((current) => ({
                ...current,
                confirmPin: event.target.value.replace(/\D/g, '').slice(0, 6),
              }))
            }
            error={pinErrors.confirmPin}
          />
          {pinError ? <FormError message={pinError} /> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              disabled={isChangingPin}
              onClick={() => {
                setPinOpen(false)
                resetPinForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-auto"
              disabled={isChangingPin}
            >
              {isChangingPin ? 'Changing PIN…' : 'Save PIN'}
            </Button>
          </div>
        </form>
      </SettingsModal>

      <SettingsModal
        open={deleteOpen}
        title="Delete your account?"
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false)
          }
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          This permanently deletes your account and data stored by Unsend. This
          action cannot be undone.
        </p>
        <form className="mt-4 space-y-3" onSubmit={handleDeleteAccount}>
          <FormInput
            id="settings-delete-confirm"
            label='Type DELETE to confirm'
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            autoComplete="off"
          />
          <FormInput
            id="settings-delete-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
          />
          {deleteError ? <FormError message={deleteError} /> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-auto border-transparent bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting || deleteConfirmText.trim() !== 'DELETE'}
            >
              {isDeleting ? 'Deleting account…' : 'Delete account'}
            </Button>
          </div>
        </form>
      </SettingsModal>
    </AppShell>
  )
}

export default SettingsPage
