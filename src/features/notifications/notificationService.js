import { apiRequest } from '../../services/api.js'

export async function listNotifications({ limit } = {}) {
  const params = new URLSearchParams()

  if (limit !== undefined) {
    params.set('limit', String(limit))
  }

  const query = params.toString()
  const path = query ? `/notifications?${query}` : '/notifications'

  const response = await apiRequest(path, {
    method: 'GET',
  })

  return response.data.notifications
}

export async function getUnreadCount() {
  const response = await apiRequest('/notifications/unread-count', {
    method: 'GET',
  })

  return response.data.unreadCount
}

export async function markNotificationRead(notificationId) {
  const response = await apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })

  return response.data.notification
}

export async function markAllNotificationsRead() {
  const response = await apiRequest('/notifications/read-all', {
    method: 'POST',
  })

  return response.data
}
