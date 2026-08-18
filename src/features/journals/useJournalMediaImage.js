import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.js'
import { decryptJournalMediaPayload } from '../../utils/crypto/decryptMedia.js'
import { importJournalAesKey } from '../../utils/crypto/decryptJournal.js'
import * as mediaService from './mediaService.js'

/**
 * Load, decrypt, and expose one journal image for the detail view.
 */
export function useJournalMediaImage({ journal, privateKey, enabled }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!enabled || !journal?.id || !privateKey) {
      setImageUrl(null)
      setStatus('idle')
      setErrorMessage('')
      return undefined
    }

    let cancelled = false
    let objectUrl = null
    let aesKey = null

    async function loadMedia() {
      setStatus('loading')
      setErrorMessage('')
      setImageUrl(null)

      try {
        const { media, download } = await mediaService.getMediaDownloadUrl(
          journal.id,
        )

        if (cancelled) {
          return
        }

        aesKey = await importJournalAesKey(journal, privateKey)

        if (cancelled) {
          return
        }

        const ciphertext = await mediaService.fetchEncryptedMediaFromPresignedUrl(
          download.url,
        )

        if (cancelled) {
          return
        }

        const { blob } = await decryptJournalMediaPayload(media, ciphertext, aesKey)

        if (cancelled) {
          return
        }

        objectUrl = URL.createObjectURL(blob)
        setImageUrl(objectUrl)
        setStatus('loaded')
      } catch (loadError) {
        if (cancelled) {
          return
        }

        if (loadError instanceof ApiError && loadError.status === 404) {
          setStatus('none')
          setErrorMessage('')
          return
        }

        if (loadError instanceof ApiError && loadError.status === 403) {
          setStatus('forbidden')
          setErrorMessage('This image is not available until the capsule unlocks.')
          return
        }

        if (import.meta.env.DEV) {
          console.error('Failed to load journal media', loadError)
        }

        setStatus('error')
        setErrorMessage('Unable to load the encrypted image.')
      } finally {
        aesKey = null
      }
    }

    loadMedia()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [journal?.id, journal?.access, privateKey, enabled])

  return {
    imageUrl,
    status,
    errorMessage,
  }
}
