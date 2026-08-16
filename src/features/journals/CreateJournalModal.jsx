import { useEffect, useId, useRef, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  ImageIcon,
  Lock,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import { useToast } from '../toast/ToastContext.jsx'
import { searchFriends } from '../friends/searchFriends.js'
import {
  ALLOWED_JOURNAL_IMAGE_MIME_TYPES,
  FRIEND_SEARCH_DEBOUNCE_MS,
  FRIEND_SEARCH_MIN_CHARS,
  JOURNAL_TITLE_MAX_LENGTH,
  MAX_JOURNAL_IMAGES,
} from '../../utils/journal/constants.js'
import {
  validateJournalDraft,
  validateJournalImage,
} from '../../utils/journal/validation.js'
import {
  defaultFutureLocalParts,
  formatUnlockDateTime,
  localDateTimeToIso,
} from './capsuleTime.js'
import { getServerNowMs } from '../time/serverClock.js'
import JournalEditor from './JournalEditor.jsx'

const EMPTY_FORM = {
  title: '',
  content: '',
  visibility: 'private',
}

function getInitials(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function CreateJournalModal({
  open,
  onClose,
  onSave,
  mode = 'create',
  createKind = 'journal',
  initialDraft = null,
}) {
  const titleId = useId()
  const listboxId = useId()
  const fileInputRef = useRef(null)
  const searchContainerRef = useRef(null)
  const friendSearchAbortRef = useRef(null)
  const { showToast, updateToast } = useToast()
  const isCapsuleCreate = mode === 'create' && createKind === 'capsule'
  const defaults = defaultFutureLocalParts(30)

  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [friendQuery, setFriendQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedFriends, setSelectedFriends] = useState([])
  const [isFriendMenuOpen, setIsFriendMenuOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [unlockDate, setUnlockDate] = useState(defaults.date)
  const [unlockTime, setUnlockTime] = useState(defaults.time)
  const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false)
  const [pendingDraft, setPendingDraft] = useState(null)

  function cancelFriendSearch() {
    if (friendSearchAbortRef.current) {
      friendSearchAbortRef.current.abort()
      friendSearchAbortRef.current = null
    }

    setIsSearching(false)
  }

  function resetFriendSearchState() {
    cancelFriendSearch()
    setFriendQuery('')
    setSearchResults([])
    setIsFriendMenuOpen(false)
    setHasCompletedSearch(false)
  }

  useEffect(() => {
    if (!open) {
      cancelFriendSearch()
      return
    }

    setForm({
      title: initialDraft?.title ?? '',
      content: initialDraft?.content ?? '',
      visibility: 'private',
    })
    setImageFile(null)
    setImagePreviewUrl('')
    setSelectedFriends([])
    resetFriendSearchState()
    setError('')
    setIsSaving(false)
    const nextDefaults = defaultFutureLocalParts(30)
    setUnlockDate(nextDefaults.date)
    setUnlockTime(nextDefaults.time)
    setIsLockConfirmOpen(false)
    setPendingDraft(null)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      cancelFriendSearch()
    }
    // Snapshot initialDraft only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsFriendMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!open || form.visibility !== 'friends') {
      cancelFriendSearch()
      setSearchResults([])
      setHasCompletedSearch(false)
      setIsSearching(false)
      return
    }

    const normalizedQuery = friendQuery.trim()

    if (normalizedQuery.length < FRIEND_SEARCH_MIN_CHARS) {
      cancelFriendSearch()
      setSearchResults([])
      setHasCompletedSearch(false)
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    friendSearchAbortRef.current = controller
    setIsSearching(true)

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchFriends(normalizedQuery, {
          signal: controller.signal,
          friendsOnly: true,
        })

        if (controller.signal.aborted) {
          return
        }

        setSearchResults(results)
        setHasCompletedSearch(true)
        setIsFriendMenuOpen(true)
      } catch (searchError) {
        if (searchError?.name === 'AbortError') {
          return
        }

        if (!controller.signal.aborted) {
          setSearchResults([])
          setHasCompletedSearch(true)
          setError('Unable to search friends. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, FRIEND_SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [friendQuery, form.visibility, open])

  if (!open) {
    return null
  }

  function handleVisibilityChange(visibility) {
    setForm((current) => ({ ...current, visibility }))
    setError('')

    if (visibility === 'private') {
      // Clear recipients so a later Private save cannot include stale IDs.
      setSelectedFriends([])
      resetFriendSearchState()
    }
  }

  function handleTitleChange(event) {
    const nextTitle = event.target.value.slice(0, JOURNAL_TITLE_MAX_LENGTH)
    setForm((current) => ({ ...current, title: nextTitle }))
    setError('')
  }

  function handleContentChange(nextContent) {
    setForm((current) => ({ ...current, content: nextContent }))
    setError('')
  }

  function handleImagePick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const imageError = validateJournalImage(file, 0)
    if (imageError) {
      setError(imageError)
      return
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setError('')
  }

  function clearImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setImageFile(null)
    setImagePreviewUrl('')
  }

  function selectFriend(friend) {
    setSelectedFriends((current) => {
      if (current.some((item) => item.id === friend.id)) {
        return current
      }

      return [...current, friend]
    })
    setFriendQuery('')
    setSearchResults([])
    setHasCompletedSearch(false)
    setIsFriendMenuOpen(false)
    setError('')
  }

  function removeFriend(friendId) {
    setSelectedFriends((current) =>
      current.filter((friend) => friend.id !== friendId),
    )
  }

  async function persistDraft(draft) {
    setIsSaving(true)
    setError('')

    const isPrivate = draft.visibility === 'private'
    const toastId = showToast({
      status: 'loading',
      message:
        mode === 'edit'
          ? 'Encrypting and updating your journal…'
          : isCapsuleCreate
            ? 'Encrypting…'
            : 'Encrypting and saving your journal…',
      persistent: true,
    })

    try {
      await onSave?.({
        title: draft.title,
        content: draft.content,
        visibility: draft.visibility,
        imageFile: draft.imageFile,
        sharedWith: isPrivate ? [] : draft.sharedWith,
        journalType: draft.journalType,
        unlockAt: draft.unlockAt,
      })

      updateToast(toastId, {
        status: 'success',
        message:
          mode === 'edit'
            ? 'Journal updated securely.'
            : isCapsuleCreate
              ? 'Time capsule encrypted and locked.'
              : 'Encrypted and saved securely.',
        persistent: false,
        duration: 3500,
      })

      setIsLockConfirmOpen(false)
      setPendingDraft(null)
      onClose()
    } catch (saveError) {
      if (import.meta.env.DEV) {
        console.error('Journal save failed', saveError)
      }

      updateToast(toastId, {
        status: 'error',
        message: isCapsuleCreate
          ? "Couldn't lock your time capsule. Please try again."
          : "Couldn't save your journal. Please try again.",
        persistent: false,
        duration: 4500,
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSaving) {
      return
    }

    const visibility = form.visibility
    const friends = visibility === 'private' ? [] : selectedFriends

    const validationError = validateJournalDraft({
      title: form.title,
      content: form.content,
      visibility,
      selectedFriends: friends,
      imageFile,
    })

    if (validationError) {
      setError(validationError)
      return
    }

    let unlockAt = null

    if (isCapsuleCreate) {
      unlockAt = localDateTimeToIso(unlockDate, unlockTime)

      if (!unlockAt) {
        setError('Choose a valid unlock date and time.')
        return
      }

      if (new Date(unlockAt).getTime() <= getServerNowMs()) {
        setError('Unlock time must be in the future.')
        return
      }
    }

    const draft = {
      title: form.title.trim(),
      content: form.content.trim(),
      visibility,
      imageFile,
      sharedWith: friends,
      journalType: isCapsuleCreate ? 'T_CAPSULE' : 'JOURNAL',
      unlockAt,
    }

    if (isCapsuleCreate) {
      setPendingDraft(draft)
      setIsLockConfirmOpen(true)
      return
    }

    await persistDraft(draft)
  }

  async function handleConfirmLockCapsule() {
    if (!pendingDraft || isSaving) {
      return
    }

    if (
      !pendingDraft.unlockAt ||
      new Date(pendingDraft.unlockAt).getTime() <= getServerNowMs()
    ) {
      setIsLockConfirmOpen(false)
      setPendingDraft(null)
      setError(
        'Unlock time must still be in the future. Choose a later time and try again.',
      )
      return
    }

    await persistDraft(pendingDraft)
  }

  const isPrivate = form.visibility === 'private'
  const titleLength = form.title.length
  const imageCount = imageFile ? 1 : 0
  const showFriendDropdown =
    !isPrivate &&
    isFriendMenuOpen &&
    (isSearching || hasCompletedSearch) &&
    friendQuery.trim().length >= FRIEND_SEARCH_MIN_CHARS
  const acceptImageTypes = ALLOWED_JOURNAL_IMAGE_MIME_TYPES.join(',')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6"
      role="presentation"
      onClick={() => {
        if (!isSaving) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(920px,calc(100dvh-2rem))] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-card)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-ink">
              {mode === 'edit'
                ? 'Edit Journal'
                : isCapsuleCreate
                  ? 'New Time Capsule'
                  : 'New Journal'}
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
              <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
              End-to-end encrypted
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-lg p-1.5 text-muted transition hover:bg-page hover:text-ink"
            aria-label="Close"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div>
              <label htmlFor="journal-title" className="sr-only">
                Journal title
              </label>
              <input
                id="journal-title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleTitleChange}
                maxLength={JOURNAL_TITLE_MAX_LENGTH}
                placeholder="Journal title"
                disabled={isSaving}
                className="w-full border-0 border-b border-border bg-transparent pb-3 text-2xl font-bold tracking-tight text-ink placeholder:font-semibold placeholder:text-slate-400 focus:border-brand focus:outline-none"
              />
              <p className="mt-1.5 text-right text-[11px] text-muted">
                {titleLength} / {JOURNAL_TITLE_MAX_LENGTH}
              </p>
            </div>

            <JournalEditor
              value={form.content}
              onChange={handleContentChange}
              disabled={isSaving}
            />

            <div className="mt-4 border-t border-border pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptImageTypes}
                className="hidden"
                onChange={handleImagePick}
              />

              {imagePreviewUrl ? (
                <div className="group relative w-full max-w-md overflow-hidden rounded-xl border border-border">
                  <img
                    src={imagePreviewUrl}
                    alt="Selected journal attachment"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      className="cursor-pointer rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={clearImage}
                      disabled={isSaving}
                      className="cursor-pointer rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-danger shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-muted transition hover:border-brand hover:text-brand"
                >
                  <ImageIcon size={16} strokeWidth={1.75} aria-hidden="true" />
                  Add image
                </button>
              )}
              <p className="mt-2 text-xs text-muted">
                {imageCount > 0
                  ? `${imageCount} / ${MAX_JOURNAL_IMAGES} image attached`
                  : '1 image maximum'}
              </p>
            </div>

            {isCapsuleCreate ? (
              <div className="mt-5 rounded-2xl border border-border bg-page px-4 py-4">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Clock3 size={16} strokeWidth={2} aria-hidden="true" />
                  Unlock date & time
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Once saved, this capsule cannot be opened until the selected
                  time.
                </p>
                <p className="mt-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">
                  <span className="font-semibold text-ink">Sharing tip: </span>
                  Choose friends below before you lock. After sealing, you
                  can&apos;t add anyone else until the capsule unlocks.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-muted">
                    Date
                    <input
                      type="date"
                      value={unlockDate}
                      onChange={(event) => {
                        setUnlockDate(event.target.value)
                        setError('')
                      }}
                      disabled={isSaving}
                      className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-ink ${
                        error ? 'border-danger' : 'border-border'
                      }`}
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    Time
                    <input
                      type="time"
                      value={unlockTime}
                      onChange={(event) => {
                        setUnlockTime(event.target.value)
                        setError('')
                      }}
                      disabled={isSaving}
                      className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-ink ${
                        error ? 'border-danger' : 'border-border'
                      }`}
                    />
                  </label>
                </div>
                {error ? (
                  <p
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm font-semibold text-ink">Who can see this?</p>
              {isCapsuleCreate ? (
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Friends you select get sealed access now and can open it when
                  the unlock time arrives. You won&apos;t be able to invite more
                  people after locking.
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleVisibilityChange('private')}
                  disabled={isSaving}
                  className={`relative cursor-pointer rounded-2xl border p-4 text-left transition ${
                    isPrivate
                      ? 'border-brand bg-brand-soft'
                      : 'border-border bg-surface hover:bg-page'
                  }`}
                >
                  {isPrivate ? (
                    <CheckCircle2
                      size={18}
                      strokeWidth={2}
                      className="absolute top-3 right-3 text-brand"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Lock
                    size={18}
                    strokeWidth={1.75}
                    className={isPrivate ? 'text-brand' : 'text-muted'}
                    aria-hidden="true"
                  />
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      isPrivate ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    Private
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Only you can access this.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleVisibilityChange('friends')}
                  disabled={isSaving}
                  className={`relative cursor-pointer rounded-2xl border p-4 text-left transition ${
                    !isPrivate
                      ? 'border-brand bg-brand-soft'
                      : 'border-border bg-surface hover:bg-page'
                  }`}
                >
                  {!isPrivate ? (
                    <CheckCircle2
                      size={18}
                      strokeWidth={2}
                      className="absolute top-3 right-3 text-brand"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Users
                    size={18}
                    strokeWidth={1.75}
                    className={!isPrivate ? 'text-brand' : 'text-muted'}
                    aria-hidden="true"
                  />
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      !isPrivate ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    Share with friends
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {isCapsuleCreate
                      ? 'They unlock with you at the chosen time.'
                      : 'Select specific people.'}
                  </p>
                </button>
              </div>

              {!isPrivate ? (
                <div className="mt-4 space-y-3">
                  <div ref={searchContainerRef} className="relative">
                    <label htmlFor="friend-search" className="sr-only">
                      Search friends
                    </label>
                    <div className="relative">
                      <Search
                        size={16}
                        strokeWidth={2}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                        aria-hidden="true"
                      />
                      <input
                        id="friend-search"
                        type="text"
                        value={friendQuery}
                        disabled={isSaving}
                        placeholder="Search friends by username"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={showFriendDropdown}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        onFocus={() => {
                          if (
                            hasCompletedSearch &&
                            friendQuery.trim().length >= FRIEND_SEARCH_MIN_CHARS
                          ) {
                            setIsFriendMenuOpen(true)
                          }
                        }}
                        onChange={(event) => {
                          setFriendQuery(event.target.value)
                          setError('')
                        }}
                        className="w-full rounded-xl border border-border bg-white py-2.5 pr-3 pl-10 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    {showFriendDropdown ? (
                      <ul
                        id={listboxId}
                        role="listbox"
                        className="absolute z-10 mt-2 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-card)]"
                      >
                        {isSearching ? (
                          <li className="px-3 py-2.5 text-sm text-muted">
                            Searching…
                          </li>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((friend) => {
                            const alreadySelected = selectedFriends.some(
                              (item) => item.id === friend.id,
                            )

                            return (
                              <li key={friend.id} role="option">
                                <button
                                  type="button"
                                  disabled={alreadySelected}
                                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-brand-soft disabled:cursor-default disabled:opacity-50"
                                  onClick={() => selectFriend(friend)}
                                >
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-page text-xs font-semibold text-brand">
                                    {getInitials(friend.username)}
                                  </span>
                                  <span className="font-medium text-ink">
                                    {friend.username}
                                  </span>
                                  {alreadySelected ? (
                                    <span className="ml-auto text-xs text-muted">
                                      Selected
                                    </span>
                                  ) : null}
                                </button>
                              </li>
                            )
                          })
                        ) : (
                          <li className="px-3 py-2.5 text-sm text-muted">
                            No friends found
                          </li>
                        )}
                      </ul>
                    ) : null}
                  </div>

                  {selectedFriends.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                        Selected
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {selectedFriends.map((friend) => (
                          <li
                            key={friend.id}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-page py-1 pr-1.5 pl-1.5"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                              {getInitials(friend.username)}
                            </span>
                            <span className="text-sm font-medium text-ink">
                              {friend.username}
                            </span>
                            <button
                              type="button"
                              className="cursor-pointer rounded-full p-1 text-muted transition hover:bg-surface hover:text-danger"
                              aria-label={`Remove ${friend.username}`}
                              onClick={() => removeFriend(friend.id)}
                              disabled={isSaving}
                            >
                              <X size={12} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      Type at least {FRIEND_SEARCH_MIN_CHARS} characters to search
                      friends.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {error && !isCapsuleCreate ? (
              <p className="mt-4 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-border px-6 py-4">
            {error && isCapsuleCreate ? (
              <p
                className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-brand-soft/70 px-3 py-2.5">
              <ShieldCheck
                size={16}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-brand"
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-slate-600">
                {isCapsuleCreate
                  ? `Your capsule is encrypted on this device before it leaves your browser. Unsend cannot read it — and neither can anyone until the unlock time.${
                      isPrivate ? '' : ' Selected friends receive sealed access now.'
                    }`
                  : `Your journal is encrypted on this device before it leaves your browser. Unsend cannot read your title, writing, or images — only you${
                      isPrivate
                        ? ' hold the keys.'
                        : ' and the friends you choose can unlock them.'
                    }`}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
                {isCapsuleCreate
                  ? 'Time Capsule • Encrypted'
                  : `${isPrivate ? 'Private' : 'Friends'} • Encrypted${!isPrivate && selectedFriends.length > 0 ? ` • ${selectedFriends.length} selected` : ''}`}
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-60"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  size="sm"
                  className="w-auto cursor-pointer"
                  disabled={isSaving}
                >
                  {isSaving
                    ? mode === 'edit'
                      ? 'Updating…'
                      : isCapsuleCreate
                        ? 'Encrypting…'
                        : 'Saving…'
                    : mode === 'edit'
                      ? 'Save Changes'
                      : isCapsuleCreate
                        ? 'Lock Capsule'
                        : 'Save Journal'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={isLockConfirmOpen}
        title="Lock this time capsule?"
        description={
          pendingDraft?.unlockAt
            ? [
                `You won't be able to open or read this capsule until ${formatUnlockDateTime(pendingDraft.unlockAt)}.`,
                pendingDraft.sharedWith?.length
                  ? `It will be shared with ${pendingDraft.sharedWith.length} friend${pendingDraft.sharedWith.length === 1 ? '' : 's'} — they also wait until unlock.`
                  : 'After locking, you cannot add more friends until it unlocks.',
              ].join(' ')
            : 'You will not be able to open this capsule until the unlock time. After locking, you cannot add more friends until it unlocks.'
        }
        confirmLabel="Lock Capsule"
        cancelLabel="Cancel"
        confirmingLabel="Encrypting…"
        isConfirming={isSaving}
        onConfirm={handleConfirmLockCapsule}
        onClose={() => {
          if (!isSaving) {
            setIsLockConfirmOpen(false)
            setPendingDraft(null)
          }
        }}
      />
    </div>
  )
}

export default CreateJournalModal
