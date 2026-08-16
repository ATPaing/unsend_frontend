import { CircleAlert } from 'lucide-react'

function FormError({ message, compact = false }) {
  if (!message) {
    return null
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-danger ${
        compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm'
      }`}
      role="alert"
      aria-live="polite"
    >
      <CircleAlert
        size={compact ? 15 : 18}
        strokeWidth={2}
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      />
      <p>{message}</p>
    </div>
  )
}

export default FormError
