import { apiRequest } from '../../services/api.js'

export const ENCRYPTED_MEDIA_CONTENT_TYPE = 'application/octet-stream'

export async function requestMediaUploadUrl(journalId, payload) {
  const response = await apiRequest(`/journals/${journalId}/media/upload-url`, {
    method: 'POST',
    body: payload,
  })

  return response.data
}

export async function confirmMediaUpload(journalId, mediaId) {
  const response = await apiRequest(
    `/journals/${journalId}/media/${mediaId}/confirm`,
    {
      method: 'POST',
    },
  )

  return response.data
}

export async function getMediaDownloadUrl(journalId) {
  const response = await apiRequest(`/journals/${journalId}/media/download-url`, {
    method: 'GET',
  })

  return response.data
}

export async function putEncryptedMediaToPresignedUrl(uploadUrl, ciphertext) {
  const encryptedBlob = new Blob([ciphertext], {
    type: ENCRYPTED_MEDIA_CONTENT_TYPE,
  })

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': ENCRYPTED_MEDIA_CONTENT_TYPE,
    },
    body: encryptedBlob,
  })

  if (!response.ok) {
    throw new Error('Encrypted image upload failed')
  }

  return encryptedBlob.size
}

export async function fetchEncryptedMediaFromPresignedUrl(downloadUrl) {
  const response = await fetch(downloadUrl)

  if (!response.ok) {
    throw new Error('Encrypted image download failed')
  }

  return new Uint8Array(await response.arrayBuffer())
}
