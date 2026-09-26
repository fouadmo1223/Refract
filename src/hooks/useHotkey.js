import { useEffect, useRef } from 'react'

/**
 * Global keyboard shortcut. `combo` like "mod+k", "mod+z", "mod+shift+z".
 * "mod" is ⌘ on macOS and Ctrl elsewhere.
 */
export function useHotkey(combo, handler, { enabled = true, allowInInputs = false } = {}) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return undefined
    const parts = combo.toLowerCase().split('+')
    const key = parts.pop()
    const needsMod = parts.includes('mod')
    const needsShift = parts.includes('shift')

    const handleKeyDown = (event) => {
      if (!event.key || event.key.toLowerCase() !== key) return
      const mod = event.metaKey || event.ctrlKey
      if (needsMod !== mod || needsShift !== event.shiftKey) return
      const target = event.target
      const isTyping = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))
      if (isTyping && !allowInInputs) return
      event.preventDefault()
      handlerRef.current(event)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [combo, enabled, allowInInputs])
}
