import { base64ToBytes, zeroize } from './base64.js'
import {
  decryptBinaryWithAesGcm,
  decryptStringWithAesGcm,
} from './aesGcm.js'

/**
 * Decrypt journal media ciphertext and metadata using the journal AES key.
 */
export async function decryptJournalMediaPayload(
  {
    encryptedMime,
    mimeNonce,
    encryptedFileName,
    fileNameNonce,
    fileNonce,
  },
  ciphertextBytes,
  aesKey,
) {
  let mimeCipher = null
  let fileNameCipher = null
  let fileCipher = null
  let mimeIv = null
  let fileNameIv = null
  let fileIv = null
  let decryptedBytes = null

  try {
    mimeCipher = base64ToBytes(encryptedMime)
    mimeIv = base64ToBytes(mimeNonce)
    fileNameCipher = base64ToBytes(encryptedFileName)
    fileNameIv = base64ToBytes(fileNameNonce)
    fileIv = base64ToBytes(fileNonce)
    fileCipher =
      ciphertextBytes instanceof Uint8Array
        ? ciphertextBytes
        : new Uint8Array(ciphertextBytes)

    const [mimeType, fileName, imageBytes] = await Promise.all([
      decryptStringWithAesGcm(mimeCipher, aesKey, mimeIv),
      decryptStringWithAesGcm(fileNameCipher, aesKey, fileNameIv),
      decryptBinaryWithAesGcm(fileCipher, aesKey, fileIv),
    ])

    decryptedBytes = imageBytes

    return {
      mimeType,
      fileName,
      blob: new Blob([imageBytes], { type: mimeType }),
    }
  } finally {
    zeroize(mimeCipher)
    zeroize(fileNameCipher)
    zeroize(fileCipher)
    zeroize(mimeIv)
    zeroize(fileNameIv)
    zeroize(fileIv)
    zeroize(decryptedBytes)
  }
}
