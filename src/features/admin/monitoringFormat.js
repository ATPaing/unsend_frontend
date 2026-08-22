/**
 * Format uptime seconds as human-readable duration.
 */
export function formatUptime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—'
  }

  const seconds = Math.floor(totalSeconds)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
  parts.push(`${secs}s`)

  return parts.join(' ')
}

/**
 * Map service/status tokens to a visual tone + label.
 */
export function classifyStatus(status, { listening } = {}) {
  if (listening === true) {
    return { tone: 'ok', label: 'Listening' }
  }
  if (listening === false) {
    return { tone: 'bad', label: 'Not listening' }
  }

  if (typeof status !== 'string' || status.length === 0) {
    return { tone: 'warn', label: 'Unknown' }
  }

  const normalized = status.toLowerCase()

  if (
    normalized === 'healthy' ||
    normalized === 'online' ||
    normalized === 'active'
  ) {
    return { tone: 'ok', label: status }
  }

  if (
    normalized === 'error' ||
    normalized === 'failed' ||
    normalized === 'errored' ||
    normalized === 'stopped' ||
    normalized === 'inactive'
  ) {
    return { tone: 'bad', label: status }
  }

  return { tone: 'warn', label: status }
}

export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return '—'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}
