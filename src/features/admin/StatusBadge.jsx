const TONE_STYLES = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  bad: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  warn: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
  muted: 'border-border bg-page text-muted',
}

function StatusBadge({ tone = 'muted', label, detail }) {
  const style = TONE_STYLES[tone] ?? TONE_STYLES.muted

  return (
    <span
      className={`inline-flex max-w-full flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1 text-left ${style}`}
    >
      <span className="text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      {detail ? (
        <span className="text-[11px] font-medium normal-case opacity-90">
          {detail}
        </span>
      ) : null}
    </span>
  )
}

export default StatusBadge
