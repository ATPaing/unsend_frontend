import { Clock3, EyeOff, Lock, LockOpen, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import CiphertextReveal from '../../components/ui/CiphertextReveal.jsx'
import {
  formatUnlockDateTime,
} from './capsuleTime.js'
import LiveCountdown from './LiveCountdown.jsx'

function JournalCard({ journal, isUnlocked, onCapsuleExpired }) {
  const isShared = journal.visibility === 'Shared'
  const isCapsule = journal.journalType === 'T_CAPSULE'
  const capsuleLocked = Boolean(journal.capsuleLocked)

  if (capsuleLocked) {
    return (
      <Link
        to={`/journals/${journal.id}`}
        className="block min-w-0 rounded-2xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <article className="flex min-h-[168px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
              <Clock3 size={12} strokeWidth={2.25} aria-hidden="true" />
              Time Capsule
            </span>
            <time className="shrink-0 text-xs text-muted">{journal.dateLabel}</time>
          </div>

          <div className="mt-4 flex flex-1 flex-col">
            <div className="flex items-center gap-2 text-ink">
              <Lock size={16} strokeWidth={2} aria-hidden="true" />
              <h3 className="text-base font-bold tracking-tight">
                Encrypted Time Capsule
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted">
              Unlocks {formatUnlockDateTime(journal.unlockAt)}
            </p>
            <p className="mt-1 text-xs font-medium text-brand">
              <LiveCountdown
                unlockAt={journal.unlockAt}
                onExpired={() => onCapsuleExpired?.(journal.id)}
              />
            </p>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
              <Lock size={12} strokeWidth={2} aria-hidden="true" />
              Locked
            </span>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link
      to={`/journals/${journal.id}`}
      className="block min-w-0 rounded-2xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <article className="flex min-h-[168px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isUnlocked
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-brand-soft text-brand'
            }`}
          >
            {isUnlocked ? (
              <LockOpen size={12} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
            )}
            {isUnlocked ? 'Decrypted' : 'Encrypted'}
          </span>
          <time className="shrink-0 text-xs text-muted">{journal.dateLabel}</time>
        </div>

        {isUnlocked && journal.plaintext ? (
          <>
            <h3 className="mt-4 line-clamp-2 text-base font-bold tracking-tight text-ink break-words">
              {journal.plaintext}
            </h3>
            {journal.preview ? (
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
                {journal.preview}
              </p>
            ) : (
              <div className="mt-2 flex-1" />
            )}
          </>
        ) : (
          <CiphertextReveal
            as="p"
            className="mt-4 min-w-0 flex-1 overflow-hidden font-mono text-sm leading-relaxed text-slate-500 break-all"
            ciphertext={journal.ciphertextPreview || journal.ciphertext}
            plaintext={null}
            revealed={false}
            blurWhenLocked
          />
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {isCapsule ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
              <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
              Time Capsule
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
            {isShared ? (
              <Share2 size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <EyeOff size={12} strokeWidth={2} aria-hidden="true" />
            )}
            {isShared ? 'Shared' : 'Private'}
          </span>
        </div>
      </article>
    </Link>
  )
}

export default JournalCard
