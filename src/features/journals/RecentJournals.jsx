import { ChevronRight, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import JournalCard from './JournalCard.jsx'

function RecentJournals({ journals, isUnlocked, onCapsuleExpired }) {
  return (
    <section aria-labelledby="recent-journals-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2
            id="recent-journals-heading"
            className="text-base font-semibold text-ink"
          >
            Recent Journals
          </h2>
          {!isUnlocked ? (
            <Lock
              size={14}
              strokeWidth={2}
              className="text-muted"
              aria-label="Vault locked"
            />
          ) : null}
        </div>

        <Link
          to="/journals"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-muted transition hover:text-brand"
        >
          View all
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {journals.map((journal) => (
          <div key={journal.id} className="min-w-0">
            <JournalCard
              journal={journal}
              isUnlocked={isUnlocked}
              onCapsuleExpired={onCapsuleExpired}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export default RecentJournals
