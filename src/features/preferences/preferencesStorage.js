const STORAGE_KEY = 'unsend.preferences'

export const AUTO_LOCK_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: null, label: 'Never while app is open' },
]

export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export const DEFAULT_PREFERENCES = {
  theme: 'system',
  autoLockMinutes: 15,
  notifications: {
    friendRequests: true,
    friendAccepted: true,
    journalShared: true,
  },
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAutoLockMinutes(value) {
  if (value === null) {
    return null
  }

  const allowed = [5, 15, 30, 60]
  const numeric = Number(value)
  return allowed.includes(numeric) ? numeric : DEFAULT_PREFERENCES.autoLockMinutes
}

function normalizeTheme(value) {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  return DEFAULT_PREFERENCES.theme
}

export function normalizePreferences(raw) {
  const source = isPlainObject(raw) ? raw : {}
  const notifications = isPlainObject(source.notifications)
    ? source.notifications
    : {}

  return {
    theme: normalizeTheme(source.theme),
    autoLockMinutes: normalizeAutoLockMinutes(source.autoLockMinutes),
    notifications: {
      friendRequests:
        typeof notifications.friendRequests === 'boolean'
          ? notifications.friendRequests
          : DEFAULT_PREFERENCES.notifications.friendRequests,
      friendAccepted:
        typeof notifications.friendAccepted === 'boolean'
          ? notifications.friendAccepted
          : DEFAULT_PREFERENCES.notifications.friendAccepted,
      journalShared:
        typeof notifications.journalShared === 'boolean'
          ? notifications.journalShared
          : DEFAULT_PREFERENCES.notifications.journalShared,
    },
  }
}

export function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_PREFERENCES, notifications: { ...DEFAULT_PREFERENCES.notifications } }
    }

    return normalizePreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PREFERENCES, notifications: { ...DEFAULT_PREFERENCES.notifications } }
  }
}

export function savePreferences(preferences) {
  const normalized = normalizePreferences(preferences)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function clearPreferences() {
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Resolve light/dark from theme preference + OS.
 */
export function resolveColorScheme(theme, mediaDark = null) {
  if (theme === 'light' || theme === 'dark') {
    return theme
  }

  const prefersDark =
    mediaDark ??
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return prefersDark ? 'dark' : 'light'
}

export function applyColorScheme(scheme) {
  const root = document.documentElement
  if (scheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
