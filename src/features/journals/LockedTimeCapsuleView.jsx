import { useState } from 'react'
import { Clock3, Lock, Pencil, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import { formatJournalDate } from './mapJournalCard.js'
import { formatUnlockDateTime, localDateTimeToIso } from './capsuleTime.js'
import LiveCountdown from './LiveCountdown.jsx'
import { getServerNowMs } from '../time/serverClock.js'

function toLocalDateInput(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toLocalTimeInput(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function LockedTimeCapsuleView({
  journal,
  onDelete,
  onExtendUnlockAt,
  onUnlockElapsed,
  isDeleting = false,
  isExtending = false,
}) {
  const isShared = journal.access === 'SHARED'
  const [isExtendingOpen, setIsExtendingOpen] = useState(false)
  const [extendDate, setExtendDate] = useState('')
  const [extendTime, setExtendTime] = useState('')
  const [extendError, setExtendError] = useState('')

  function openExtend() {
    const base = journal.unlockAt
      ? new Date(new Date(journal.unlockAt).getTime() + 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000)

    setExtendDate(toLocalDateInput(base))
    setExtendTime(toLocalTimeInput(base))
    setExtendError('')
    setIsExtendingOpen(true)
  }

  async function handleExtendSubmit(event) {
    event.preventDefault()
    setExtendError('')

    const iso = localDateTimeToIso(extendDate, extendTime)
    if (!iso) {
      setExtendError('Enter a valid unlock date and time.')
      return
    }

    const next = new Date(iso)
    const current = new Date(journal.unlockAt)

    if (next.getTime() <= getServerNowMs()) {
      setExtendError('Unlock time must be in the future.')
      return
    }

    if (next.getTime() <= current.getTime()) {
      setExtendError('You can only move the unlock time later.')
      return
    }

    try {
      await onExtendUnlockAt?.(iso)
      setIsExtendingOpen(false)
    } catch {
      setExtendError('Unable to update unlock time.')
    }
  }

  return (
    <article className="mx-auto w-full max-w-xl py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Lock size={24} strokeWidth={1.75} aria-hidden="true" />
      </div>

      <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-brand uppercase">
        <Clock3 size={12} strokeWidth={2} aria-hidden="true" />
        Time Capsule
      </p>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
        Encrypted Time Capsule
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        This capsule stays sealed until the unlock time. Nobody — including you
        — can read it before then.
      </p>

      {!isShared ? (
        <p className="mt-3 rounded-2xl border border-border bg-page px-4 py-3 text-left text-sm leading-relaxed text-muted">
          <span className="font-semibold text-ink">Sharing: </span>
          New friends can&apos;t be added while this capsule is sealed. Invite
          people when you create it, or share again after it unlocks.
          {Array.isArray(journal.sharedWith) && journal.sharedWith.length > 0
            ? ` Currently shared with ${journal.sharedWith.length} friend${journal.sharedWith.length === 1 ? '' : 's'}.`
            : ''}
        </p>
      ) : null}

      <dl className="mt-8 space-y-3 rounded-2xl border border-border bg-surface px-5 py-5 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Created</dt>
          <dd className="font-medium text-ink">
            {formatJournalDate(journal.createdAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Unlocks</dt>
          <dd className="font-medium text-ink">
            {formatUnlockDateTime(journal.unlockAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Countdown</dt>
          <dd className="font-medium text-brand">
            <LiveCountdown
              unlockAt={journal.unlockAt}
              onExpired={() => onUnlockElapsed?.(journal.id)}
            />
          </dd>
        </div>
        {isShared ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Shared by</dt>
            <dd className="font-medium text-ink">
              @{journal.owner?.username ?? 'someone'}
            </dd>
          </div>
        ) : null}
      </dl>

      {!isShared ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-auto"
            onClick={openExtend}
            disabled={isExtending || isDeleting}
          >
            <Pencil size={14} strokeWidth={2} aria-hidden="true" />
            Extend unlock time
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-auto text-danger hover:border-red-200 hover:bg-red-50"
            onClick={onDelete}
            disabled={isDeleting || isExtending}
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
            Delete
          </Button>
        </div>
      ) : null}

      {isExtendingOpen ? (
        <form
          className="mt-6 rounded-2xl border border-border bg-page px-4 py-4 text-left"
          onSubmit={handleExtendSubmit}
        >
          <p className="text-sm font-semibold text-ink">
            Move unlock time later
          </p>
          <p className="mt-1 text-xs text-muted">
            You cannot unlock early by choosing an earlier date.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted">
              Date
              <input
                type="date"
                value={extendDate}
                onChange={(event) => setExtendDate(event.target.value)}
                disabled={isExtending}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Time
              <input
                type="time"
                value={extendTime}
                onChange={(event) => setExtendTime(event.target.value)}
                disabled={isExtending}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>
          {extendError ? (
            <p className="mt-2 text-xs text-danger" role="alert">
              {extendError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto"
              disabled={isExtending}
              onClick={() => setIsExtendingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-auto"
              disabled={isExtending}
            >
              {isExtending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  )
}

export default LockedTimeCapsuleView
