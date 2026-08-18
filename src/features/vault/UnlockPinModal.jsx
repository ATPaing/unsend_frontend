import { useEffect, useId, useRef, useState } from 'react'
import { KeyRound } from 'lucide-react'
import AlertNote from '../../components/ui/AlertNote.jsx'
import Button from '../../components/ui/Button.jsx'
import FormError from '../../components/ui/FormError.jsx'
import FormInput from '../../components/ui/FormInput.jsx'
import { validateUnlock } from '../../utils/formValidation.js'
import { useVault } from '../vault/useVault.js'

function UnlockPinModal({ open, onClose }) {
  const titleId = useId()
  const { unlock } = useVault()
  const [pin, setPin] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  isSubmittingRef.current = isSubmitting

  useEffect(() => {
    if (!open) {
      return
    }

    setPin('')
    setErrors({})
    setFormError('')
    setIsSubmitting(false)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmittingRef.current) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  function handlePinChange(event) {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(digitsOnly)
    setErrors((current) => ({ ...current, pin: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = validateUnlock({ pin })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await unlock(pin)
      setPin('')
      onClose()
    } catch {
      setFormError('Incorrect PIN. Unable to unlock.')
      setPin('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="text-center">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            Unlock vault
          </h2>
          <p className="mt-1 text-sm text-muted">
            Enter your PIN to decrypt your private key in memory.
          </p>
        </header>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <FormError message={formError} />

          <FormInput
            id="unlock-pin"
            name="pin"
            label="Security PIN"
            icon={KeyRound}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="6-digit PIN"
            maxLength={6}
            value={pin}
            onChange={handlePinChange}
            error={errors.pin}
            disabled={isSubmitting}
          />

          <AlertNote title="Privacy:" compact>
            Your PIN never leaves this device.
          </AlertNote>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" disabled={isSubmitting} className="sm:w-auto">
              {isSubmitting ? 'Unlocking…' : 'Unlock'}
            </Button>
            <button
              type="button"
              className="rounded-xl px-4 py-3 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-60 sm:w-auto"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UnlockPinModal
