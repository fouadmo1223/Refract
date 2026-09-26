import { cloneElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { mergeRefs } from '@/lib/mergeRefs'
import { useFloatingPosition } from './floating'
import { Portal } from './Portal'

/**
 * Menu button (ARIA menu pattern). Focus moves into the menu; arrows cycle,
 * Home/End jump, Escape or Tab closes and restores focus.
 * items: [{ id, label, icon?, onSelect, checked?, danger?, disabled?, separatorBefore? }]
 */
export function Dropdown({ trigger, items, placement = 'bottom-end', label, className }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const triggerRef = useRef(null)
  const itemRefs = useRef([])
  const { refs, floatingStyles } = useFloatingPosition({ open, placement })
  const setTriggerRef = useMemo(() => mergeRefs(triggerRef, refs.setReference), [refs.setReference])
  const enabledIndexes = items.map((item, index) => (item.disabled ? null : index)).filter((index) => index != null)

  const close = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    const frame = requestAnimationFrame(() => {
      const checkedIndex = items.findIndex((item) => item.checked)
      itemRefs.current[checkedIndex >= 0 ? checkedIndex : enabledIndexes[0]]?.focus()
    })
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || refs.floating.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleMenuKeyDown = (event) => {
    const current = itemRefs.current.indexOf(document.activeElement)
    const position = enabledIndexes.indexOf(current)
    const focusAt = (enabledPosition) => itemRefs.current[enabledIndexes[(enabledPosition + enabledIndexes.length) % enabledIndexes.length]]?.focus()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(position + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(position - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(enabledIndexes.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close()
        break
      case 'Tab':
        close(false)
        break
      default:
    }
  }

  return (
    <>
      {cloneElement(trigger, {
        ref: setTriggerRef,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: () => setOpen((value) => !value),
        onKeyDown: (event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        },
      })}
      <Portal>
        <AnimatePresence>
          {open && (
            <div ref={refs.setFloating} style={floatingStyles} className="z-[60]">
              <motion.div
                id={menuId}
                role="menu"
                aria-label={label}
                onKeyDown={handleMenuKeyDown}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
                className={cn('min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg', className)}
              >
                {items.map((item, index) => {
                  const Icon = item.icon
                  const isCheckable = item.checked !== undefined
                  return (
                    <div key={item.id}>
                      {item.separatorBefore && <div className="my-1 h-px bg-border" role="separator" />}
                      <button
                        ref={(node) => (itemRefs.current[index] = node)}
                        type="button"
                        role={isCheckable ? 'menuitemradio' : 'menuitem'}
                        aria-checked={isCheckable ? item.checked : undefined}
                        disabled={item.disabled}
                        tabIndex={-1}
                        onClick={() => {
                          item.onSelect?.()
                          close()
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-start text-[13px] outline-none',
                          'hover:bg-surface-2 focus:bg-surface-2 disabled:opacity-40',
                          item.danger ? 'text-danger' : 'text-text',
                        )}
                      >
                        {Icon && <Icon size={15} className={cn('shrink-0', item.danger ? 'text-danger' : 'text-muted')} aria-hidden="true" />}
                        <span className="flex-1">{item.label}</span>
                        {item.checked && <Check size={15} className="text-primary" aria-hidden="true" />}
                      </button>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  )
}
