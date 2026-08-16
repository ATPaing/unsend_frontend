import * as friendService from './friendService.js'

/**
 * Abortable username search against GET /friends/search.
 * Pass `{ friendsOnly: true }` to return only current friends
 * (used by journal share UI until dedicated sharing lands).
 */
export async function searchFriends(
  query,
  { signal, friendsOnly = false } = {},
) {
  const normalized = String(query ?? '').trim()

  if (normalized.length < 2) {
    return []
  }

  const users = await friendService.searchUsers(normalized, { signal })

  if (!friendsOnly) {
    return users
  }

  return users
    .filter((user) => user.relationship === 'FRIEND')
    .map((user) => ({
      id: user.id,
      username: user.username,
    }))
}
