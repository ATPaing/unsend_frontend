import { base64ToBytes, zeroize } from './base64.js'

async function unwrapJournalAesKey(wrappedAesKeyBytes, privateKey) {
  let rawAesKey = null

  try {
    const raw = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      wrappedAesKeyBytes,
    )
    rawAesKey = new Uint8Array(raw)

    return crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )
  } finally {
    zeroize(rawAesKey)
  }
}

async function decryptUtf8WithAesGcm(ciphertextBytes, aesKey, nonce) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    aesKey,
    ciphertextBytes,
  )

  return new TextDecoder().decode(plaintext)
}

async function decryptJournalWithWrappedKey(
  journal,
  privateKey,
  wrappedAesKeyBase64,
) {
  let wrappedAesKeyBytes = null
  let titleNonce = null
  let contentNonce = null
  let encryptedTitle = null
  let encryptedContent = null
  let aesKey = null

  try {
    wrappedAesKeyBytes = base64ToBytes(wrappedAesKeyBase64)
    titleNonce = base64ToBytes(journal.titleNonce)
    contentNonce = base64ToBytes(journal.contentNonce)
    encryptedTitle = base64ToBytes(journal.encryptedTitle)
    encryptedContent = base64ToBytes(journal.encryptedContent)

    aesKey = await unwrapJournalAesKey(wrappedAesKeyBytes, privateKey)

    const title = await decryptUtf8WithAesGcm(encryptedTitle, aesKey, titleNonce)
    const content = await decryptUtf8WithAesGcm(
      encryptedContent,
      aesKey,
      contentNonce,
    )

    return {
      title,
      content,
    }
  } finally {
    zeroize(wrappedAesKeyBytes)
    zeroize(titleNonce)
    zeroize(contentNonce)
    zeroize(encryptedTitle)
    zeroize(encryptedContent)
    aesKey = null
  }
}

/**
 * Decrypt an owner journal using the in-memory RSA private CryptoKey.
 */
export async function decryptOwnerJournal(journal, privateKey) {
  return decryptJournalWithWrappedKey(
    journal,
    privateKey,
    journal.ownerEncryptedAesKey,
  )
}

/**
 * Decrypt a shared journal using the recipient's viewer-wrapped AES key.
 */
export async function decryptSharedJournal(journal, privateKey) {
  const wrappedKey = journal.encryptedAesKey

  if (!wrappedKey) {
    throw new Error('Shared journal is missing encryptedAesKey')
  }

  return decryptJournalWithWrappedKey(journal, privateKey, wrappedKey)
}

export async function decryptJournalForAccess(journal, privateKey) {
  if (journal?.access === 'SHARED' || journal?.encryptedAesKey) {
    return decryptSharedJournal(journal, privateKey)
  }

  return decryptOwnerJournal(journal, privateKey)
}

/**
 * Import the journal AES key for media decrypt (owner or shared recipient).
 */
export async function importJournalAesKey(journal, privateKey) {
  const wrappedKeyBase64 =
    journal?.access === 'SHARED' || journal?.encryptedAesKey
      ? journal.encryptedAesKey
      : journal.ownerEncryptedAesKey

  if (!wrappedKeyBase64) {
    throw new Error('Journal is missing a wrapped AES key')
  }

  let wrappedAesKeyBytes = null

  try {
    wrappedAesKeyBytes = base64ToBytes(wrappedKeyBase64)
    return unwrapJournalAesKey(wrappedAesKeyBytes, privateKey)
  } finally {
    zeroize(wrappedAesKeyBytes)
  }
}
