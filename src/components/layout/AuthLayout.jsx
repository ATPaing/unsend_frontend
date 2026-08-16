function AuthLayout({
  children,
  footer,
  variant = 'default',
  className = '',
}) {
  const background =
    variant === 'register'
      ? 'bg-[radial-gradient(ellipse_at_top,_var(--color-page-tint)_0%,_var(--color-page)_55%,_#f8f8fc_100%)]'
      : 'bg-page'

  const maxWidth = variant === 'register' ? 'max-w-[480px]' : 'max-w-[420px]'
  const padding = variant === 'register' ? 'px-4 py-6' : 'px-4 py-10'

  return (
    <div
      className={`flex min-h-dvh flex-col items-center justify-center ${padding} ${background} ${className}`}
    >
      <div className={`flex w-full ${maxWidth} flex-col items-center`}>
        {children}
        {footer ? <div className="mt-6 w-full">{footer}</div> : null}
      </div>
    </div>
  )
}

export default AuthLayout
