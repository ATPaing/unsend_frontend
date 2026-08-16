import { bytesToBase64, zeroize } from './base64.js'
import { CRYPTO_VERSION } from './constants.js'
import { importPrivateKeyPkcs8 } from './decryptPrivateKey.js'
import { deriveKeyFromPin, generateDerivedKeySalt } from './deriveKey.js'
import { encryptPrivateKeyPkcs8, generatePrivateKeyNonce } from './encryptPrivateKey.js'
import {
  exportPrivateKeyPkcs8,
  exportPublicKeySpki,
  generateRsaOaepKeyPair,
} from './keys.js'

export async function buildSignupCrypto(pin) {
  const salt = generateDerivedKeySalt()
  const nonce = generatePrivateKeyNonce()
  let keyPair = null
  let publicKeyBytes = null
  let privateKeyBytes = null
  let derivedKeyBytes = null
  let encryptedPrivateKeyBytes = null
  let sessionPrivateKey = null

  try {
    keyPair = await generateRsaOaepKeyPair()
    publicKeyBytes = await exportPublicKeySpki(keyPair.publicKey)
    privateKeyBytes = await exportPrivateKeyPkcs8(keyPair.privateKey)
    derivedKeyBytes = await deriveKeyFromPin(pin, salt)
    encryptedPrivateKeyBytes = await encryptPrivateKeyPkcs8(
      privateKeyBytes,
      derivedKeyBytes,
      nonce,
    )
    sessionPrivateKey = await importPrivateKeyPkcs8(privateKeyBytes)

    return {
      crypto: {
        publicKey: bytesToBase64(publicKeyBytes),
        encryptedPrivateKey: bytesToBase64(encryptedPrivateKeyBytes),
        derivedKeySalt: bytesToBase64(salt),
        privateKeyNonce: bytesToBase64(nonce),
        cryptoVersion: CRYPTO_VERSION,
      },
      privateKey: sessionPrivateKey,
    }
  } finally {
    zeroize(privateKeyBytes)
    zeroize(derivedKeyBytes)
    zeroize(publicKeyBytes)
    zeroize(encryptedPrivateKeyBytes)
    zeroize(salt)
    zeroize(nonce)
    keyPair = null
  }
}
