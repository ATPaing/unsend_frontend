import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <p className="text-sm text-muted" role="status" aria-live="polite">
        Checking session…
      </p>
    </div>
  )
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
