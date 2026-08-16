import { useState } from 'react'
import { KeyRound, Lock, RefreshCw, Shield, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AlertNote from '../../components/ui/AlertNote.jsx'
import Button from '../../components/ui/Button.jsx'
import FormError from '../../components/ui/FormError.jsx'
import FormInput from '../../components/ui/FormInput.jsx'
import { ApiError } from '../../services/api.js'
import { buildSignupCrypto } from '../../utils/crypto/buildSignupCrypto.js'
import { validateRegister } from '../../utils/formValidation.js'
import { useVault } from '../vault/useVault.js'
import { useAuth } from './useAuth.js'

const EMPTY_FORM = {
  username: '',
  password: '',
  confirmPassword: '',
  pin: '',
  confirmPin: '',
}

function RegisterForm() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const { activateWithPrivateKey } = useVault()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  function handlePinChange(event) {
    const { name, value } = event.target
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6)
    setForm((current) => ({ ...current, [name]: digitsOnly }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = validateRegister(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    const username = form.username
    const password = form.password
    const pin = form.pin

    try {
      const { crypto, privateKey } = await buildSignupCrypto(pin)
      await signup(username, password, crypto)
      activateWithPrivateKey(privateKey, crypto)
      setForm(EMPTY_FORM)
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError(error.message || 'Username is already taken')
      } else if (error instanceof ApiError && error.status === 400) {
        setFormError(error.message || 'Invalid registration details')
      } else {
        setFormError(error.message || 'Unable to create account. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-5 flex flex-col gap-3.5" onSubmit={handleSubmit} noValidate>
      <FormError message={formError} />

      <FormInput
        id="username"
        name="username"
        label="Username"
        icon={User}
        type="text"
        autoComplete="username"
        placeholder="Choose a unique name"
        value={form.username}
        onChange={handleChange}
        error={errors.username}
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FormInput
          id="password"
          name="password"
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isSubmitting}
        />
        <FormInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          icon={RefreshCw}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FormInput
          id="pin"
          name="pin"
          label="Security PIN"
          icon={KeyRound}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="6-digit PIN"
          maxLength={6}
          value={form.pin}
          onChange={handlePinChange}
          error={errors.pin}
          disabled={isSubmitting}
        />
        <FormInput
          id="confirmPin"
          name="confirmPin"
          label="Confirm PIN"
          icon={Shield}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="6-digit PIN"
          maxLength={6}
          value={form.confirmPin}
          onChange={handlePinChange}
          error={errors.confirmPin}
          disabled={isSubmitting}
        />
      </div>

      <AlertNote title="Security Note:">
        Your PIN encrypts your private key. If you forget your PIN, your encrypted
        journals cannot be recovered.
      </AlertNote>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating secure account…' : 'Create Secure Account'}
      </Button>
    </form>
  )
}

export default RegisterForm
