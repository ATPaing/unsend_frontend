import { apiRequest } from '../../services/api.js'

export async function searchUsers(query, { signal } = {}) {
  const params = new URLSearchParams()
  params.set('q', String(query ?? ''))

  const response = await apiRequest(`/friends/search?${params.toString()}`, {
    method: 'GET',
    signal,
  })

  return response.data.users
}

export async function sendFriendRequest(userId) {
  const response = await apiRequest(`/friends/requests/${userId}`, {
    method: 'POST',
  })

  return response.data.request
}

export async function listIncomingRequests() {
  const response = await apiRequest('/friends/requests/incoming', {
    method: 'GET',
  })

  return response.data.requests
}

export async function listOutgoingRequests() {
  const response = await apiRequest('/friends/requests/outgoing', {
    method: 'GET',
  })

  return response.data.requests
}

export async function acceptFriendRequest(requestId) {
  const response = await apiRequest(`/friends/requests/${requestId}/accept`, {
    method: 'POST',
  })

  return response.data.friendship
}

export async function deleteFriendRequest(requestId) {
  const response = await apiRequest(`/friends/requests/${requestId}`, {
    method: 'DELETE',
  })

  return response.data.request
}

export async function listFriends() {
  const response = await apiRequest('/friends', {
    method: 'GET',
  })

  return response.data.friends
}

export async function removeFriend(friendId) {
  const response = await apiRequest(`/friends/${friendId}`, {
    method: 'DELETE',
  })

  return response.data.friendship
}

export async function getFriendPublicKey(friendId) {
  const response = await apiRequest(`/friends/${friendId}/public-key`, {
    method: 'GET',
  })

  return response.data.user
}
