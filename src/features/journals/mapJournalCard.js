export function formatJournalDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toPlainPreview(markdown, maxLength = 140) {
  const plain = String(markdown ?? '')
    .replace(/`[^`]*`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*|~~|\*)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= maxLength) {
    return plain
  }

  return `${plain.slice(0, maxLength).trim()}…`
}

export function toCardJournal(apiJournal, decrypted) {
  const ciphertext = apiJournal.encryptedTitle || ''
  const sharedCount = Array.isArray(apiJournal.sharedWith)
    ? apiJournal.sharedWith.length
    : 0
  const isCapsule = apiJournal.journalType === 'T_CAPSULE'
  const capsuleContentUnlocked = isCapsule
    ? apiJournal.isUnlocked === true
    : true
  const capsuleLocked = isCapsule && !capsuleContentUnlocked

  return {
    id: apiJournal.id,
    dateLabel: formatJournalDate(apiJournal.createdAt),
    visibility: sharedCount > 0 ? 'Shared' : 'Private',
    sharedCount,
    journalType: apiJournal.journalType || 'JOURNAL',
    unlockAt: apiJournal.unlockAt ?? null,
    isUnlocked: capsuleContentUnlocked,
    capsuleLocked,
    ciphertext,
    ciphertextPreview:
      ciphertext.length > 72 ? `${ciphertext.slice(0, 72)}…` : ciphertext,
    plaintext:
      !capsuleLocked && decrypted
        ? decrypted.title?.trim() || 'Untitled journal'
        : null,
    preview:
      !capsuleLocked && decrypted ? toPlainPreview(decrypted.content) : null,
    markdown: !capsuleLocked && decrypted ? decrypted.content ?? null : null,
    encryptedTitle: apiJournal.encryptedTitle,
    encryptedContent: apiJournal.encryptedContent,
  }
}
