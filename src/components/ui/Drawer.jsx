import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useScrollLock } from './Modal'
import { Portal } from './Portal'

/**
 * Side panel or bottom sheet.
 * side: 'start' | 'end' (logical — flips in RTL) | 'bottom' (mobile sheet)
 */
export function Drawer({ open, onClose, title, children, footer, side = 'end', className }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleId = useId()
  useFocusTrap(panelRef, open)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const offscreen =
    side === 'bottom' ? { y: '100%' } : { x: (side === 'end') !== isRtl ? '100%' : '-100%' }

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              tabIndex={-1}
              initial={offscreen}
              animate={{ x: 0, y: 0 }}
              exit={offscreen}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                'absolute flex flex-col bg-surface shadow-lg outline-none',
                side === 'bottom'
                  ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl border-t border-border pb-[env(safe-area-inset-bottom)]'
                  : cn('inset-y-0 w-[min(88vw,360px)] border-border', side === 'end' ? 'end-0 border-s' : 'start-0 border-e'),
                className,
              )}
            >
              {side === 'bottom' && <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />}
              <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
                {title && (
                  <h2 id={titleId} className="text-[15px] font-semibold text-text">
                    {title}
                  </h2>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="-me-1.5 ms-auto flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
              {footer && <div className="shrink-0 border-t border-border px-4 py-3">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  )
}
