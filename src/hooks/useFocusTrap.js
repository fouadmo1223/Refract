import { useEffect } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps Tab focus inside `containerRef` while `active`, focuses the first
 * focusable element (or `initialFocusRef`) and restores focus on close.
 */
export function useFocusTrap(containerRef, active, initialFocusRef) {
  useEffect(() => {
    if (!active) return undefined
    const container = containerRef.current
    if (!container) return undefined
    const previouslyFocused = document.activeElement

    const focusFirst = () => {
      const target = initialFocusRef?.current ?? container.querySelector(FOCUSABLE) ?? container
      target.focus({ preventScroll: true })
    }
    const frame = requestAnimationFrame(focusFirst)

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return
      const focusable = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      container.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [active, containerRef, initialFocusRef])
}
