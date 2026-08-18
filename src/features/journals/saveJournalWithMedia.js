import { encryptDraftForCreate } from './encryptDraftForCreate.js'
import * as journalService from './journalService.js'
import { uploadEncryptedJournalMedia } from './uploadJournalMedia.js'

export class JournalMediaUploadError extends Error {
  constructor(message, { journal, cause } = {}) {
    super(message)
    this.name = 'JournalMediaUploadError'
    this.journal = journal
    this.cause = cause
  }
}

/**
 * Create an encrypted journal and optionally upload one encrypted image.
 */
export async function saveJournalWithMedia(
  draft,
  { ensureCryptoMaterial, onProgress } = {},
) {
  const material = await ensureCryptoMaterial()
  onProgress?.('Encrypting…')

  const { payload, encryptedMedia } = await encryptDraftForCreate(
    draft,
    material.publicKey,
  )

  onProgress?.('Saving…')
  const journal = await journalService.createJournal(payload)

  if (!encryptedMedia) {
    return { journal, mediaUploadFailed: false }
  }

  try {
    await uploadEncryptedJournalMedia(journal.id, encryptedMedia, { onProgress })
    return { journal, mediaUploadFailed: false }
  } catch (error) {
    throw new JournalMediaUploadError(
      'Your journal was saved, but the image could not be uploaded.',
      { journal, cause: error },
    )
  }
}
