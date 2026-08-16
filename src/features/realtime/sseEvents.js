export const FRIEND_SSE_EVENTS = [
  'friend.requested',
  'friend.accepted',
  'friend.declined',
  'friend.request.cancelled',
  'friend.removed',
]

export const JOURNAL_SSE_EVENTS = [
  'journal.shared',
  'journal.unshared',
  'journal.unlock-at.updated',
]

export const SSE_EVENTS = [...FRIEND_SSE_EVENTS, ...JOURNAL_SSE_EVENTS]

/** Fired locally when the EventSource connects or reconnects. */
export const REALTIME_RECONNECTED = 'realtime.reconnected'
