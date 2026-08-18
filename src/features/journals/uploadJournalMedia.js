import * as mediaService from './mediaService.js'

/**
 * Upload encrypted journal media: presigned URL → R2 PUT → confirm.
 */
export async function uploadEncryptedJournalMedia(
  journalId,
  encryptedMedia,
  { onProgress } = {},
) {
  const { ciphertext, ...metadata } = encryptedMedia
  const encryptedBlob = new Blob([ciphertext], {
    type: mediaService.ENCRYPTED_MEDIA_CONTENT_TYPE,
  })
  const size = encryptedBlob.size

  onProgress?.('Requesting upload URL…')

  const { media, upload } = await mediaService.requestMediaUploadUrl(journalId, {
    ...metadata,
    size,
  })

  onProgress?.('Uploading encrypted image…')
  await mediaService.putEncryptedMediaToPresignedUrl(upload.url, ciphertext)

  onProgress?.('Confirming upload…')
  await mediaService.confirmMediaUpload(journalId, media.id)

  return media
}
