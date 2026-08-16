import { AES_GCM_NONCE_LENGTH } from './constants.js'

export function generatePrivateKeyNonce() {
  return crypto.getRandomValues(new Uint8Array(AES_GCM_NONCE_LENGTH))
}

export async function encryptPrivateKeyPkcs8(pkcs8Bytes, derivedKeyBytes, nonce) {
  const aesKey = await crypto.subtle.importKey(
    'raw',
    derivedKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )

  const ciphertextWithTag = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    aesKey,
    pkcs8Bytes,
  )

  return new Uint8Array(ciphertextWithTag)
}
