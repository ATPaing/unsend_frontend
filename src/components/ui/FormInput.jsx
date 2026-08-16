function FormInput({
  id,
  label,
  labelAction,
  icon: Icon,
  error,
  compact = false,
  className = '',
  ...props
}) {
  const describedBy = error ? `${id}-error` : undefined
  const iconSize = compact ? 16 : 18
  const inputPaddingY = compact ? 'py-2' : 'py-2.5'
  const labelClass = compact
    ? 'text-xs font-medium text-ink'
    : 'text-sm font-medium text-ink'

  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {label ? (
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
        ) : (
          <span />
        )}
        {labelAction}
      </div>

      <div className="relative">
        {Icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Icon size={iconSize} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : null}

        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full rounded-xl border bg-surface text-sm text-ink placeholder:text-muted transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${inputPaddingY} ${
            Icon ? 'pl-10 pr-3' : 'px-3'
          } ${error ? 'border-danger' : 'border-border'}`}
          {...props}
        />
      </div>

      {error ? (
        <p id={describedBy} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FormInput
