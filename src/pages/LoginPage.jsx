import { Link } from 'react-router-dom'
import BrandMark from '../components/common/BrandMark.jsx'
import SecurityBadges from '../components/common/SecurityBadges.jsx'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import LoginForm from '../features/auth/LoginForm.jsx'

function LoginPage() {
  return (
    <AuthLayout
      footer={
        <div className="flex flex-col items-center gap-8">
          <p className="text-center text-sm text-muted">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand transition hover:text-brand-hover hover:underline"
            >
              Register
            </Link>
          </p>
          <SecurityBadges />
        </div>
      }
    >
      <section className="w-full rounded-2xl bg-surface p-8 shadow-[var(--shadow-card)]">
        <BrandMark showIcon taglineCase="upper" />

        <header className="mt-8 text-center">
          <h1 className="text-xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">
            Your private space is waiting for you.
          </p>
        </header>

        <LoginForm />
      </section>
    </AuthLayout>
  )
}

export default LoginPage
