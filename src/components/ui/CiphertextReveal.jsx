import { useEffect, useState } from 'react'

/**
 * Renders ciphertext while locked, then fades to plaintext when revealed.
 * Optional blur matches the locked dashboard card treatment.
 */
function CiphertextReveal({
  ciphertext,
  plaintext,
  revealed = false,
  blurWhenLocked = false,
  className = '',
  as: Component = 'span',
}) {
  const lockedText = ciphertext ?? ''
  const targetText =
    revealed && plaintext != null && plaintext !== '' ? plaintext : lockedText
  const [displayText, setDisplayText] = useState(targetText)
  const [opaque, setOpaque] = useState(true)
  const showBlur = blurWhenLocked && !revealed

  useEffect(() => {
    if (targetText === displayText) {
      setOpaque(true)
      return
    }

    setOpaque(false)
    const timer = window.setTimeout(() => {
      setDisplayText(targetText)
      setOpaque(true)
    }, 160)

    return () => window.clearTimeout(timer)
  }, [targetText, displayText])

  return (
    <Component
      className={`min-w-0 max-w-full break-words [overflow-wrap:anywhere] transition-all duration-150 ease-out ${
        opaque ? 'opacity-100' : 'opacity-0'
      } ${showBlur ? 'blur-[3px] select-none' : 'blur-0'} ${className}`}
    >
      {displayText}
    </Component>
  )
}

export default CiphertextReveal
