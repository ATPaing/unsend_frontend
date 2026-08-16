import {
  ALLOWED_JOURNAL_IMAGE_MIME_TYPES,
  AES_GCM_TAG_LENGTH,
  JOURNAL_TITLE_MAX_LENGTH,
  MAX_ENCRYPTED_JOURNAL_CONTENT_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_JOURNAL_CONTENT_PLAINTEXT_BYTES,
  MAX_JOURNAL_IMAGES,
} from './constants.js'

export function getUtf8ByteLength(value) {
  return new TextEncoder().encode(value ?? '').length
}

export function estimateEncryptedContentBytes(plaintext) {
  return getUtf8ByteLength(plaintext) + AES_GCM_TAG_LENGTH
}

export function countWords(value) {
  const withoutCode = String(value ?? '').replace(/`[^`]*`/g, ' ')
  const withoutMarkers = withoutCode
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*|~~|\*)/g, ' ')
    .replace(/[^\p{L}\p{N}'’-]+/gu, ' ')
    .trim()

  if (!withoutMarkers) {
    return 0
  }

  return withoutMarkers.split(/\s+/).filter(Boolean).length
}

export function validateJournalTitle(title) {
  if (title.length > JOURNAL_TITLE_MAX_LENGTH) {
    return `Title must be ${JOURNAL_TITLE_MAX_LENGTH} characters or fewer.`
  }

  return null
}

export function validateJournalContent(content) {
  const plaintextBytes = getUtf8ByteLength(content)

  if (plaintextBytes > MAX_JOURNAL_CONTENT_PLAINTEXT_BYTES) {
    return `Journal content is too large. Keep encrypted content under ${Math.floor(MAX_ENCRYPTED_JOURNAL_CONTENT_BYTES / 1024)} KB.`
  }

  return null
}

/**
 * @param {File} file
 * @param {number} existingImageCount - images already attached (0 when replacing)
 */
export function validateJournalImage(file, existingImageCount = 0) {
  if (!file) {
    return null
  }

  if (existingImageCount >= MAX_JOURNAL_IMAGES) {
    return `Only ${MAX_JOURNAL_IMAGES} image is allowed.`
  }

  if (!ALLOWED_JOURNAL_IMAGE_MIME_TYPES.includes(file.type)) {
    return 'Use a JPEG, PNG, WebP, or GIF image.'
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image must be 10 MB or smaller.'
  }

  return null
}

export function validateJournalDraft({
  title,
  content,
  visibility,
  selectedFriends,
  imageFile,
}) {
  const trimmedTitle = String(title ?? '').trim()
  const trimmedContent = String(content ?? '').trim()

  if (!trimmedTitle && !trimmedContent) {
    return 'Add a title or some writing before saving.'
  }

  const titleError = validateJournalTitle(trimmedTitle)
  if (titleError) {
    return titleError
  }

  const contentError = validateJournalContent(trimmedContent)
  if (contentError) {
    return contentError
  }

  if (imageFile) {
    const imageError = validateJournalImage(imageFile, 0)
    if (imageError) {
      return imageError
    }
  }

  if (visibility === 'friends' && (!selectedFriends || selectedFriends.length === 0)) {
    return 'Select at least one friend to share with.'
  }

  return null
}
