import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Bell, CheckCircle2, LoaderCircle, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

let toastIdCounter = 0

function nextToastId() {
  toastIdCounter += 1
  return `toast-${toastIdCounter}`
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const dismissToast = useCallback(
    (id) => {
      clearTimer(id)
      setToasts((current) => current.filter((toast) => toast.id !== id))
    },
    [clearTimer],
  )

  const scheduleDismiss = useCallback(
    (id, duration) => {
      clearTimer(id)
      if (!duration) {
        return
      }

      const timer = window.setTimeout(() => {
        dismissToast(id)
      }, duration)

      timersRef.current.set(id, timer)
    },
    [clearTimer, dismissToast],
  )

  const showToast = useCallback(
    ({
      message,
      status = 'info',
      persistent = false,
      duration = 3500,
    } = {}) => {
      const id = nextToastId()

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          status,
          persistent,
        },
      ])

      if (!persistent) {
        scheduleDismiss(id, duration)
      }

      return id
    },
    [scheduleDismiss],
  )

  const updateToast = useCallback(
    (id, { message, status, persistent = false, duration = 3500 } = {}) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                message: message ?? toast.message,
                status: status ?? toast.status,
                persistent,
              }
            : toast,
        ),
      )

      if (persistent) {
        clearTimer(id)
      } else {
        scheduleDismiss(id, duration)
      }
    },
    [clearTimer, scheduleDismiss],
  )

  const value = useMemo(
    () => ({
      showToast,
      updateToast,
      dismissToast,
    }),
    [showToast, updateToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const isLoading = toast.status === 'loading'
  const isSuccess = toast.status === 'success'
  const isError = toast.status === 'error'
  const isInfo = toast.status === 'info'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-[var(--shadow-card)] ${
        isError
          ? 'border-red-200'
          : isSuccess
            ? 'border-emerald-200'
            : 'border-border'
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {isLoading ? (
          <LoaderCircle
            size={18}
            strokeWidth={2}
            className="animate-spin text-brand"
            aria-hidden="true"
          />
        ) : null}
        {isSuccess ? (
          <CheckCircle2
            size={18}
            strokeWidth={2}
            className="text-emerald-600"
            aria-hidden="true"
          />
        ) : null}
        {isError ? (
          <XCircle
            size={18}
            strokeWidth={2}
            className="text-danger"
            aria-hidden="true"
          />
        ) : null}
        {isInfo ? (
          <Bell
            size={18}
            strokeWidth={2}
            className="text-brand"
            aria-hidden="true"
          />
        ) : null}
      </span>

      <p className="flex-1 text-sm font-medium text-ink">{toast.message}</p>

      {!isLoading ? (
        <button
          type="button"
          className="cursor-pointer rounded-md p-0.5 text-muted transition hover:text-ink"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          <span className="text-lg leading-none">×</span>
        </button>
      ) : null}
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
