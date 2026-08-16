import { noteServerTime } from '../features/time/serverClock.js'

export class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiRequest(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }

  const { headers, body, ...rest } = options
  const clientSentAt = Date.now()

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  let payload = null
  const text = await response.text()
  const clientReceivedAt = Date.now()

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  const serverNow = payload?.data?.serverNow
  if (typeof serverNow === 'string') {
    noteServerTime(serverNow, clientSentAt, clientReceivedAt)
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || 'Request failed',
      response.status,
      payload,
    )
  }

  return payload
}
