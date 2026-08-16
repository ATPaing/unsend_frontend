/**
 * Insert or wrap Markdown around the current textarea selection.
 * Returns the next value and selection range for undo-friendly controlled updates.
 */
export function applyMarkdownAction(value, selectionStart, selectionEnd, action) {
  const text = String(value ?? '')
  const start = Math.max(0, selectionStart ?? 0)
  const end = Math.max(start, selectionEnd ?? start)
  const selected = text.slice(start, end)
  const before = text.slice(0, start)
  const after = text.slice(end)

  switch (action) {
    case 'bold':
      return wrapInline(before, selected, after, '**', '**', 'bold text')
    case 'italic':
      return wrapInline(before, selected, after, '*', '*', 'italic text')
    case 'strike':
      return wrapInline(before, selected, after, '~~', '~~', 'strikethrough')
    case 'inlineCode':
      return wrapInline(before, selected, after, '`', '`', 'code')
    case 'h1':
      return applyLinePrefix(text, start, end, '# ')
    case 'h2':
      return applyLinePrefix(text, start, end, '## ')
    case 'h3':
      return applyLinePrefix(text, start, end, '### ')
    case 'bullet':
      return applyListPrefix(text, start, end, () => '- ')
    case 'numbered':
      return applyListPrefix(text, start, end, (index) => `${index + 1}. `)
    case 'quote':
      return applyListPrefix(text, start, end, () => '> ')
    default:
      return {
        value: text,
        selectionStart: start,
        selectionEnd: end,
      }
  }
}

function wrapInline(before, selected, after, left, right, placeholder) {
  const inner = selected || placeholder
  const next = `${before}${left}${inner}${right}${after}`
  const selectionStart = before.length + left.length
  const selectionEnd = selectionStart + inner.length

  return { value: next, selectionStart, selectionEnd }
}

function lineRangeForSelection(text, start, end) {
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  let lineEnd = text.indexOf('\n', end)
  if (lineEnd === -1) {
    lineEnd = text.length
  }

  return { lineStart, lineEnd }
}

function stripExistingBlockPrefix(line) {
  return line.replace(/^(#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+)/, '')
}

function applyLinePrefix(text, start, end, prefix) {
  const { lineStart, lineEnd } = lineRangeForSelection(text, start, end)
  const line = text.slice(lineStart, lineEnd)
  const content = stripExistingBlockPrefix(line) || 'Heading'
  const nextLine = `${prefix}${content}`
  const next = `${text.slice(0, lineStart)}${nextLine}${text.slice(lineEnd)}`
  const selectionStart = lineStart + prefix.length
  const selectionEnd = selectionStart + content.length

  return { value: next, selectionStart, selectionEnd }
}

function applyListPrefix(text, start, end, prefixForIndex) {
  const { lineStart, lineEnd } = lineRangeForSelection(text, start, end)
  const block = text.slice(lineStart, lineEnd)
  const lines = block.length > 0 ? block.split('\n') : ['']

  const nextLines = lines.map((line, index) => {
    const content = stripExistingBlockPrefix(line)
    const body = content || (lines.length === 1 ? 'List item' : '')
    return `${prefixForIndex(index)}${body}`
  })

  const nextBlock = nextLines.join('\n')
  const next = `${text.slice(0, lineStart)}${nextBlock}${text.slice(lineEnd)}`
  const firstPrefix = prefixForIndex(0)
  const firstBody = stripExistingBlockPrefix(lines[0] || '') || 'List item'
  const selectionStart = lineStart + firstPrefix.length
  const selectionEnd = selectionStart + firstBody.length

  return { value: next, selectionStart, selectionEnd }
}
