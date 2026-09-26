import { useRef, useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/**
 * Before/after comparison. Drag anywhere or use arrow keys on the handle.
 * "Before" sits on the reading-start side (left in LTR, right in RTL).
 */
export function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel, className, checkerboard = true }) {
  const { t } = useTranslation()
  const [position, setPosition] = useState(50)
  const containerRef = useRef(null)
  const draggingRef = useRef(false)

  const isRtl = () => containerRef.current && getComputedStyle(containerRef.current).direction === 'rtl'

  const updateFromPointer = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect()
    let ratio = ((clientX - rect.left) / rect.width) * 100
    if (isRtl()) ratio = 100 - ratio
    setPosition(Math.min(100, Math.max(0, ratio)))
  }

  const handleKeyDown = (event) => {
    const rtl = isRtl()
    const steps = { ArrowLeft: rtl ? 5 : -5, ArrowRight: rtl ? -5 : 5, Home: -100, End: 100 }
    if (!(event.key in steps)) return
    event.preventDefault()
    setPosition((value) => Math.min(100, Math.max(0, value + steps[event.key])))
  }

  // clip-path insets are physical; convert the logical position for RTL.
  const clipBefore = (rtl) => (rtl ? `inset(0 0 0 ${100 - position}%)` : `inset(0 ${100 - position}% 0 0)`)
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'

  return (
    <div
      ref={containerRef}
      className={cn('relative select-none overflow-hidden rounded-lg touch-none', checkerboard && 'checkerboard', className)}
      onPointerDown={(event) => {
        draggingRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        updateFromPointer(event.clientX)
      }}
      onPointerMove={(event) => draggingRef.current && updateFromPointer(event.clientX)}
      onPointerUp={() => (draggingRef.current = false)}
      onPointerCancel={() => (draggingRef.current = false)}
    >
      <img src={afterSrc} alt={afterLabel} className="block h-auto max-h-[62vh] w-full object-contain" draggable={false} />
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="absolute inset-0 size-full object-contain"
        style={{ clipPath: clipBefore(rtl) }}
        draggable={false}
      />
      <span className="pointer-events-none absolute start-3 top-3 rounded-sm bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white">{beforeLabel}</span>
      <span className="pointer-events-none absolute end-3 top-3 rounded-sm bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white">{afterLabel}</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ insetInlineStart: `calc(${position}% - 1px)` }}>
        <button
          type="button"
          role="slider"
          aria-label={t('result.compareSlider')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          onKeyDown={handleKeyDown}
          className="pointer-events-auto absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md outline-none ring-primary focus-visible:ring-3 ltr:-translate-x-[15px] rtl:translate-x-[15px]"
        >
          <ChevronsLeftRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
