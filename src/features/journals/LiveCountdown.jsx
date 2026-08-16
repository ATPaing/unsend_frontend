import { useEffect, useRef, useState } from 'react'
import { formatCountdown } from './capsuleTime.js'
import {
  getServerNow,
  isServerClockSynced,
  syncServerClock,
} from '../time/serverClock.js'

/**
 * Countdown driven by the server clock (same timeline as isUnlocked).
 * Changing the device clock does not make this hit zero early.
 * onExpired → parent should re-fetch; server remains authoritative for keys.
 */
function LiveCountdown({ unlockAt, className = '', onExpired }) {
  const [now, setNow] = useState(() => getServerNow())
  const [synced, setSynced] = useState(() => isServerClockSynced())
  const expiredNotifiedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    syncServerClock().then(() => {
      if (!cancelled) {
        setSynced(isServerClockSynced())
        setNow(getServerNow())
      }
    })

    return () => {
      cancelled = true
    }
  }, [unlockAt])

  useEffect(() => {
    expiredNotifiedRef.current = false
  }, [unlockAt])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSynced(isServerClockSynced())
      setNow(getServerNow())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [unlockAt])

  useEffect(() => {
    if (!synced || !unlockAt || !onExpired || expiredNotifiedRef.current) {
      return
    }

    const target = new Date(unlockAt).getTime()
    if (Number.isNaN(target)) {
      return
    }

    if (now.getTime() >= target) {
      expiredNotifiedRef.current = true
      onExpired()
    }
  }, [synced, now, unlockAt, onExpired])

  // While past server unlock but still locked in UI, retry refresh occasionally.
  useEffect(() => {
    if (!synced || !unlockAt || !onExpired) {
      return undefined
    }

    const target = new Date(unlockAt).getTime()
    if (Number.isNaN(target) || now.getTime() < target) {
      return undefined
    }

    const timer = window.setInterval(() => {
      onExpired()
    }, 5_000)

    return () => window.clearInterval(timer)
  }, [synced, now, unlockAt, onExpired])

  if (!synced) {
    return (
      <span className={`text-muted ${className}`}>Syncing time…</span>
    )
  }

  const label = formatCountdown(unlockAt, now)

  if (!label) {
    return null
  }

  return (
    <time
      dateTime={unlockAt ? new Date(unlockAt).toISOString() : undefined}
      className={`font-mono tabular-nums tracking-wide ${className}`}
    >
      {label}
    </time>
  )
}

export default LiveCountdown
