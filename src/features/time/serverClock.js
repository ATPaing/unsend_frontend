/**
 * Align capsule countdowns with the backend clock used for isUnlocked.
 * Offset is refreshed from API `data.serverNow` (and optional /health sync).
 */

let offsetMs = 0
let hasSynced = false
let syncPromise = null

/**
 * @param {string} serverNowIso
 * @param {number} clientSentAt
 * @param {number} [clientReceivedAt]
 */
export function noteServerTime(
  serverNowIso,
  clientSentAt,
  clientReceivedAt = Date.now(),
) {
  if (typeof serverNowIso !== 'string' || !serverNowIso) {
    return
  }

  const serverMs = new Date(serverNowIso).getTime()
  if (Number.isNaN(serverMs)) {
    return
  }

  const sent = Number(clientSentAt)
  const received = Number(clientReceivedAt)
  if (!Number.isFinite(sent) || !Number.isFinite(received) || received < sent) {
    return
  }

  // Midpoint cancels one-way latency; ignore pathological RTTs.
  const rtt = received - sent
  if (rtt > 15_000) {
    return
  }

  const clientMid = sent + rtt / 2
  offsetMs = serverMs - clientMid
  hasSynced = true
}

export function getServerNowMs() {
  return Date.now() + offsetMs
}

export function getServerNow() {
  return new Date(getServerNowMs())
}

export function isServerClockSynced() {
  return hasSynced
}

/**
 * Cheap one-shot (or in-flight) sync against GET /health.
 * Safe to call often — concurrent callers share one request.
 */
export async function syncServerClock() {
  if (syncPromise) {
    return syncPromise
  }

  syncPromise = (async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL
    if (!apiBase) {
      return false
    }

    const origin = String(apiBase).replace(/\/api\/?$/, '')
    const clientSentAt = Date.now()

    try {
      const response = await fetch(`${origin}/health`, {
        method: 'GET',
        credentials: 'include',
      })
      const clientReceivedAt = Date.now()
      const payload = await response.json().catch(() => null)
      const serverNow = payload?.data?.serverNow

      if (typeof serverNow === 'string') {
        noteServerTime(serverNow, clientSentAt, clientReceivedAt)
        return true
      }
    } catch {
      // Keep previous offset if any.
    }

    return hasSynced
  })().finally(() => {
    syncPromise = null
  })

  return syncPromise
}
