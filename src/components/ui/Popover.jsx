import { cloneElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/mergeRefs'
import { useFloatingPosition } from './floating'
import { Portal } from './Portal'

/**
 * Generic popover anchored to its trigger (the single child element).
 * `children` of the panel may be a render function receiving `{ close }`.
 */
export function Popover({ trigger, children, placement = 'bottom-start', className, open: controlledOpen, onOpenChange, label, maxHeight = 480 }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const panelId = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const { refs, floatingStyles } = useFloatingPosition({ open, placement, maxHeight })
  const setTriggerRef = useMemo(() => mergeRefs(triggerRef, refs.setReference), [refs.setReference])

  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, setOpen])

  const close = () => setOpen(false)

  return (
    <>
      {cloneElement(trigger, {
        ref: setTriggerRef,
        'aria-expanded': open,
        'aria-controls': open ? panelId : undefined,
        'aria-haspopup': 'dialog',
        onClick: (event) => {
          trigger.props.onClick?.(event)
          setOpen(!open)
        },
      })}
      <Portal>
        <AnimatePresence>
          {open && (
            <div ref={refs.setFloating} style={floatingStyles} className="z-[60] flex">
              <motion.div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label={label}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
                className={cn('scrollbar-thin overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-lg', className)}
              >
                {typeof children === 'function' ? children({ close }) : children}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  )
}
