import { apiRequest } from '../../services/api.js'

export async function signup(username, password, crypto) {
  const response = await apiRequest('/auth/signup', {
    method: 'POST',
    body: {
      username,
      password,
      crypto,
    },
  })

  return response.data.user
}

export async function login(username, password) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username, password },
  })

  return response.data.user
}

export async function getSession() {
  const response = await apiRequest('/auth/session', {
    method: 'GET',
  })

  return response.data.user
}

export async function getCrypto() {
  const response = await apiRequest('/users/me/crypto', {
    method: 'GET',
  })

  return response.data
}

export async function logout() {
  await apiRequest('/auth/logout', {
    method: 'POST',
  })
}
