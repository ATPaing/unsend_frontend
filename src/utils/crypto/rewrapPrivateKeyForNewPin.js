import { bytesToBase64, base64ToBytes, zeroize } from './base64.js'
import { CRYPTO_VERSION } from './constants.js'
import {
  generateDerivedKeySalt,
  deriveKeyFromPin,
} from './deriveKey.js'
import {
  decryptPrivateKeyPkcs8,
  importPrivateKeyPkcs8,
} from './decryptPrivateKey.js'
import {
  encryptPrivateKeyPkcs8,
  generatePrivateKeyNonce,
} from './encryptPrivateKey.js'

/**
 * Re-encrypt the SAME PKCS#8 private key under a new PIN.
 * Does not generate a new key pair. Public key stays unchanged.
 */
export async function rewrapPrivateKeyForNewPin({
  currentPin,
  newPin,
  material,
}) {
  if (material.cryptoVersion !== CRYPTO_VERSION) {
    throw new Error('Unsupported crypto version')
  }

  let salt = null
  let nonce = null
  let encryptedPrivateKeyBytes = null
  let derivedKeyBytes = null
  let pkcs8Bytes = null
  let nextSalt = null
  let nextNonce = null
  let nextDerivedKeyBytes = null
  let nextEncrypted = null

  try {
    salt = base64ToBytes(material.derivedKeySalt)
    nonce = base64ToBytes(material.privateKeyNonce)
    encryptedPrivateKeyBytes = base64ToBytes(material.encryptedPrivateKey)
    derivedKeyBytes = await deriveKeyFromPin(currentPin, salt)

    try {
      pkcs8Bytes = await decryptPrivateKeyPkcs8(
        encryptedPrivateKeyBytes,
        derivedKeyBytes,
        nonce,
      )
    } catch {
      const error = new Error('Current PIN is incorrect.')
      error.code = 'INVALID_PIN'
      throw error
    }

    nextSalt = generateDerivedKeySalt()
    nextNonce = generatePrivateKeyNonce()
    nextDerivedKeyBytes = await deriveKeyFromPin(newPin, nextSalt)
    nextEncrypted = await encryptPrivateKeyPkcs8(
      pkcs8Bytes,
      nextDerivedKeyBytes,
      nextNonce,
    )

    const privateKey = await importPrivateKeyPkcs8(pkcs8Bytes)

    return {
      privateKey,
      cryptoPayload: {
        encryptedPrivateKey: bytesToBase64(nextEncrypted),
        privateKeyNonce: bytesToBase64(nextNonce),
        derivedKeySalt: bytesToBase64(nextSalt),
        cryptoVersion: CRYPTO_VERSION,
      },
      nextMaterial: {
        publicKey: material.publicKey,
        encryptedPrivateKey: bytesToBase64(nextEncrypted),
        privateKeyNonce: bytesToBase64(nextNonce),
        derivedKeySalt: bytesToBase64(nextSalt),
        cryptoVersion: CRYPTO_VERSION,
      },
    }
  } finally {
    zeroize(salt)
    zeroize(nonce)
    zeroize(encryptedPrivateKeyBytes)
    zeroize(derivedKeyBytes)
    zeroize(pkcs8Bytes)
    zeroize(nextSalt)
    zeroize(nextNonce)
    zeroize(nextDerivedKeyBytes)
    zeroize(nextEncrypted)
  }
}
