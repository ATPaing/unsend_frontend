function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-sm',
  }

  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-hover',
    outline:
      'border border-border bg-surface text-ink hover:bg-page hover:border-slate-300',
    ghost: 'bg-transparent text-ink hover:bg-page',
  }

  const width = className.includes('w-') ? '' : 'w-full'

  return (
    <button
      type={type}
      className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
