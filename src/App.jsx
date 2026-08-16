import { Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './features/auth/ProtectedRoute.jsx'
import FriendsPage from './pages/FriendsPage.jsx'
import HomePage from './pages/HomePage.jsx'
import JournalDetailPage from './pages/JournalDetailPage.jsx'
import JournalsPage from './pages/JournalsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SharedWithMePage from './pages/SharedWithMePage.jsx'
import TimeCapsulesPage from './pages/TimeCapsulesPage.jsx'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journals"
        element={
          <ProtectedRoute>
            <JournalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journals/:journalId"
        element={
          <ProtectedRoute>
            <JournalDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shared"
        element={
          <ProtectedRoute>
            <SharedWithMePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/time-capsules"
        element={
          <ProtectedRoute>
            <TimeCapsulesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />
    </Routes>
  )
}

export default App
