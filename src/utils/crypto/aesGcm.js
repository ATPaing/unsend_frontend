import { AES_GCM_KEY_LENGTH, AES_GCM_NONCE_LENGTH } from './constants.js'

export function generateAesGcmNonce() {
  return crypto.getRandomValues(new Uint8Array(AES_GCM_NONCE_LENGTH))
}

export async function generateAesGcmKey(exportable = true) {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: AES_GCM_KEY_LENGTH,
    },
    exportable,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBinaryWithAesGcm(plaintextBytes, aesKey, nonce) {
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    aesKey,
    plaintextBytes,
  )

  return new Uint8Array(ciphertext)
}

export async function decryptBinaryWithAesGcm(ciphertextBytes, aesKey, nonce) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    aesKey,
    ciphertextBytes,
  )

  return new Uint8Array(plaintext)
}

export async function encryptStringWithAesGcm(plaintext, aesKey, nonce) {
  const bytes = new TextEncoder().encode(plaintext)
  return encryptBinaryWithAesGcm(bytes, aesKey, nonce)
}

export async function decryptStringWithAesGcm(ciphertextBytes, aesKey, nonce) {
  const bytes = await decryptBinaryWithAesGcm(ciphertextBytes, aesKey, nonce)
  return new TextDecoder().decode(bytes)
}
