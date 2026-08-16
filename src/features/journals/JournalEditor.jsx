import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  ChevronDown,
  Heading,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react'
import { applyMarkdownAction } from '../../utils/markdown/insertMarkdown.js'
import { renderJournalMarkdown } from '../../utils/markdown/renderJournalMarkdown.jsx'
import { countWords } from '../../utils/journal/validation.js'

const HEADING_OPTIONS = [
  { action: 'h1', label: 'Heading 1' },
  { action: 'h2', label: 'Heading 2' },
  { action: 'h3', label: 'Heading 3' },
]

function ToolbarButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition hover:bg-page hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function JournalEditor({ value, onChange, disabled = false }) {
  const textareaRef = useRef(null)
  const headingMenuRef = useRef(null)
  const [mode, setMode] = useState('write')
  const [isHeadingOpen, setIsHeadingOpen] = useState(false)
  const [selection, setSelection] = useState({ start: 0, end: 0 })

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        headingMenuRef.current &&
        !headingMenuRef.current.contains(event.target)
      ) {
        setIsHeadingOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function rememberSelection() {
    const el = textareaRef.current
    if (!el) {
      return
    }

    setSelection({ start: el.selectionStart, end: el.selectionEnd })
  }

  function runAction(action) {
    const el = textareaRef.current
    const start = el ? el.selectionStart : selection.start
    const end = el ? el.selectionEnd : selection.end
    const next = applyMarkdownAction(value, start, end, action)

    onChange(next.value)
    setIsHeadingOpen(false)

    requestAnimationFrame(() => {
      const target = textareaRef.current
      if (!target) {
        return
      }

      target.focus()
      target.setSelectionRange(next.selectionStart, next.selectionEnd)
      setSelection({
        start: next.selectionStart,
        end: next.selectionEnd,
      })
    })
  }

  const wordCount = countWords(value)

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex flex-wrap items-center gap-0.5">
          <div ref={headingMenuRef} className="relative">
            <button
              type="button"
              disabled={disabled || mode !== 'write'}
              onClick={() => setIsHeadingOpen((open) => !open)}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-slate-600 transition hover:bg-page hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Heading"
              title="Heading"
            >
              <Heading size={16} strokeWidth={2} aria-hidden="true" />
              <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            {isHeadingOpen ? (
              <div className="absolute top-full left-0 z-20 mt-1 min-w-[140px] rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-card)]">
                {HEADING_OPTIONS.map((option) => (
                  <button
                    key={option.action}
                    type="button"
                    className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-ink transition hover:bg-brand-soft"
                    onClick={() => runAction(option.action)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <ToolbarButton
            label="Bold"
            disabled={disabled || mode !== 'write'}
            onClick={() => runAction('bold')}
          >
            <Bold size={16} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            disabled={disabled || mode !== 'write'}
            onClick={() => runAction('italic')}
          >
            <Italic size={16} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            disabled={disabled || mode !== 'write'}
            onClick={() => runAction('strike')}
          >
            <Strikethrough size={16} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            disabled={disabled || mode !== 'write'}
            onClick={() => runAction('bullet')}
          >
            <List size={16} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            disabled={disabled || mode !== 'write'}
            onClick={() => runAction('numbered')}
          >
            <ListOrdered size={16} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            disabled={disabled || mode !== 'write'}
            onClick={() => runAction('quote')}
          >
            <Quote size={16} strokeWidth={2} aria-hidden="true" />
          </ToolbarButton>
        </div>

        <div className="inline-flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('write')}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === 'write'
                ? 'bg-brand-soft text-brand'
                : 'text-muted hover:text-ink'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('preview')}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === 'preview'
                ? 'bg-brand-soft text-brand'
                : 'text-muted hover:text-ink'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          name="content"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={rememberSelection}
          onKeyUp={rememberSelection}
          onClick={rememberSelection}
          placeholder="Start writing…"
          disabled={disabled}
          rows={9}
          className="mt-3 min-h-[200px] w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-ink placeholder:text-slate-400 focus:outline-none"
        />
      ) : (
        <div className="mt-3 min-h-[200px] rounded-xl bg-page/60 px-4 py-3">
          {renderJournalMarkdown(value)}
        </div>
      )}

      <p className="mt-1 text-right text-[11px] text-muted">
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </p>
    </div>
  )
}

export default JournalEditor
