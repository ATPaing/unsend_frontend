import { bytesToBase64, zeroize } from './base64.js'
import {
  encryptBinaryWithAesGcm,
  encryptStringWithAesGcm,
  generateAesGcmNonce,
} from './aesGcm.js'

/**
 * Encrypt one journal image and its metadata with the journal AES key.
 * Each field uses an independent AES-GCM nonce.
 */
export async function encryptJournalMediaFile(file, aesKey) {
  const mimeNonce = generateAesGcmNonce()
  const fileNameNonce = generateAesGcmNonce()
  const fileNonce = generateAesGcmNonce()

  let fileBytes = null
  let encryptedMime = null
  let encryptedFileName = null
  let ciphertext = null

  try {
    fileBytes = new Uint8Array(await file.arrayBuffer())
    encryptedMime = await encryptStringWithAesGcm(file.type, aesKey, mimeNonce)
    encryptedFileName = await encryptStringWithAesGcm(file.name, aesKey, fileNameNonce)
    ciphertext = await encryptBinaryWithAesGcm(fileBytes, aesKey, fileNonce)

    return {
      encryptedMime: bytesToBase64(encryptedMime),
      mimeNonce: bytesToBase64(mimeNonce),
      encryptedFileName: bytesToBase64(encryptedFileName),
      fileNameNonce: bytesToBase64(fileNameNonce),
      fileNonce: bytesToBase64(fileNonce),
      ciphertext: new Uint8Array(ciphertext),
    }
  } finally {
    zeroize(fileBytes)
    zeroize(encryptedMime)
    zeroize(encryptedFileName)
    zeroize(ciphertext)
    zeroize(mimeNonce)
    zeroize(fileNameNonce)
    zeroize(fileNonce)
  }
}
