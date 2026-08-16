import { base64ToBytes, bytesToBase64, zeroize } from './base64.js'
import { AES_GCM_KEY_LENGTH, AES_GCM_NONCE_LENGTH } from './constants.js'
import { importPublicKeySpki } from './keys.js'

function generateNonce() {
  return crypto.getRandomValues(new Uint8Array(AES_GCM_NONCE_LENGTH))
}

async function generateJournalAesKey() {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: AES_GCM_KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt'],
  )
}

async function encryptUtf8WithAesGcm(plaintext, aesKey, nonce) {
  const bytes = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    aesKey,
    bytes,
  )

  return new Uint8Array(ciphertext)
}

async function wrapAesKeyForPublicKey(aesKey, publicKeySpkiBytes) {
  let rawAesKey = null

  try {
    const publicKey = await importPublicKeySpki(publicKeySpkiBytes)
    rawAesKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey))

    const wrapped = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      rawAesKey,
    )

    return new Uint8Array(wrapped)
  } finally {
    zeroize(rawAesKey)
  }
}

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
      true,
      ['encrypt', 'decrypt'],
    )
  } finally {
    zeroize(rawAesKey)
  }
}

/**
 * Encrypt a private owner-only journal for create.
 * Optional recipients are wrapped while the raw AES key is still in memory
 * (required for sharing locked time capsules at creation).
 */
export async function encryptOwnerJournal({
  title,
  content,
  ownerPublicKeyBase64,
  journalType = 'JOURNAL',
  unlockAt = null,
  recipients = [],
}) {
  const ownerPublicKeySpkiBytes = base64ToBytes(ownerPublicKeyBase64)

  let aesKey = null
  let titleNonce = null
  let contentNonce = null
  let encryptedTitle = null
  let encryptedContent = null
  let ownerEncryptedAesKey = null

  try {
    aesKey = await generateJournalAesKey()
    titleNonce = generateNonce()
    contentNonce = generateNonce()

    encryptedTitle = await encryptUtf8WithAesGcm(title, aesKey, titleNonce)
    encryptedContent = await encryptUtf8WithAesGcm(content, aesKey, contentNonce)
    ownerEncryptedAesKey = await wrapAesKeyForPublicKey(
      aesKey,
      ownerPublicKeySpkiBytes,
    )

    const wrappedRecipients = []

    for (const recipient of recipients) {
      let friendPublicKeyBytes = null
      let viewerWrapped = null

      try {
        friendPublicKeyBytes = base64ToBytes(recipient.publicKeyBase64)
        viewerWrapped = await wrapAesKeyForPublicKey(aesKey, friendPublicKeyBytes)
        wrappedRecipients.push({
          userId: recipient.userId,
          viewerEncryptedAesKey: bytesToBase64(viewerWrapped),
        })
      } finally {
        zeroize(friendPublicKeyBytes)
        zeroize(viewerWrapped)
      }
    }

    const payload = {
      encryptedTitle: bytesToBase64(encryptedTitle),
      titleNonce: bytesToBase64(titleNonce),
      encryptedContent: bytesToBase64(encryptedContent),
      contentNonce: bytesToBase64(contentNonce),
      ownerEncryptedAesKey: bytesToBase64(ownerEncryptedAesKey),
      journalType,
    }

    if (journalType === 'T_CAPSULE') {
      payload.unlockAt = unlockAt
    }

    if (wrappedRecipients.length > 0) {
      payload.recipients = wrappedRecipients
    }

    return payload
  } finally {
    zeroize(titleNonce)
    zeroize(contentNonce)
    zeroize(encryptedTitle)
    zeroize(encryptedContent)
    zeroize(ownerEncryptedAesKey)
    zeroize(ownerPublicKeySpkiBytes)
    aesKey = null
  }
}

/**
 * Re-encrypt journal content while REUSING the existing AES key so shared
 * recipients keep working. Fresh AES-GCM nonces are always generated.
 */
export async function encryptOwnerJournalUpdate({
  title,
  content,
  existingOwnerEncryptedAesKeyBase64,
  ownerPrivateKey,
}) {
  let wrappedKeyBytes = null
  let aesKey = null
  let titleNonce = null
  let contentNonce = null
  let encryptedTitle = null
  let encryptedContent = null

  try {
    wrappedKeyBytes = base64ToBytes(existingOwnerEncryptedAesKeyBase64)
    aesKey = await unwrapJournalAesKey(wrappedKeyBytes, ownerPrivateKey)
    titleNonce = generateNonce()
    contentNonce = generateNonce()

    encryptedTitle = await encryptUtf8WithAesGcm(title, aesKey, titleNonce)
    encryptedContent = await encryptUtf8WithAesGcm(content, aesKey, contentNonce)

    return {
      encryptedTitle: bytesToBase64(encryptedTitle),
      titleNonce: bytesToBase64(titleNonce),
      encryptedContent: bytesToBase64(encryptedContent),
      contentNonce: bytesToBase64(contentNonce),
      // Keep the original owner wrap — same AES key, recipients stay valid.
      ownerEncryptedAesKey: existingOwnerEncryptedAesKeyBase64,
      journalType: 'JOURNAL',
    }
  } finally {
    zeroize(wrappedKeyBytes)
    zeroize(titleNonce)
    zeroize(contentNonce)
    zeroize(encryptedTitle)
    zeroize(encryptedContent)
    aesKey = null
  }
}

/**
 * Wrap an existing journal AES key for a friend (sharing).
 */
export async function wrapJournalAesKeyForFriend({
  ownerEncryptedAesKeyBase64,
  ownerPrivateKey,
  friendPublicKeyBase64,
}) {
  let ownerWrappedBytes = null
  let friendPublicKeyBytes = null
  let aesKey = null
  let viewerWrapped = null

  try {
    ownerWrappedBytes = base64ToBytes(ownerEncryptedAesKeyBase64)
    friendPublicKeyBytes = base64ToBytes(friendPublicKeyBase64)
    aesKey = await unwrapJournalAesKey(ownerWrappedBytes, ownerPrivateKey)
    viewerWrapped = await wrapAesKeyForPublicKey(aesKey, friendPublicKeyBytes)

    return bytesToBase64(viewerWrapped)
  } finally {
    zeroize(ownerWrappedBytes)
    zeroize(friendPublicKeyBytes)
    zeroize(viewerWrapped)
    aesKey = null
  }
}
