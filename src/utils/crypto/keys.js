import {
  RSA_HASH,
  RSA_MODULUS_LENGTH,
  RSA_PUBLIC_EXPONENT,
} from './constants.js'

export async function generateRsaOaepKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: RSA_PUBLIC_EXPONENT,
      hash: RSA_HASH,
    },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function exportPublicKeySpki(publicKey) {
  return new Uint8Array(await crypto.subtle.exportKey('spki', publicKey))
}

export async function exportPrivateKeyPkcs8(privateKey) {
  return new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey))
}

export async function importPublicKeySpki(spkiBytes) {
  return crypto.subtle.importKey(
    'spki',
    spkiBytes,
    {
      name: 'RSA-OAEP',
      hash: RSA_HASH,
    },
    false,
    ['encrypt'],
  )
}
