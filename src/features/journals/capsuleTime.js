/**
 * Format unlockAt for display in the user's local timezone.
 */
export function formatUnlockDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Build ISO timestamp from local date (YYYY-MM-DD) + time (HH:MM).
 * Uses the browser's local timezone — do not treat as UTC.
 */
export function localDateTimeToIso(dateStr, timeStr) {
  const datePart = String(dateStr || '').trim()
  const timePart = String(timeStr || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return null
  }

  if (!/^\d{2}:\d{2}$/.test(timePart)) {
    return null
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0)

  if (Number.isNaN(local.getTime())) {
    return null
  }

  return local.toISOString()
}

export function isCapsuleLockedClient(journal) {
  return (
    journal?.journalType === 'T_CAPSULE' && journal?.isUnlocked === false
  )
}

function pad2(value) {
  return String(Math.max(0, value)).padStart(2, '0')
}

/**
 * Countdown as dd:hh:mm:ss (display only; server is authoritative).
 */
export function formatCountdown(unlockAt, now = new Date()) {
  const target = unlockAt instanceof Date ? unlockAt : new Date(unlockAt)

  if (Number.isNaN(target.getTime())) {
    return ''
  }

  let ms = target.getTime() - now.getTime()

  if (ms <= 0) {
    return 'Unlocking…'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/**
 * Default local date/time strings a few minutes ahead (dev-friendly).
 */
export function defaultFutureLocalParts(minutesAhead = 10) {
  const d = new Date(Date.now() + minutesAhead * 60_000)
  const pad = (n) => String(n).padStart(2, '0')

  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}
