import { apiRequest } from '../../services/api.js'

export async function updateCryptoMaterial(payload) {
  const response = await apiRequest('/users/me/crypto', {
    method: 'PATCH',
    body: payload,
  })

  return response.data
}

export async function changePassword(currentPassword, newPassword) {
  const response = await apiRequest('/users/me/password', {
    method: 'PATCH',
    body: {
      currentPassword,
      newPassword,
    },
  })

  return response.data
}

export async function deleteAccount(password) {
  const response = await apiRequest('/users/me', {
    method: 'DELETE',
    body: { password },
  })

  return response.data
}
