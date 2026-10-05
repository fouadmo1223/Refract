import { useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Lightweight code editor: monospace textarea with line numbers, Tab
 * indentation and Ctrl/⌘+Enter to run. Good enough for snippets without
 * shipping a full editor bundle.
 */
export function CodeEditor({ value, onChange, onRun, label, className, minHeight = '18rem', readOnly = false }) {
  const textareaRef = useRef(null)
  const gutterRef = useRef(null)
  const lines = Math.max(1, value.split('\n').length)

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      onRun?.()
      return
    }
    if (event.key !== 'Tab' || readOnly) return
    event.preventDefault()
    const node = event.currentTarget
    const { selectionStart, selectionEnd } = node
    const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`
    onChange(next)
    requestAnimationFrame(() => node.setSelectionRange(selectionStart + 2, selectionStart + 2))
  }

  return (
    <div className={cn('flex overflow-hidden rounded-md border border-border bg-[#0d1117] focus-within:ring-2 focus-within:ring-ring', className)} dir="ltr" style={{ minHeight }}>
      <div ref={gutterRef} aria-hidden="true" className="select-none overflow-hidden border-e border-white/10 px-2 py-2.5 text-end font-mono text-xs leading-5 text-white/30">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        aria-label={label}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={(event) => {
          if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop
        }}
        className="min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 font-mono text-xs leading-5 text-[#e6edf3] outline-none placeholder:text-white/30"
        style={{ minHeight, tabSize: 2, whiteSpace: 'pre', overflowWrap: 'normal' }}
      />
    </div>
  )
}
