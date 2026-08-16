import { RSA_HASH } from './constants.js'
import { zeroize } from './base64.js'

export async function decryptPrivateKeyPkcs8(
  encryptedPrivateKeyBytes,
  derivedKeyBytes,
  nonce,
) {
  const aesKey = await crypto.subtle.importKey(
    'raw',
    derivedKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    aesKey,
    encryptedPrivateKeyBytes,
  )

  return new Uint8Array(plaintext)
}

export async function importPrivateKeyPkcs8(pkcs8Bytes) {
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes,
    {
      name: 'RSA-OAEP',
      hash: RSA_HASH,
    },
    false,
    ['decrypt'],
  )
}

export async function unlockPrivateKey({
  encryptedPrivateKeyBytes,
  derivedKeyBytes,
  nonce,
}) {
  let pkcs8Bytes = null

  try {
    pkcs8Bytes = await decryptPrivateKeyPkcs8(
      encryptedPrivateKeyBytes,
      derivedKeyBytes,
      nonce,
    )

    return await importPrivateKeyPkcs8(pkcs8Bytes)
  } finally {
    zeroize(pkcs8Bytes)
  }
}
