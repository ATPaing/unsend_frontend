import { Shield, ShieldCheck } from 'lucide-react'

function SecurityBadges() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
      <li className="flex items-center gap-1.5">
        <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>E2E Encrypted</span>
      </li>
      <li className="flex items-center gap-1.5">
        <Shield size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>No-Logs Policy</span>
      </li>
    </ul>
  )
}

export default SecurityBadges
