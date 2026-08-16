import { apiRequest } from '../../services/api.js'

export async function createJournal(payload) {
  const response = await apiRequest('/journals', {
    method: 'POST',
    body: payload,
  })

  return response.data.journal
}

export async function listJournals() {
  const response = await apiRequest('/journals', {
    method: 'GET',
  })

  return response.data.journals
}

export async function listSharedWithMe() {
  const response = await apiRequest('/journals/shared-with-me', {
    method: 'GET',
  })

  return response.data.journals
}

export async function getJournal(journalId) {
  const response = await apiRequest(`/journals/${journalId}`, {
    method: 'GET',
  })

  return response.data.journal
}

export async function updateJournal(journalId, payload) {
  const response = await apiRequest(`/journals/${journalId}`, {
    method: 'PATCH',
    body: payload,
  })

  return response.data.journal
}

export async function deleteJournal(journalId) {
  const response = await apiRequest(`/journals/${journalId}`, {
    method: 'DELETE',
  })

  return response.data.journal
}

export async function shareJournal(journalId, payload) {
  const response = await apiRequest(`/journals/${journalId}/share`, {
    method: 'POST',
    body: payload,
  })

  return response.data.share
}

export async function revokeJournalShare(journalId, userId) {
  const response = await apiRequest(`/journals/${journalId}/share/${userId}`, {
    method: 'DELETE',
  })

  return response.data.share
}

export async function updateJournalUnlockAt(journalId, unlockAt) {
  const response = await apiRequest(`/journals/${journalId}/unlock-at`, {
    method: 'PATCH',
    body: { unlockAt },
  })

  return response.data.journal
}
