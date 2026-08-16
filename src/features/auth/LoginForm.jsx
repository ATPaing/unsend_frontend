import { useState } from 'react'
import { Lock, LogIn, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import FormError from '../../components/ui/FormError.jsx'
import FormInput from '../../components/ui/FormInput.jsx'
import { ApiError } from '../../services/api.js'
import { validateLogin } from '../../utils/formValidation.js'
import { useAuth } from './useAuth.js'

function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    username: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = validateLogin(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await login(form.username, form.password)
      setForm({ username: '', password: '' })
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setFormError(error.message || 'Invalid username or password')
      } else {
        setFormError(error.message || 'Unable to log in. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <FormError message={formError} />

      <FormInput
        id="username"
        name="username"
        label="Username"
        icon={User}
        type="text"
        autoComplete="username"
        placeholder="Enter your username"
        value={form.username}
        onChange={handleChange}
        error={errors.username}
        disabled={isSubmitting}
      />

      <FormInput
        id="password"
        name="password"
        label="Password"
        icon={Lock}
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={form.password}
        onChange={handleChange}
        error={errors.password}
        disabled={isSubmitting}
        labelAction={
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand transition hover:text-brand-hover hover:underline"
          >
            Forgot Password?
          </Link>
        }
      />

      <Button type="submit" className="mt-1" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in…' : 'Login'}
        {!isSubmitting && <LogIn size={16} strokeWidth={2} aria-hidden="true" />}
      </Button>
    </form>
  )
}

export default LoginForm
