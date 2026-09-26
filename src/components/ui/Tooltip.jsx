import { cloneElement, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFloatingPosition } from './floating'
import { Portal } from './Portal'
import { mergeRefs } from '@/lib/mergeRefs'

const OPEN_DELAY = 350

/**
 * Lightweight tooltip for supplementary labels. Opens on hover (with delay)
 * and on keyboard focus; the trigger is described by the tooltip for screen readers.
 */
export function Tooltip({ content, children, placement = 'top', disabled = false }) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef(0)
  const id = useId()
  const { refs, floatingStyles } = useFloatingPosition({ open, placement, gap: 6 })
  const childRef = children?.props?.ref
  // Stable merged ref — a new callback each render would re-register the reference endlessly.
  const triggerRef = useMemo(() => mergeRefs(refs.setReference, childRef), [refs.setReference, childRef])

  if (!content || disabled) return children

  const show = (delay) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    clearTimeout(timerRef.current)
    setOpen(false)
  }

  const trigger = cloneElement(children, {
    ref: triggerRef,
    'aria-describedby': open ? id : undefined,
    onPointerEnter: (event) => {
      children.props.onPointerEnter?.(event)
      if (event.pointerType === 'mouse') show(OPEN_DELAY)
    },
    onPointerLeave: (event) => {
      children.props.onPointerLeave?.(event)
      hide()
    },
    onFocus: (event) => {
      children.props.onFocus?.(event)
      if (event.target.matches?.(':focus-visible')) show(0)
    },
    onBlur: (event) => {
      children.props.onBlur?.(event)
      hide()
    },
    onPointerDown: (event) => {
      children.props.onPointerDown?.(event)
      hide()
    },
  })

  return (
    <>
      {trigger}
      <Portal>
        <AnimatePresence>
          {open && (
            <div ref={refs.setFloating} style={floatingStyles} className="z-[70] pointer-events-none">
              <motion.div
                id={id}
                role="tooltip"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="max-w-xs rounded-md bg-text px-2 py-1 text-xs font-medium text-bg shadow-md"
              >
                {content}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  )
}
