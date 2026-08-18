import { Info } from 'lucide-react'

function AlertNote({ title, children, compact = false }) {
  return (
    <aside
      className={`flex gap-2.5 rounded-xl border-l-4 border-note-border bg-note text-ink ${
        compact ? 'px-3 py-2 text-xs leading-relaxed' : 'px-4 py-3 text-sm'
      }`}
      role="note"
    >
      <Info
        size={compact ? 15 : 18}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-brand"
        aria-hidden="true"
      />
      <p>
        {title ? <strong className="font-semibold text-ink">{title}</strong> : null}
        {title ? ' ' : null}
        {children}
      </p>
    </aside>
  )
}

export default AlertNote
