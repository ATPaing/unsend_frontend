function MetricBar({
  label,
  percent,
  detail,
  waiting = false,
  waitingLabel = 'Collecting…',
}) {
  const hasPercent =
    !waiting && typeof percent === 'number' && Number.isFinite(percent)
  const clamped = hasPercent ? Math.min(100, Math.max(0, percent)) : 0

  let barColor = 'bg-brand'
  if (hasPercent && clamped >= 90) barColor = 'bg-danger'
  else if (hasPercent && clamped >= 75) barColor = 'bg-amber-500'

  return (
    <div className="rounded-xl border border-border bg-page/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-ink">
          {waiting ? waitingLabel : hasPercent ? `${clamped.toFixed(1)}%` : '—'}
        </p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-border/80"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasPercent ? Math.round(clamped) : undefined}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barColor} ${
            waiting ? 'w-1/5 animate-pulse opacity-50' : ''
          }`}
          style={waiting ? undefined : { width: `${clamped}%` }}
        />
      </div>
      {detail ? <p className="mt-2 text-xs text-muted">{detail}</p> : null}
    </div>
  )
}

export default MetricBar
