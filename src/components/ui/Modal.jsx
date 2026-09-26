import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { Portal } from './Portal'

function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined
    const { overflow, paddingInlineEnd } = document.body.style
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingInlineEnd = `${scrollbar}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingInlineEnd = paddingInlineEnd
    }
  }, [active])
}

/**
 * Accessible dialog: focus trap, Escape to close, scroll lock,
 * labelled by its title, focus restored on close.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', initialFocusRef, className, hideClose = false }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  useFocusTrap(panelRef, open, initialFocusRef)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh] sm:p-6 sm:pt-[12vh]">
            <motion.div
              className="fixed inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.98, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn('relative w-full rounded-xl border border-border bg-surface shadow-lg outline-none', widths[size], className)}
            >
              {(title || !hideClose) && (
                <div className="flex items-start justify-between gap-4 px-5 pt-5">
                  <div className="min-w-0">
                    {title && (
                      <h2 id={titleId} className="text-base font-semibold text-text">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id={descriptionId} className="mt-1 text-sm text-muted">
                        {description}
                      </p>
                    )}
                  </div>
                  {!hideClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={t('common.close')}
                      className="-me-1.5 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
              <div className="px-5 py-4">{children}</div>
              {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

export { useScrollLock }
