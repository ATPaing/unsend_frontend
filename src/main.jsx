import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './features/auth/AuthContext.jsx'
import { FriendsProvider } from './features/friends/FriendsContext.jsx'
import { SharedJournalsProvider } from './features/journals/SharedJournalsContext.jsx'
import { NotificationsProvider } from './features/notifications/NotificationsContext.jsx'
import { PreferencesProvider } from './features/preferences/PreferencesContext.jsx'
import { RealtimeProvider } from './features/realtime/RealtimeContext.jsx'
import { ToastProvider } from './features/toast/ToastContext.jsx'
import { VaultProvider } from './features/vault/VaultContext.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <PreferencesProvider>
            <RealtimeProvider>
              <FriendsProvider>
                <SharedJournalsProvider>
                  <NotificationsProvider>
                    <VaultProvider>
                      <App />
                    </VaultProvider>
                  </NotificationsProvider>
                </SharedJournalsProvider>
              </FriendsProvider>
            </RealtimeProvider>
          </PreferencesProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
