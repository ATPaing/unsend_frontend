import { Link } from 'react-router-dom'
import BrandMark from '../components/common/BrandMark.jsx'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import RegisterForm from '../features/auth/RegisterForm.jsx'

function RegisterPage() {
  return (
    <AuthLayout variant="register">
      <BrandMark taglineCase="title" className="mb-4" />

      <section className="w-full rounded-2xl bg-surface px-7 py-6 shadow-[var(--shadow-card)]">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Register</h1>
          <p className="mt-1 text-sm text-muted">
            Secure your thoughts with zero-knowledge encryption.
          </p>
        </header>

        <RegisterForm />

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand transition hover:text-brand-hover hover:underline"
          >
            Login
          </Link>
        </p>
      </section>
    </AuthLayout>
  )
}

export default RegisterPage
