import { Fragment, createElement } from 'react'

/**
 * Safe V1 Markdown → React elements.
 * Supports headings, bold/italic/strike, lists, quotes, inline code.
 * Does not interpret HTML, scripts, or links as executable content.
 */
export function renderJournalMarkdown(source) {
  const text = String(source ?? '')

  if (!text.trim()) {
    return (
      <p className="text-sm text-muted italic">Nothing to preview yet.</p>
    )
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const Tag = `h${level}`
      blocks.push(
        createElement(
          Tag,
          {
            key: `h-${index}`,
            className:
              level === 1
                ? 'text-2xl font-bold tracking-tight text-ink'
                : level === 2
                  ? 'text-xl font-semibold tracking-tight text-ink'
                  : 'text-lg font-semibold text-ink',
          },
          renderInline(heading[2]),
        ),
      )
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push(
        <blockquote
          key={`q-${index}`}
          className="border-l-4 border-brand/40 pl-4 text-[15px] leading-7 italic text-slate-600 sm:text-base sm:leading-8"
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={quoteIndex} className={quoteIndex > 0 ? 'mt-1' : undefined}>
              {renderInline(quoteLine)}
            </p>
          ))}
        </blockquote>,
      )
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ''))
        index += 1
      }
      blocks.push(
        <ul
          key={`ul-${index}`}
          className="list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-ink sm:text-base sm:leading-8"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index += 1
      }
      blocks.push(
        <ol
          key={`ol-${index}`}
          className="list-decimal space-y-1.5 pl-5 text-[15px] leading-7 text-ink sm:text-base sm:leading-8"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraphLines = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*+]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }

    blocks.push(
      <p key={`p-${index}`} className="text-[15px] leading-7 text-ink sm:text-base sm:leading-8">
        {renderInline(paragraphLines.join('\n'))}
      </p>,
    )
  }

  return <div className="space-y-4">{blocks}</div>
}

function renderInline(text) {
  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|(?<!\*)\*[^*]+\*(?!\*))/g
  const nodes = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`t-${key}`}>
          {sanitizeText(text.slice(lastIndex, match.index))}
        </Fragment>,
      )
      key += 1
    }

    const token = match[0]

    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`c-${key}`}
          className="rounded bg-page px-1 py-0.5 font-mono text-[0.85em] text-ink"
        >
          {sanitizeText(token.slice(1, -1))}
        </code>,
      )
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`b-${key}`} className="font-semibold">
          {sanitizeText(token.slice(2, -2))}
        </strong>,
      )
    } else if (token.startsWith('~~')) {
      nodes.push(
        <del key={`s-${key}`} className="text-slate-500">
          {sanitizeText(token.slice(2, -2))}
        </del>,
      )
    } else if (token.startsWith('*')) {
      nodes.push(
        <em key={`i-${key}`} className="italic">
          {sanitizeText(token.slice(1, -1))}
        </em>,
      )
    }

    key += 1
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`t-${key}`}>{sanitizeText(text.slice(lastIndex))}</Fragment>,
    )
  }

  return nodes.length > 0 ? nodes : sanitizeText(text)
}

function sanitizeText(value) {
  // React text nodes escape HTML; also neutralize obvious tag-looking content.
  return String(value ?? '').replace(/[<>]/g, '')
}
