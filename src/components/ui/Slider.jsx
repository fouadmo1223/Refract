import { useId, useRef } from 'react'
import { cn } from '@/lib/cn'

function roundToStep(value, step, min) {
  const rounded = Math.round((value - min) / step) * step + min
  return Number(rounded.toFixed(4))
}

/**
 * Custom range slider (role="slider").
 * - Pointer dragging with capture, keyboard (arrows, PageUp/Down, Home/End).
 * - Direction-aware: in RTL the track fills from the right.
 * - `onValueCommit` fires on release — used for undo history.
 * - `origin` lets bipolar sliders (−100…100) fill from the centre.
 */
export function Slider({
  label,
  value,
  onChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  origin,
  disabled,
  formatValue = (v) => v,
  showValue = true,
  className,
  onDoubleClick,
  'aria-label': ariaLabel,
}) {
  const trackRef = useRef(null)
  const draggingRef = useRef(false)
  const labelId = useId()
  const percent = ((value - min) / (max - min)) * 100
  const originPercent = origin != null ? ((origin - min) / (max - min)) * 100 : 0
  const fillStart = Math.min(percent, originPercent)
  const fillWidth = Math.abs(percent - originPercent)

  const valueFromPointer = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect()
    const isRtl = getComputedStyle(trackRef.current).direction === 'rtl'
    let ratio = (clientX - rect.left) / rect.width
    if (isRtl) ratio = 1 - ratio
    ratio = Math.min(1, Math.max(0, ratio))
    return roundToStep(min + ratio * (max - min), step, min)
  }

  const handlePointerDown = (event) => {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    onChange(valueFromPointer(event.clientX))
  }
  const handlePointerMove = (event) => {
    if (!draggingRef.current) return
    const next = valueFromPointer(event.clientX)
    if (next !== value) onChange(next)
  }
  const handlePointerUp = (event) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    onValueCommit?.(valueFromPointer(event.clientX))
  }

  const handleKeyDown = (event) => {
    if (disabled) return
    const big = Math.max(step, (max - min) / 10)
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const keySteps = {
      ArrowRight: isRtl ? -step : step,
      ArrowLeft: isRtl ? step : -step,
      ArrowUp: step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
    }
    let next
    if (event.key in keySteps) next = value + keySteps[event.key]
    else if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    else return
    event.preventDefault()
    next = Math.min(max, Math.max(min, roundToStep(next, step, min)))
    onChange(next)
    onValueCommit?.(next)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <span id={labelId} className="text-[13px] font-medium text-text">
              {label}
            </span>
          )}
          {showValue && <span className="tabular text-xs font-medium text-text-2">{formatValue(value)}</span>}
        </div>
      )}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={String(formatValue(value))}
        aria-disabled={disabled || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onDoubleClick={onDoubleClick}
        className={cn(
          'group relative flex h-5 touch-none select-none items-center outline-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <div className="relative h-1 w-full rounded-full bg-surface-3">
          <div className="absolute inset-y-0 rounded-full bg-primary" style={{ insetInlineStart: `${fillStart}%`, width: `${fillWidth}%` }} />
          {origin != null && <div className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-border-strong" style={{ insetInlineStart: `${originPercent}%` }} />}
        </div>
        <div
          className={cn(
            'absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-primary bg-surface shadow-sm',
            'transition-[box-shadow,transform] duration-100 group-focus-visible:ring-4 group-focus-visible:ring-ring group-active:scale-110',
            'ltr:-translate-x-1/2 rtl:translate-x-1/2',
          )}
          style={{ insetInlineStart: `${percent}%` }}
        />
      </div>
    </div>
  )
}
