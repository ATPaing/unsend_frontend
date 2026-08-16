import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '../../services/api.js'
import { base64ToBytes, zeroize } from '../../utils/crypto/base64.js'
import { CRYPTO_VERSION } from '../../utils/crypto/constants.js'
import { deriveKeyFromPin } from '../../utils/crypto/deriveKey.js'
import { unlockPrivateKey } from '../../utils/crypto/decryptPrivateKey.js'
import { getCrypto } from '../auth/authService.js'
import { useAuth } from '../auth/useAuth.js'
import { usePreferences } from '../preferences/usePreferences.js'
import { useToast } from '../toast/ToastContext.jsx'

export const VaultContext = createContext(null)

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart']

export function VaultProvider({ children }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { preferences } = usePreferences()
  const { showToast } = useToast()
  const location = useLocation()
  const [cryptoMaterial, setCryptoMaterial] = useState(null)
  const [privateKey, setPrivateKey] = useState(null)
  const [decryptedCache, setDecryptedCache] = useState(() => new Map())
  const lastActivityRef = useRef(Date.now())
  const autoLockTimerRef = useRef(null)
  const privateKeyRef = useRef(null)

  useEffect(() => {
    privateKeyRef.current = privateKey
  }, [privateKey])

  const clearVault = useCallback(() => {
    setPrivateKey(null)
    setCryptoMaterial(null)
    setDecryptedCache(new Map())
  }, [])

  const lock = useCallback(() => {
    setPrivateKey(null)
    setDecryptedCache(new Map())
  }, [])

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      clearVault()
    }
  }, [isAuthenticated, isAuthLoading, clearVault])

  useEffect(() => {
    bumpActivity()
  }, [location.pathname, bumpActivity])

  useEffect(() => {
    if (!isAuthenticated || privateKey == null) {
      if (autoLockTimerRef.current) {
        window.clearInterval(autoLockTimerRef.current)
        autoLockTimerRef.current = null
      }
      return undefined
    }

    const minutes = preferences.autoLockMinutes
    if (minutes == null) {
      if (autoLockTimerRef.current) {
        window.clearInterval(autoLockTimerRef.current)
        autoLockTimerRef.current = null
      }
      return undefined
    }

    const timeoutMs = minutes * 60_000
    bumpActivity()

    function onActivity() {
      lastActivityRef.current = Date.now()
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }

    autoLockTimerRef.current = window.setInterval(() => {
      if (!privateKeyRef.current) {
        return
      }

      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        lock()
        showToast({
          message: 'Vault locked after inactivity.',
          status: 'info',
          duration: 3500,
        })
      }
    }, 15_000)

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity)
      }
      if (autoLockTimerRef.current) {
        window.clearInterval(autoLockTimerRef.current)
        autoLockTimerRef.current = null
      }
    }
  }, [
    isAuthenticated,
    privateKey,
    preferences.autoLockMinutes,
    lock,
    showToast,
    bumpActivity,
  ])

  const loadCryptoMaterial = useCallback(async () => {
    const material = await getCrypto()
    setCryptoMaterial(material)
    return material
  }, [])

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || cryptoMaterial) {
      return
    }

    let cancelled = false

    async function prefetchCrypto() {
      try {
        const material = await getCrypto()
        if (!cancelled) {
          setCryptoMaterial(material)
        }
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Failed to load crypto material')
        }
      }
    }

    prefetchCrypto()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isAuthLoading, cryptoMaterial])

  const ensureCryptoMaterial = useCallback(async () => {
    if (cryptoMaterial) {
      return cryptoMaterial
    }

    return loadCryptoMaterial()
  }, [cryptoMaterial, loadCryptoMaterial])

  const unlock = useCallback(
    async (pin) => {
      const material = await ensureCryptoMaterial()

      if (material.cryptoVersion !== CRYPTO_VERSION) {
        throw new Error('Unsupported crypto version')
      }

      let salt = null
      let nonce = null
      let encryptedPrivateKeyBytes = null
      let derivedKeyBytes = null

      try {
        salt = base64ToBytes(material.derivedKeySalt)
        nonce = base64ToBytes(material.privateKeyNonce)
        encryptedPrivateKeyBytes = base64ToBytes(material.encryptedPrivateKey)
        derivedKeyBytes = await deriveKeyFromPin(pin, salt)

        const importedPrivateKey = await unlockPrivateKey({
          encryptedPrivateKeyBytes,
          derivedKeyBytes,
          nonce,
        })

        bumpActivity()
        setPrivateKey(importedPrivateKey)
        return importedPrivateKey
      } finally {
        zeroize(salt)
        zeroize(nonce)
        zeroize(encryptedPrivateKeyBytes)
        zeroize(derivedKeyBytes)
      }
    },
    [ensureCryptoMaterial, bumpActivity],
  )

  const activateWithPrivateKey = useCallback((nextPrivateKey, material) => {
    if (material) {
      setCryptoMaterial(material)
    }

    bumpActivity()
    setPrivateKey(nextPrivateKey)
    setDecryptedCache(new Map())
  }, [bumpActivity])

  const replaceCryptoMaterial = useCallback((material) => {
    setCryptoMaterial(material)
  }, [])

  const setDecryptedValue = useCallback((key, value) => {
    setDecryptedCache((current) => {
      const next = new Map(current)
      next.set(key, value)
      return next
    })
  }, [])

  const clearDecryptedValue = useCallback((key) => {
    setDecryptedCache((current) => {
      if (!current.has(key)) {
        return current
      }

      const next = new Map(current)
      next.delete(key)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      cryptoMaterial,
      privateKey,
      isUnlocked: privateKey !== null,
      decryptedCache,
      unlock,
      lock,
      activateWithPrivateKey,
      replaceCryptoMaterial,
      ensureCryptoMaterial,
      setDecryptedValue,
      clearDecryptedValue,
      bumpActivity,
    }),
    [
      cryptoMaterial,
      privateKey,
      decryptedCache,
      unlock,
      lock,
      activateWithPrivateKey,
      replaceCryptoMaterial,
      ensureCryptoMaterial,
      setDecryptedValue,
      clearDecryptedValue,
      bumpActivity,
    ],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
