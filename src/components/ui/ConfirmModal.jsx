import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import Button from './Button.jsx'

/**
 * Lightweight confirm dialog — replaces browser alert/confirm.
 */
function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmingLabel = 'Please wait…',
  confirmVariant = 'primary',
  isConfirming = false,
  onConfirm,
  onClose,
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isConfirming) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isConfirming, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6"
      role="presentation"
      onClick={() => {
        if (!isConfirming) {
          onClose()
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-page hover:text-ink disabled:opacity-60"
            aria-label="Close"
            onClick={onClose}
            disabled={isConfirming}
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {description ? (
          <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-auto"
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant === 'danger' ? 'primary' : confirmVariant}
            size="sm"
            className={`w-auto ${
              confirmVariant === 'danger'
                ? 'border-transparent bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40'
                : ''
            }`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
