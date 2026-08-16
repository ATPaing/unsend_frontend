import { argon2idAsync } from '@noble/hashes/argon2.js'
import {
  ARGON2_DK_LEN,
  ARGON2_ITERATIONS,
  ARGON2_MAX_MEM,
  ARGON2_MEMORY,
  ARGON2_PARALLELISM,
  ARGON2_SALT_LENGTH,
} from './constants.js'

export function generateDerivedKeySalt() {
  return crypto.getRandomValues(new Uint8Array(ARGON2_SALT_LENGTH))
}

export async function deriveKeyFromPin(pin, salt) {
  const pinBytes = new TextEncoder().encode(pin)

  try {
    return await argon2idAsync(pinBytes, salt, {
      t: ARGON2_ITERATIONS,
      m: ARGON2_MEMORY,
      p: ARGON2_PARALLELISM,
      dkLen: ARGON2_DK_LEN,
      maxmem: ARGON2_MAX_MEM,
    })
  } finally {
    pinBytes.fill(0)
  }
}
