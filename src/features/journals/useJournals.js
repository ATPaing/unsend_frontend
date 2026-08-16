import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../services/api.js'
import { decryptOwnerJournal } from '../../utils/crypto/decryptJournal.js'
import { useRealtimeEvent } from '../realtime/RealtimeContext.jsx'
import { getServerNowMs, syncServerClock } from '../time/serverClock.js'
import { useVault } from '../vault/useVault.js'
import * as journalService from './journalService.js'
import { toCardJournal } from './mapJournalCard.js'

function applyUnlockAtPatch(journal, payload) {
  return {
    ...journal,
    unlockAt: payload.unlockAt,
    isUnlocked:
      payload.isUnlocked === undefined
        ? journal.isUnlocked
        : payload.isUnlocked,
  }
}

export function useJournals() {
  const {
    isUnlocked,
    privateKey,
    setDecryptedValue,
    clearDecryptedValue,
    decryptedCache,
  } = useVault()
  const [apiJournals, setApiJournals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshJournals = useCallback(async () => {
    const journals = await journalService.listJournals()
    setApiJournals(journals)
    return journals
  }, [])

  const refreshJournalById = useCallback(
    async (journalId) => {
      try {
        const fresh = await journalService.getJournal(journalId)
        setApiJournals((current) => {
          const exists = current.some(
            (item) => Number(item.id) === Number(journalId),
          )
          if (!exists) {
            return current
          }

          return current.map((item) =>
            Number(item.id) === Number(journalId) ? fresh : item,
          )
        })

        if (fresh.isUnlocked === false) {
          clearDecryptedValue(fresh.id)
        }

        return fresh
      } catch (refreshError) {
        console.error('Failed to refresh journal', journalId, refreshError)
        return null
      }
    },
    [clearDecryptedValue],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const journals = await journalService.listJournals()
        if (!cancelled) {
          setApiJournals(journals)
        }
      } catch (loadError) {
        if (!cancelled) {
          setApiJournals([])
          if (!(loadError instanceof ApiError && loadError.status === 401)) {
            setError('Unable to load journals.')
            console.error('Failed to load journals', loadError)
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    syncServerClock().catch(() => {})
  }, [])

  // Keep capsule lock state in sync when unlockAt arrives (list can go stale after extend).
  useEffect(() => {
    const timers = []

    for (const journal of apiJournals) {
      if (
        journal.journalType !== 'T_CAPSULE' ||
        journal.isUnlocked !== false ||
        !journal.unlockAt
      ) {
        continue
      }

      const unlockAtMs = new Date(journal.unlockAt).getTime()
      if (Number.isNaN(unlockAtMs)) {
        continue
      }

      const delay = Math.max(unlockAtMs - getServerNowMs() + 750, 0)
      // Avoid huge setTimeout values; far-future capsules will reschedule after refresh.
      if (delay > 6 * 60 * 60 * 1000) {
        continue
      }

      const timer = window.setTimeout(() => {
        refreshJournalById(journal.id)
      }, delay)

      timers.push(timer)
    }

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [apiJournals, refreshJournalById])

  useRealtimeEvent('journal.unlock-at.updated', (payload) => {
    const journalId = payload?.journalId
    if (journalId == null || payload?.unlockAt == null) {
      return
    }

    setApiJournals((current) =>
      current.map((item) =>
        Number(item.id) === Number(journalId)
          ? applyUnlockAtPatch(item, payload)
          : item,
      ),
    )

    if (payload.isUnlocked === false) {
      clearDecryptedValue(journalId)
    }
  })

  useEffect(() => {
    if (!isUnlocked || !privateKey) {
      return
    }

    let cancelled = false

    async function decryptAll() {
      for (const journal of apiJournals) {
        if (cancelled) {
          break
        }

        if (journal.journalType === 'T_CAPSULE' && journal.isUnlocked === false) {
          continue
        }

        if (!journal.ownerEncryptedAesKey) {
          continue
        }

        try {
          const decrypted = await decryptOwnerJournal(journal, privateKey)
          if (!cancelled) {
            setDecryptedValue(journal.id, decrypted)
          }
        } catch (decryptError) {
          console.error('Failed to decrypt journal', journal.id, decryptError)
        }
      }
    }

    decryptAll()

    return () => {
      cancelled = true
    }
  }, [apiJournals, isUnlocked, privateKey, setDecryptedValue])

  const cardJournals = apiJournals.map((journal) =>
    toCardJournal(
      journal,
      isUnlocked ? decryptedCache.get(journal.id) ?? null : null,
    ),
  )

  const prependJournal = useCallback(
    async (journal) => {
      setApiJournals((current) => [
        journal,
        ...current.filter((item) => item.id !== journal.id),
      ])

      if (isUnlocked && privateKey) {
        if (
          journal.journalType === 'T_CAPSULE' &&
          journal.isUnlocked === false
        ) {
          clearDecryptedValue(journal.id)
          return
        }

        if (!journal.ownerEncryptedAesKey) {
          return
        }

        try {
          const decrypted = await decryptOwnerJournal(journal, privateKey)
          setDecryptedValue(journal.id, decrypted)
        } catch (decryptError) {
          console.error('Failed to decrypt new journal', decryptError)
          clearDecryptedValue(journal.id)
        }
      }
    },
    [isUnlocked, privateKey, setDecryptedValue, clearDecryptedValue],
  )

  const patchJournal = useCallback((journalId, patch) => {
    setApiJournals((current) =>
      current.map((item) =>
        Number(item.id) === Number(journalId) ? { ...item, ...patch } : item,
      ),
    )
  }, [])

  return {
    journals: cardJournals,
    apiJournals,
    isLoading,
    error,
    refreshJournals,
    refreshJournalById,
    prependJournal,
    patchJournal,
  }
}
