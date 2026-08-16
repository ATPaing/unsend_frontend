export const CRYPTO_VERSION = 1

export const RSA_MODULUS_LENGTH = 2048
export const RSA_PUBLIC_EXPONENT = new Uint8Array([1, 0, 1])
export const RSA_HASH = 'SHA-256'

export const ARGON2_MEMORY = 65536
export const ARGON2_ITERATIONS = 3
export const ARGON2_PARALLELISM = 1
export const ARGON2_DK_LEN = 32
export const ARGON2_SALT_LENGTH = 16
export const ARGON2_MAX_MEM = 2 ** 32 - 1

export const AES_GCM_NONCE_LENGTH = 12
export const AES_GCM_KEY_LENGTH = 256
