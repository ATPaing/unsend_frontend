import { useEffect, useRef, useState } from 'react'
import {
  Clock3,
  EyeOff,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Share2,
} from 'lucide-react'
import CiphertextReveal from '../../components/ui/CiphertextReveal.jsx'
import { formatJournalDate } from './mapJournalCard.js'
import { formatUnlockDateTime } from './capsuleTime.js'
import { renderJournalMarkdown } from '../../utils/markdown/renderJournalMarkdown.jsx'

/**
 * Full-page journal reading layout (not a card).
 * imageUrl is reserved for future single-image media support.
 */
function JournalReadingView({
  journal,
  decrypted,
  isUnlocked,
  imageUrl = null,
  imageStatus = 'idle',
  imageErrorMessage = '',
  access = 'OWNED',
  onEdit,
  onDelete,
  onShare,
  isDeleting = false,
}) {
  const isShared = access === 'SHARED'
  const isCapsule = journal?.journalType === 'T_CAPSULE'
  const isSharedWithFriends =
    !isShared &&
    Array.isArray(journal?.sharedWith) &&
    journal.sharedWith.length > 0
  const canRead = Boolean(isUnlocked && decrypted)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const lastPlainRef = useRef(decrypted)
  const [bodyOpaque, setBodyOpaque] = useState(true)
  const [showPlainBody, setShowPlainBody] = useState(canRead)

  if (decrypted) {
    lastPlainRef.current = decrypted
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (canRead === showPlainBody) {
      setBodyOpaque(true)
      return
    }

    setBodyOpaque(false)
    const timer = window.setTimeout(() => {
      setShowPlainBody(canRead)
      setBodyOpaque(true)
    }, 160)

    return () => window.clearTimeout(timer)
  }, [canRead, showPlainBody])

  const plain = lastPlainRef.current
  const titlePlain = plain?.title?.trim() || 'Untitled journal'
  const titleCipher = journal.encryptedTitle
  const isLockedView = !canRead

  return (
    <article className="w-full">
      <div className="relative z-20 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              canRead ? 'text-emerald-700' : 'text-brand'
            }`}
          >
            {canRead ? (
              <LockOpen size={13} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <Lock size={13} strokeWidth={2.25} aria-hidden="true" />
            )}
            {canRead ? 'Decrypted' : 'Encrypted'}
          </span>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <time>{formatJournalDate(journal.createdAt)}</time>
            {isCapsule ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
                Time Capsule
                {journal.unlockAt
                  ? ` · Unlocked ${formatUnlockDateTime(journal.unlockAt)}`
                  : ''}
              </span>
            ) : null}
            {isShared ? (
              <span className="inline-flex items-center gap-1">
                <Share2 size={12} strokeWidth={2} aria-hidden="true" />
                Shared by @{journal.owner?.username ?? 'someone'}
              </span>
            ) : isSharedWithFriends ? (
              <span className="inline-flex items-center gap-1">
                <Share2 size={12} strokeWidth={2} aria-hidden="true" />
                Shared
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <EyeOff size={12} strokeWidth={2} aria-hidden="true" />
                Private
              </span>
            )}
          </div>
        </div>

        {!isShared ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface hover:text-ink"
            >
              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
              Edit
            </button>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="More journal actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink"
              >
                <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
              </button>

              {menuOpen ? (
                <div className="absolute top-full right-0 z-30 mt-1 min-w-[160px] rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-card)]">
                  <button
                    type="button"
                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-ink hover:bg-page"
                    onClick={() => {
                      setMenuOpen(false)
                      onShare?.()
                    }}
                  >
                    Share with friend
                  </button>
                  <button
                    type="button"
                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-danger hover:bg-page disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete?.()
                    }}
                    disabled={isDeleting || !onDelete}
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mt-4 min-h-[min(50vh,420px)]">
        <div
          className={`transition-[filter] duration-200 ease-out ${
            isLockedView
              ? 'pointer-events-none select-none blur-[6px]'
              : 'blur-0'
          }`}
          aria-hidden={isLockedView || undefined}
        >
          <CiphertextReveal
            as="h1"
            className={`py-0.5 text-3xl font-bold leading-snug tracking-tight break-words sm:text-4xl ${
              showPlainBody
                ? 'text-ink'
                : 'font-mono text-xl leading-snug text-slate-500 sm:text-2xl'
            }`}
            ciphertext={titleCipher}
            plaintext={titlePlain}
            revealed={showPlainBody}
            blurWhenLocked={false}
          />

          {imageStatus === 'loading' ? (
            <p className="mt-5 text-sm text-muted">Loading encrypted image…</p>
          ) : null}

          {imageUrl ? (
            <figure className="mt-5">
              <img
                src={imageUrl}
                alt=""
                className="max-h-[480px] w-full rounded-2xl object-contain"
              />
            </figure>
          ) : null}

          {imageStatus === 'error' || imageStatus === 'forbidden' ? (
            <p className="mt-5 text-sm text-muted" role="status">
              {imageErrorMessage || 'Unable to load the encrypted image.'}
            </p>
          ) : null}

          <div
            className={`mt-4 transition-opacity duration-150 ease-out ${
              bodyOpaque ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {showPlainBody ? (
              <div className="journal-prose text-[15px] leading-7 text-ink sm:text-base sm:leading-8">
                {renderJournalMarkdown(plain?.content ?? '')}
              </div>
            ) : (
              <CiphertextReveal
                as="p"
                className="font-mono text-sm leading-relaxed text-slate-500 break-all"
                ciphertext={journal.encryptedContent}
                plaintext={null}
                revealed={false}
                blurWhenLocked={false}
              />
            )}
          </div>
        </div>

        {isLockedView ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
            <p className="max-w-md text-center text-lg font-semibold text-ink sm:text-xl">
              <span className="mb-3 flex justify-center">
                <Lock
                  size={28}
                  strokeWidth={2.25}
                  className="text-brand"
                  aria-hidden="true"
                />
              </span>
              Unlock your vault to decrypt and read this journal.
            </p>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export default JournalReadingView
