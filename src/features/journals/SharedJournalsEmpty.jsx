import { FilePenLine } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'

function SharedJournalsEmpty({ onStartDraft }) {
  return (
    <section aria-labelledby="empty-journals-heading">
      <h2 id="empty-journals-heading" className="sr-only">
        Start writing
      </h2>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-surface/60 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
          <FilePenLine size={22} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Nothing written yet. Start with a thought. Share it when you&apos;re
          ready, or keep it forever private.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 w-auto"
          onClick={onStartDraft}
        >
          Start a Draft
        </Button>
      </div>
    </section>
  )
}

export default SharedJournalsEmpty
