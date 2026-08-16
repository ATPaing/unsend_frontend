export function bytesToBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < view.length; i += chunkSize) {
    const chunk = view.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export function base64ToBytes(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Base64 value is required')
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + padding)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

export function zeroize(bytes) {
  if (bytes instanceof Uint8Array) {
    bytes.fill(0)
  }
}
