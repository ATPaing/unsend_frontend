/** Plaintext title max (enforced before encryption). */
export const JOURNAL_TITLE_MAX_LENGTH = 150

/**
 * Max encrypted journal content size (ciphertext including AES-GCM tag).
 * Backend must enforce the same limit on stored/uploaded encrypted bytes.
 */
export const MAX_ENCRYPTED_JOURNAL_CONTENT_BYTES = 500 * 1024

/** AES-GCM auth tag length produced by Web Crypto (included in ciphertext). */
export const AES_GCM_TAG_LENGTH = 16

/**
 * Max plaintext UTF-8 bytes such that ciphertext (plaintext + tag) fits the limit.
 * Does not count AAD; matches current Web Crypto AES-GCM usage.
 */
export const MAX_JOURNAL_CONTENT_PLAINTEXT_BYTES =
  MAX_ENCRYPTED_JOURNAL_CONTENT_BYTES - AES_GCM_TAG_LENGTH

export const MAX_JOURNAL_IMAGES = 1
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

export const ALLOWED_JOURNAL_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const FRIEND_SEARCH_DEBOUNCE_MS = 300
export const FRIEND_SEARCH_MIN_CHARS = 2
